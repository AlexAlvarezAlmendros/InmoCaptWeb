import { useState, useCallback, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui";
import type { BulkDiscontinueResult } from "@/types";

interface UploadDiscontinuedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (urls: string[]) => Promise<BulkDiscontinueResult>;
  isLoading?: boolean;
}

export function UploadDiscontinuedModal({
  isOpen,
  onClose,
  onUpload,
  isLoading = false,
}: UploadDiscontinuedModalProps) {
  const [urls, setUrls] = useState<string[]>([]);
  const [result, setResult] = useState<BulkDiscontinueResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setUrls([]);
    setResult(null);
    setParseError(null);
    setUploadError(null);
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

  const parseFile = useCallback((content: string) => {
    setParseError(null);
    setUploadError(null);
    setResult(null);

    try {
      const data = JSON.parse(content);

      if (!data.urls || !Array.isArray(data.urls)) {
        setParseError(
          'El JSON debe contener un campo "urls" con un array de URLs.',
        );
        return;
      }

      const validUrls = data.urls.filter(
        (u: unknown) => typeof u === "string" && u.trim().length > 0,
      );

      if (validUrls.length === 0) {
        setParseError("No se encontraron URLs válidas en el JSON.");
        return;
      }

      setUrls(validUrls);
    } catch {
      setParseError(
        "El archivo no es un JSON válido. Verifica el formato e intenta de nuevo.",
      );
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseFile(content);
    };
    reader.readAsText(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer?.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        parseFile(content);
      };
      reader.readAsText(file);
    },
    [parseFile],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleUpload = async () => {
    if (urls.length === 0) return;
    setUploadError(null);
    try {
      const res = await onUpload(urls);
      setResult(res);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Error al procesar descatalogados",
      );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Marcar descatalogados">
      <div className="space-y-4">
        {/* Description */}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sube un JSON con el campo{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">
            "urls"
          </code>{" "}
          para marcar inmuebles como descatalogados. Los inmuebles
          descatalogados no computan en el precio de la lista.
        </p>

        {/* Result view */}
        {result ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <h4 className="font-medium text-green-800 dark:text-green-300">
                Proceso completado
              </h4>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-500">URLs procesadas:</span>{" "}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {result.total}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Encontradas:</span>{" "}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {result.matched}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Actualizadas:</span>{" "}
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {result.updated}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Ya descatalogadas:</span>{" "}
                  <span className="font-semibold text-slate-500">
                    {result.alreadyDiscontinued}
                  </span>
                </div>
              </div>
              {result.affectedListIds.length > 0 && (
                <p className="mt-2 text-xs text-green-700 dark:text-green-400">
                  Precios recalculados en {result.affectedListIds.length}{" "}
                  {result.affectedListIds.length === 1 ? "lista" : "listas"}
                </p>
              )}
            </div>

            {result.notFound.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  {result.notFound.length} URLs no encontradas
                </h4>
                <div className="mt-2 max-h-32 overflow-y-auto">
                  {result.notFound.map((url, i) => (
                    <p
                      key={i}
                      className="truncate text-xs text-amber-700 dark:text-amber-400"
                    >
                      {url}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleClose}>Cerrar</Button>
            </div>
          </div>
        ) : (
          <>
            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : parseError
                    ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/10"
                    : "border-border-light hover:border-primary/50 dark:border-border-dark"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <svg
                  className="h-6 w-6 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Arrastra el JSON de descatalogados aquí
              </p>
              <p className="mt-1 text-xs text-slate-500">
                o haz click para seleccionar archivo
              </p>
            </div>

            {/* Parse error */}
            {parseError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {parseError}
              </div>
            )}

            {/* Upload error */}
            {uploadError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {uploadError}
              </div>
            )}

            {/* Preview */}
            {urls.length > 0 && (
              <div className="space-y-3">
                <div className="rounded-lg border border-border-light bg-slate-50 p-4 dark:border-border-dark dark:bg-slate-800/50">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                      URLs a descatalogar
                    </h4>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                      {urls.length}
                    </span>
                  </div>
                  <div className="mt-2 max-h-40 overflow-y-auto">
                    {urls.slice(0, 20).map((url, i) => (
                      <p
                        key={i}
                        className="truncate text-xs text-slate-500 dark:text-slate-400"
                      >
                        {url}
                      </p>
                    ))}
                    {urls.length > 20 && (
                      <p className="mt-1 text-xs font-medium text-slate-400">
                        ... y {urls.length - 20} más
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={resetState}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleUpload}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Procesando...
                      </>
                    ) : (
                      `Descatalogar ${urls.length} inmuebles`
                    )}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
