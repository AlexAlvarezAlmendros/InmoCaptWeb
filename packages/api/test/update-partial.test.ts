// /update is partial, and an owner who objects ("no_contactar") keeps no
// phone here: the scraper's vaciado {url, telefono: null, no_contactar: true}
// must be accepted and must only remove contact data.
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  UPLOADER,
  closeDb,
  createList,
  initDb,
  insertRaw,
  resetData,
  rows,
} from "./helpers.js";

const { uploadProperties, updateProperties, parseRawPatch, parseFotocasaUpload } =
  await import("../src/services/propertyService.js");
const { automationUpdateFotocasaSchema, automationUploadFotocasaSchema, zodValidate } =
  await import("../src/schemas/validation.js");
const { redactContactText } = await import("../src/services/contactPrivacy.js");

const URL_111 = "https://www.idealista.com/inmueble/111/";
const VACIADO = { url: URL_111, telefono: null, no_contactar: true };
let list: string;

before(initDb);
beforeEach(async () => {
  await resetData();
  list = await createList("Maresme");
});
after(closeDb);

function payload(row: { raw_payload: unknown }): Record<string, unknown> {
  return JSON.parse(String(row.raw_payload));
}

describe("validation", () => {
  test("/update accepts the scraper's vaciado; /upload still requires precio", () => {
    const body = { ubicacion: "Maresme", viviendas: [VACIADO] };
    const update = zodValidate(automationUpdateFotocasaSchema, body);
    assert.equal(update.success, true);
    assert.equal(zodValidate(automationUploadFotocasaSchema, body).success, false);
    assert.equal(
      zodValidate(automationUpdateFotocasaSchema, {
        ubicacion: "Maresme",
        viviendas: [{ telefono: null }],
      }).success,
      false,
    );
  });
});

describe("redactContactText", () => {
  test("hides phones and emails, not prices or longer numbers", () => {
    assert.equal(
      redactContactText("Llamar al 612 34 56 78, +34 93.123.45.67 o juan.p@correo.es"),
      "Llamar al [teléfono oculto], [teléfono oculto] o [email oculto]",
    );
    assert.equal(redactContactText("Precio 695.000 €, ref 5612345678"), "Precio 695.000 €, ref 5612345678");
  });
});

describe("updateProperties with partial patches", () => {
  test("a vaciado only clears the phone and redacts the stored text", async () => {
    await insertRaw(list, URL_111, "+34612345678", "2026-09-01T00:00:00Z", 0, {
      titulo: "Piso luminoso",
      descripcion: "Abstenerse agencias. Tel 612 34 56 78 o ana@correo.es",
      precio_original: "100.000 €",
    });
    const r = await updateProperties(list, [parseRawPatch(VACIADO)]);
    assert.equal(r.stats.updated, 1);
    const [row] = await rows(list);
    assert.equal(row.phone, null);
    assert.equal(row.price, 100000);
    assert.equal(row.m2, 80);
    assert.equal(row.bedrooms, 3);
    const p = payload(row);
    assert.equal(p.no_contactar, true);
    assert.equal(p.titulo, "Piso luminoso");
    assert.equal(p.precio_original, "100.000 €");
    assert.equal(p.descripcion, "Abstenerse agencias. Tel [teléfono oculto] o [email oculto]");
  });

  test("a phone-only update keeps the other fields", async () => {
    await insertRaw(list, URL_111, null, "2026-09-01T00:00:00Z");
    const r = await updateProperties(list, [parseRawPatch({ url: URL_111, telefono: "612 34 56 78" })]);
    assert.equal(r.stats.updated, 1);
    const [row] = await rows(list);
    assert.equal(row.phone, "612345678");
    assert.equal(row.price, 100000);
    assert.equal(row.raw_payload, null);
  });

  test("a full record still updates every field it carries", async () => {
    await insertRaw(list, URL_111, null, "2026-09-01T00:00:00Z");
    await updateProperties(list, [
      parseRawPatch({ url: URL_111, precio: "95.000 €", metros: null, habitaciones: "2 hab.", titulo: "Nuevo" }),
    ]);
    const [row] = await rows(list);
    assert.equal(row.price, 95000);
    assert.equal(row.m2, null);
    assert.equal(row.bedrooms, 2);
    assert.equal(payload(row).titulo, "Nuevo");
  });

  test("once objected, a later update or upload never brings the phone back", async () => {
    await insertRaw(list, URL_111, "+34612345678", "2026-09-01T00:00:00Z", 0, {
      descripcion: "Tel 612345678",
    });
    await updateProperties(list, [parseRawPatch(VACIADO)]);

    await updateProperties(list, [parseRawPatch({ url: URL_111, telefono: "612345678" })]);
    assert.equal((await rows(list))[0].phone, null);

    const up = await uploadProperties(
      list,
      parseFotocasaUpload({
        ubicacion: "Maresme",
        viviendas: [{ url: URL_111, precio: "100.000 €", telefono: "612345678", descripcion: "Tel 612345678" }],
      }),
      UPLOADER,
    );
    assert.equal(up.stats.updated, 1);
    const [row] = await rows(list);
    assert.equal(row.phone, null);
    assert.equal(payload(row).no_contactar, true);
    assert.equal(payload(row).descripcion, "Tel [teléfono oculto]");
  });
});

describe("uploadProperties with no_contactar", () => {
  test("a new objected listing is stored without phone and redacted", async () => {
    const r = await uploadProperties(
      list,
      parseFotocasaUpload({
        ubicacion: "Maresme",
        viviendas: [{
          url: URL_111,
          precio: "100.000 €",
          telefono: "612345678",
          descripcion: "No agencias. 612 345 678",
          no_contactar: true,
        }],
      }),
      UPLOADER,
    );
    assert.equal(r.stats.new, 1);
    const [row] = await rows(list);
    assert.equal(row.phone, null);
    assert.equal(payload(row).descripcion, "No agencias. [teléfono oculto]");
  });
});
