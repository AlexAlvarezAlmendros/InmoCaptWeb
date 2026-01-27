import { useState, useCallback, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui";
import type {
  AdminList,
  PropertyInput,
  UploadResult,
  IdealistaUpload,
  IdealistaRawProperty,
} from "@/types";

interface UploadPropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (
    data: IdealistaUpload | { properties: PropertyInput[] },
  ) => Promise<UploadResult>;
  list: AdminList | null;
  isLoading?: boolean;
}

interface ParsedData {
  properties: PropertyInput[];
  rawData: IdealistaUpload | { properties: PropertyInput[] };
  format: "idealista" | "simple";
  errors: string[];
}

export function UploadPropertiesModal({
  isOpen,
  onClose,
  onUpload,
  list,
  isLoading = false,
}: UploadPropertiesModalProps) {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setParsedData(null);
    setUploadResult(null);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleClose = () => {
    if (!isLoading) {
      resetState();
      onClose();
    }
  };

  // ============================================
  // Idealista format parsing helpers
  // ============================================

  const parseIdealistaPrice = (priceStr: string): number => {
    const cleaned = priceStr
      .replace(/[€$\s]/g, "")
      .replace(/\./g, "")
      .replace(/,/g, "");
    const price = parseInt(cleaned, 10);
    return isNaN(price) ? 0 : price;
  };

  const parseIdealistaM2 = (metrosStr?: string | null): number | undefined => {
    if (!metrosStr) return undefined;
    const match = metrosStr.match(/(\d+(?:[.,]\d+)?)/);
    if (!match) return undefined;
    const m2 = parseInt(match[1].replace(",", "."), 10);
    return isNaN(m2) ? undefined : m2;
  };

  const parseIdealistaBedrooms = (
    habStr?: string | null,
  ): number | undefined => {
    if (!habStr) return undefined;
    const match = habStr.match(/(\d+)/);
    if (!match) return undefined;
    const bedrooms = parseInt(match[1], 10);
    return isNaN(bedrooms) ? undefined : bedrooms;
  };

  const parseIdealistaProperty = (
    raw: IdealistaRawProperty,
  ): PropertyInput => ({
    price: parseIdealistaPrice(raw.precio),
    m2: parseIdealistaM2(raw.metros),
    bedrooms: parseIdealistaBedrooms(raw.habitaciones),
    sourceUrl: raw.url,
    ownerName: raw.anunciante,
    rawPayload: {
      titulo: raw.titulo,
      ubicacion: raw.ubicacion,
      descripcion: raw.descripcion,
      fecha_scraping: raw.fecha_scraping,
      precio_original: raw.precio,
      habitaciones_original: raw.habitaciones,
      metros_original: raw.metros,
    },
  });

  const isIdealistaFormat = (data: unknown): data is IdealistaUpload => {
    if (typeof data !== "object" || data === null) return false;
    const obj = data as Record<string, unknown>;
    return (
      typeof obj.viviendas === "object" &&
      obj.viviendas !== null &&
      Array.isArray((obj.viviendas as Record<string, unknown>).todas)
    );
  };

  // ============================================
  // Simple format validation
  // ============================================

  const validateProperty = (
    prop: unknown,
    index: number,
  ): { property: PropertyInput | null; error: string | null } => {
    if (typeof prop !== "object" || prop === null) {
      return {
        property: null,
        error: `Propiedad ${index + 1}: debe ser un objeto`,
      };
    }

    const p = prop as Record<string, unknown>;

    // Required: price
    if (typeof p.price !== "number" || p.price < 0) {
      return {
        property: null,
        error: `Propiedad ${index + 1}: 'price' debe ser un número positivo`,
      };
    }

    return {
      property: {
        price: p.price,
        m2: typeof p.m2 === "number" ? p.m2 : undefined,
        bedrooms: typeof p.bedrooms === "number" ? p.bedrooms : undefined,
        phone: typeof p.phone === "string" ? p.phone : undefined,
        ownerName: typeof p.ownerName === "string" ? p.ownerName : undefined,
        sourceUrl: typeof p.sourceUrl === "string" ? p.sourceUrl : undefined,
        rawPayload:
          typeof p.rawPayload === "object" && p.rawPayload !== null
            ? (p.rawPayload as Record<string, unknown>)
            : undefined,
      },
      error: null,
    };
  };

  const parseFile = useCallback((file: File) => {
    setParseError(null);
    setParsedData(null);
    setUploadResult(null);

    if (!file.name.endsWith(".json")) {
      setParseError("El archivo debe ser un JSON");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const json = JSON.parse(content);

        // Detect format: Idealista vs Simple
        if (isIdealistaFormat(json)) {
          // Idealista format
          const rawProperties = json.viviendas.todas;

          if (rawProperties.length === 0) {
            setParseError("El archivo no contiene propiedades");
            return;
          }

          if (rawProperties.length > 1000) {
            setParseError("Máximo 1000 propiedades por upload");
            return;
          }

          // Parse and validate Idealista properties
          const properties: PropertyInput[] = [];
          const errors: string[] = [];

          for (let i = 0; i < rawProperties.length; i++) {
            const raw = rawProperties[i] as IdealistaRawProperty;

            // Validate required fields
            if (!raw.url) {
              errors.push(
                `Propiedad ${i + 1}: falta 'url' (requerido para deduplicación)`,
              );
              continue;
            }
            if (!raw.precio) {
              errors.push(`Propiedad ${i + 1}: falta 'precio'`);
              continue;
            }

            properties.push(parseIdealistaProperty(raw));
          }

          // Check for duplicate URLs in the batch
          const urlCounts = new Map<string, number>();
          properties.forEach((p) => {
            if (p.sourceUrl) {
              urlCounts.set(p.sourceUrl, (urlCounts.get(p.sourceUrl) || 0) + 1);
            }
          });

          const duplicateUrls = Array.from(urlCounts.entries())
            .filter(([, count]) => count > 1)
            .map(([url]) => url);

          if (duplicateUrls.length > 0) {
            errors.push(
              `${duplicateUrls.length} URLs duplicadas en el archivo (se procesarán solo una vez)`,
            );
          }

          setParsedData({
            properties,
            rawData: json,
            format: "idealista",
            errors,
          });
        } else {
          // Simple format: { properties: [...] } or direct array [...]
          let rawProperties: unknown[];
          if (Array.isArray(json)) {
            rawProperties = json;
          } else if (json.properties && Array.isArray(json.properties)) {
            rawProperties = json.properties;
          } else {
            setParseError(
              "Formato inválido. Se espera formato Idealista (con 'viviendas.todas') o formato simple (con 'properties')",
            );
            return;
          }

          if (rawProperties.length === 0) {
            setParseError("El archivo no contiene propiedades");
            return;
          }

          if (rawProperties.length > 1000) {
            setParseError("Máximo 1000 propiedades por upload");
            return;
          }

          // Validate each property
          const properties: PropertyInput[] = [];
          const errors: string[] = [];

          for (let i = 0; i < rawProperties.length; i++) {
            const { property, error } = validateProperty(rawProperties[i], i);
            if (error) {
              errors.push(error);
            }
            if (property) {
              properties.push(property);
            }
          }

          setParsedData({
            properties,
            rawData: { properties },
            format: "simple",
            errors,
          });
        }
      } catch {
        setParseError("Error al parsear el archivo JSON");
      }
    };

    reader.onerror = () => {
      setParseError("Error al leer el archivo");
    };

    reader.readAsText(file);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        parseFile(e.dataTransfer.files[0]);
      }
    },
    [parseFile],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        parseFile(e.target.files[0]);
      }
    },
    [parseFile],
  );

  const handleUpload = async () => {
    if (!parsedData || parsedData.properties.length === 0) return;

    try {
      // Send the raw data in its original format - backend will handle parsing
      const result = await onUpload(parsedData.rawData);
      setUploadResult(result);
    } catch (error) {
      setParseError(
        error instanceof Error ? error.message : "Error al subir propiedades",
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Subir propiedades a ${list?.name || "lista"}`}
      description="Sube un archivo JSON con las propiedades"
      size="lg"
    >
      {/* Upload result view */}
      {uploadResult && (
        <div className="space-y-4">
          <div
            className={`rounded-lg p-4 ${
              uploadResult.success
                ? "bg-green-50 dark:bg-green-900/20"
                : "bg-yellow-50 dark:bg-yellow-900/20"
            }`}
          >
            <h4
              className={`font-medium ${
                uploadResult.success
                  ? "text-green-800 dark:text-green-200"
                  : "text-yellow-800 dark:text-yellow-200"
              }`}
            >
              {uploadResult.success
                ? "✅ Upload completado"
                : "⚠️ Upload completado con errores"}
            </h4>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-600 dark:text-slate-400">
                  Total procesados:
                </span>{" "}
                <strong>{uploadResult.stats.total}</strong>
              </div>
              <div>
                <span className="text-green-600 dark:text-green-400">
                  Nuevos:
                </span>{" "}
                <strong>{uploadResult.stats.new}</strong>
              </div>
              <div>
                <span className="text-blue-600 dark:text-blue-400">
                  Actualizados:
                </span>{" "}
                <strong>{uploadResult.stats.updated}</strong>
              </div>
              <div>
                <span className="text-slate-500">Duplicados:</span>{" "}
                <strong>{uploadResult.stats.duplicates}</strong>
              </div>
              {uploadResult.stats.errors > 0 && (
                <div>
                  <span className="text-red-600 dark:text-red-400">
                    Errores:
                  </span>{" "}
                  <strong>{uploadResult.stats.errors}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="primary" onClick={handleClose}>
              Cerrar
            </Button>
          </div>
        </div>
      )}

      {/* Upload form view */}
      {!uploadResult && (
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border-light hover:border-primary dark:border-border-dark"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="text-4xl">📄</div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Arrastra un archivo JSON aquí o{" "}
              <span className="text-primary">haz clic para seleccionar</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Máximo 1000 propiedades por archivo
            </p>
          </div>

          {/* Parse error */}
          {parseError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {parseError}
            </div>
          )}

          {/* Preview */}
          {parsedData && (
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-900 dark:text-white">
                    Vista previa
                  </h4>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      parsedData.format === "idealista"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    Formato:{" "}
                    {parsedData.format === "idealista" ? "Idealista" : "Simple"}
                  </span>
                </div>
                <div className="mt-2 text-sm">
                  <p>
                    <span className="text-slate-600 dark:text-slate-400">
                      Propiedades válidas:
                    </span>{" "}
                    <strong className="text-green-600">
                      {parsedData.properties.length}
                    </strong>
                  </p>
                  <p>
                    <span className="text-slate-600 dark:text-slate-400">
                      Con URL (para deduplicación):
                    </span>{" "}
                    <strong className="text-blue-600">
                      {parsedData.properties.filter((p) => p.sourceUrl).length}
                    </strong>
                  </p>
                  {parsedData.errors.length > 0 && (
                    <p>
                      <span className="text-slate-600 dark:text-slate-400">
                        Advertencias:
                      </span>{" "}
                      <strong className="text-yellow-600">
                        {parsedData.errors.length}
                      </strong>
                    </p>
                  )}
                </div>

                {/* Show first 3 properties */}
                {parsedData.properties.length > 0 && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border-light dark:border-border-dark">
                          <th className="px-2 py-1 text-left">Precio</th>
                          <th className="px-2 py-1 text-left">M²</th>
                          <th className="px-2 py-1 text-left">Hab.</th>
                          <th className="px-2 py-1 text-left">Teléfono</th>
                          <th className="px-2 py-1 text-left">URL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.properties.slice(0, 3).map((prop, i) => (
                          <tr
                            key={i}
                            className="border-b border-border-light dark:border-border-dark"
                          >
                            <td className="px-2 py-1">
                              €{prop.price.toLocaleString()}
                            </td>
                            <td className="px-2 py-1">{prop.m2 || "-"}</td>
                            <td className="px-2 py-1">
                              {prop.bedrooms || "-"}
                            </td>
                            <td className="px-2 py-1">{prop.phone || "-"}</td>
                            <td className="max-w-[100px] truncate px-2 py-1">
                              {prop.sourceUrl || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedData.properties.length > 3 && (
                      <p className="mt-2 text-xs text-slate-500">
                        ... y {parsedData.properties.length - 3} más
                      </p>
                    )}
                  </div>
                )}

                {/* Validation errors */}
                {parsedData.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-yellow-600">
                      Advertencias:
                    </p>
                    <ul className="mt-1 max-h-20 overflow-y-auto text-xs text-yellow-600 dark:text-yellow-400">
                      {parsedData.errors.slice(0, 5).map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                      {parsedData.errors.length > 5 && (
                        <li>... y {parsedData.errors.length - 5} más</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              variant="accent"
              onClick={handleUpload}
              disabled={!parsedData || parsedData.properties.length === 0}
              isLoading={isLoading}
            >
              Subir {parsedData?.properties.length || 0} propiedades
            </Button>
          </div>

          {/* Format hint */}
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer hover:text-primary">
              Ver formato esperado (Idealista)
            </summary>
            <pre className="mt-2 overflow-x-auto rounded bg-slate-100 p-2 dark:bg-slate-900 text-[10px] leading-tight">
              {`{
  "timestamp": "2025-11-14T18:09:42.140496",
  "url": "https://www.idealista.com/areas/...",
  "total": 110,
  "particulares": 110,
  "inmobiliarias": 0,
  "viviendas": {
    "todas": [
      {
        "titulo": "Ático en venta en Calle...",
        "precio": "90.000€",
        "ubicacion": "Poble Nou, Manresa",
        "habitaciones": "3 hab.",
        "metros": "70 m²",
        "url": "https://www.idealista.com/inmueble/1603411/",
        "descripcion": "Descripción del inmueble...",
        "anunciante": "Particular",
        "fecha_scraping": "2025-11-14T16:29:32.742107"
      }
    ]
  }
}`}
            </pre>
            <p className="mt-2 text-slate-400">
              <strong>Importante:</strong> La URL de cada propiedad se usa para
              detectar duplicados. Si una propiedad ya existe con la misma URL,
              se actualizará en lugar de crear una nueva.
            </p>
          </details>
        </div>
      )}
    </Modal>
  );
}
