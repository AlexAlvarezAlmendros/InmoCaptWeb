// Dedupe within a list: never the same property twice in one list, but the
// same property may be in several lists. Runs the real services against a
// throwaway SQLite file built from src/db/schema.sql.
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const dir = mkdtempSync(join(tmpdir(), "inmocapt-dedupe-"));
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = `file:${join(dir, "test.db")}`;
process.env.AUTH0_DOMAIN ??= "test.local";
process.env.AUTH0_AUDIENCE ??= "test";
process.env.STRIPE_SECRET_KEY ??= "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET ??= "whsec_dummy";

const { db, runMigrations } = await import("../src/config/database.js");
const {
  uploadProperties,
  updateProperties,
  bulkDiscontinueByUrls,
  dedupeLists,
} = await import("../src/services/propertyService.js");
const { listingKey, phoneKey } = await import("../src/services/dedupe.js");

const UPLOADER = "system:automation";
const AGENT = "auth0|agent";
let listA: string;
let listB: string;

async function createList(name: string): Promise<string> {
  const id = randomUUID();
  await db.execute({
    sql: "INSERT INTO lists (id, name, location, price_cents) VALUES (?, ?, ?, 0)",
    args: [id, name, name],
  });
  return id;
}

async function rows(listId: string) {
  const result = await db.execute({
    sql: "SELECT id, source_url, phone, discontinued FROM properties WHERE list_id = ? ORDER BY created_at, id",
    args: [listId],
  });
  return result.rows;
}

async function insertRaw(
  listId: string,
  url: string,
  phone: string | null,
  createdAt: string,
  discontinued = 0,
): Promise<string> {
  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO properties (id, list_id, price, phone, source_url, discontinued, created_at)
          VALUES (?, ?, 100000, ?, ?, ?, ?)`,
    args: [id, listId, phone, url, discontinued, createdAt],
  });
  return id;
}

async function reveal(propertyId: string): Promise<void> {
  await db.execute({
    sql: "INSERT INTO user_property_reveals (user_id, property_id) VALUES (?, ?)",
    args: [AGENT, propertyId],
  });
}

const prop = (sourceUrl: string, phone?: string) => ({ price: 150000, sourceUrl, phone });

before(async () => {
  await db.executeMultiple(
    readFileSync(new URL("../src/db/schema.sql", import.meta.url), "utf-8"),
  );
  await runMigrations();
  await db.execute({
    sql: "INSERT INTO users (id, email) VALUES (?, ?), (?, ?)",
    args: [UPLOADER, "automation@system.local", AGENT, "agent@example.com"],
  });
});

beforeEach(async () => {
  await db.execute("DELETE FROM user_property_reveals");
  await db.execute("DELETE FROM properties");
  await db.execute("DELETE FROM list_updates");
  await db.execute("DELETE FROM lists");
  listA = await createList("Maresme");
  listB = await createList("Barcelona - Eixample");
});

after(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("listingKey / phoneKey", () => {
  test("URL variants of one listing share the key", () => {
    const k = listingKey("https://www.idealista.com/inmueble/112665364/");
    assert.equal(k, "idealista:112665364");
    assert.equal(listingKey("https://WWW.idealista.com/inmueble/112665364?xtor=abc#fotos"), k);
    assert.equal(
      listingKey("https://www.habitaclia.com/comprar-piso-luminoso-mataro-i500006047900.htm"),
      listingKey("https://www.habitaclia.com/i500006047900.htm"),
    );
    assert.equal(
      listingKey("https://www.pisos.com/comprar/casa-cabra_del_camp-60011332760_109800/"),
      listingKey("https://www.pisos.com/comprar/piso-otro_titulo-60011332760_109800"),
    );
    assert.equal(
      listingKey("https://www.milanuncios.com/anuncios/r524305339.htm"),
      "milanuncios:524305339",
    );
    assert.notEqual(
      listingKey("https://www.idealista.com/inmueble/1/"),
      listingKey("https://www.habitaclia.com/i1000001.htm"),
    );
    assert.equal(listingKey("https://example.com/Foo/?a=1"), "example.com/Foo");
    assert.equal(listingKey("  "), null);
  });

  test("phone formats compare equal", () => {
    const k = phoneKey("685 12 34 56");
    assert.equal(k, "685123456");
    assert.equal(phoneKey("+34685123456"), k);
    assert.equal(phoneKey("0034 685 123 456"), k);
    assert.equal(phoneKey("+33612345678"), "33612345678");
    assert.equal(phoneKey("12345"), null);
    assert.equal(phoneKey(null), null);
  });
});

describe("uploadProperties", () => {
  test("the same listing is updated, never inserted twice", async () => {
    await uploadProperties(listA, [prop("https://www.idealista.com/inmueble/111/")], UPLOADER);
    const r = await uploadProperties(
      listA,
      [
        prop("https://www.idealista.com/inmueble/111?utm=x", "685123456"),
        prop("https://www.idealista.com/inmueble/111/"),
      ],
      UPLOADER,
    );
    assert.equal(r.stats.new, 0);
    assert.equal(r.stats.updated, 1);
    assert.equal(r.stats.duplicates, 1);
    assert.equal(r.duplicates[0].reason, "batch");
    assert.equal((await rows(listA)).length, 1);
  });

  test("the same phone on another portal is skipped in the same list, allowed in another", async () => {
    await uploadProperties(listA, [prop("https://www.idealista.com/inmueble/111/", "685 12 34 56")], UPLOADER);
    const dup = await uploadProperties(listA, [prop("https://www.habitaclia.com/i500000000001.htm", "+34685123456")], UPLOADER);
    assert.equal(dup.stats.new, 0);
    assert.equal(dup.stats.duplicates, 1);
    assert.equal(dup.duplicates[0].reason, "phone");
    assert.equal(dup.duplicates[0].duplicateOf, (await rows(listA))[0].id);

    const other = await uploadProperties(listB, [prop("https://www.habitaclia.com/i500000000001.htm", "+34685123456")], UPLOADER);
    assert.equal(other.stats.new, 1);
    assert.equal((await rows(listA)).length, 1);
    assert.equal((await rows(listB)).length, 1);
  });

  test("a discontinued property does not block the same phone", async () => {
    await insertRaw(listA, "https://www.idealista.com/inmueble/111/", "685123456", "2026-09-01T00:00:00Z", 1);
    const r = await uploadProperties(listA, [prop("https://www.habitaclia.com/i500000000001.htm", "685123456")], UPLOADER);
    assert.equal(r.stats.new, 1);
  });

  test("properties without phone are only deduplicated by listing", async () => {
    const r = await uploadProperties(
      listA,
      [prop("https://www.idealista.com/inmueble/111/"), prop("https://www.idealista.com/inmueble/222/")],
      UPLOADER,
    );
    assert.equal(r.stats.new, 2);
  });

  test("concurrent uploads of the same URL insert it once", async () => {
    const url = "https://www.idealista.com/inmueble/111/";
    const results = await Promise.all([
      uploadProperties(listA, [prop(url)], UPLOADER),
      uploadProperties(listA, [prop(url)], UPLOADER),
    ]);
    assert.equal(results.reduce((n, r) => n + r.stats.new, 0), 1);
    assert.equal((await rows(listA)).length, 1);
  });

  test("an existing listing that gets a known phone: the newer duplicate is removed", async () => {
    const older = await insertRaw(listA, "https://www.habitaclia.com/i500000000001.htm", "+34685123456", "2026-09-01T00:00:00Z");
    const newer = await insertRaw(listA, "https://www.idealista.com/inmueble/111/", null, "2026-09-02T00:00:00Z");
    const r = await uploadProperties(listA, [prop("https://www.idealista.com/inmueble/111/", "685123456")], UPLOADER);
    assert.equal(r.stats.updated, 0);
    assert.equal(r.stats.duplicatesRemoved, 1);
    assert.deepEqual(r.removedDuplicateIds, [newer]);
    assert.deepEqual((await rows(listA)).map((x) => x.id), [older]);
  });
});

describe("updateProperties (/update)", () => {
  test("a late phone that duplicates another active property removes the duplicate", async () => {
    const older = await insertRaw(listA, "https://www.idealista.com/inmueble/111/", null, "2026-09-01T00:00:00Z");
    const newer = await insertRaw(listA, "https://www.habitaclia.com/i500000000001.htm", "685123456", "2026-09-02T00:00:00Z");
    const r = await updateProperties(listA, [prop("https://www.idealista.com/inmueble/111/", "+34 685 12 34 56")]);
    assert.equal(r.stats.updated, 1);
    assert.equal(r.stats.duplicatesRemoved, 1);
    assert.deepEqual(r.removedDuplicateIds, [newer]);
    const left = await rows(listA);
    assert.deepEqual(left.map((x) => x.id), [older]);
    assert.equal(left[0].phone, "+34685123456");
  });

  test("a property someone revealed always survives", async () => {
    const older = await insertRaw(listA, "https://www.idealista.com/inmueble/111/", null, "2026-09-01T00:00:00Z");
    const revealed = await insertRaw(listA, "https://www.habitaclia.com/i500000000001.htm", "685123456", "2026-09-02T00:00:00Z");
    await reveal(revealed);
    const r = await updateProperties(listA, [prop("https://www.idealista.com/inmueble/111/", "685123456")]);
    assert.equal(r.stats.updated, 0);
    assert.deepEqual(r.removedDuplicateIds, [older]);
    assert.deepEqual((await rows(listA)).map((x) => x.id), [revealed]);
  });

  test("two properties with interactions are both kept", async () => {
    const a = await insertRaw(listA, "https://www.idealista.com/inmueble/111/", null, "2026-09-01T00:00:00Z");
    const b = await insertRaw(listA, "https://www.habitaclia.com/i500000000001.htm", "685123456", "2026-09-02T00:00:00Z");
    await reveal(a);
    await reveal(b);
    const r = await updateProperties(listA, [prop("https://www.idealista.com/inmueble/111/", "685123456")]);
    assert.equal(r.stats.updated, 1);
    assert.equal(r.stats.duplicatesRemoved, 0);
    assert.equal((await rows(listA)).length, 2);
  });

  test("the same phone in another list is not a duplicate", async () => {
    await insertRaw(listB, "https://www.habitaclia.com/i500000000001.htm", "685123456", "2026-09-01T00:00:00Z");
    await insertRaw(listA, "https://www.idealista.com/inmueble/111/", null, "2026-09-02T00:00:00Z");
    const r = await updateProperties(listA, [prop("https://www.idealista.com/inmueble/111/", "685123456")]);
    assert.equal(r.stats.updated, 1);
    assert.equal(r.stats.duplicatesRemoved, 0);
    assert.equal((await rows(listB)).length, 1);
  });
});

describe("bulkDiscontinueByUrls", () => {
  test("marks the listing in every list that has it", async () => {
    const url = "https://www.idealista.com/inmueble/111/";
    await insertRaw(listA, url, "685123456", "2026-09-01T00:00:00Z");
    await insertRaw(listB, url, "685123456", "2026-09-01T00:00:00Z");
    const r = await bulkDiscontinueByUrls([url]);
    assert.equal(r.matched, 1);
    assert.equal(r.updated, 2);
    assert.deepEqual(new Set(r.affectedListIds), new Set([listA, listB]));
    assert.equal((await rows(listA))[0].discontinued, 1);
    assert.equal((await rows(listB))[0].discontinued, 1);
  });
});

describe("dedupeLists (/automation/dedupe)", () => {
  test("dry run reports, real run deletes only inside each list", async () => {
    const keep = await insertRaw(listA, "https://www.idealista.com/inmueble/111/", "685123456", "2026-09-01T00:00:00Z");
    const relist = await insertRaw(listA, "https://www.idealista.com/inmueble/222/", "+34685123456", "2026-09-05T00:00:00Z");
    const revealed = await insertRaw(listA, "https://www.habitaclia.com/i500000000001.htm", "685 123 456", "2026-09-06T00:00:00Z");
    await reveal(revealed);
    const other = await insertRaw(listB, "https://www.idealista.com/inmueble/111/", "685123456", "2026-09-01T00:00:00Z");
    await insertRaw(listA, "https://www.idealista.com/inmueble/333/", "699001122", "2026-09-01T00:00:00Z");

    const dry = await dedupeLists();
    assert.equal(dry.dryRun, true);
    assert.equal(dry.lists.length, 1);
    assert.equal(dry.lists[0].listId, listA);
    assert.equal(dry.lists[0].groups, 1);
    assert.equal(dry.lists[0].duplicateRows, 2);
    assert.equal(dry.lists[0].removed, 2);
    assert.equal((await rows(listA)).length, 4);

    const real = await dedupeLists({ dryRun: false });
    assert.equal(real.totals.removed, 2);
    const left = (await rows(listA)).map((x) => x.id);
    assert.ok(left.includes(revealed));
    assert.ok(!left.includes(keep) && !left.includes(relist));
    assert.equal(left.length, 2);
    assert.deepEqual((await rows(listB)).map((x) => x.id), [other]);
  });
});
