import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Button, Input } from "@/components/ui";
import type { AdminList, CreateListInput } from "@/types";

const listFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(200),
  location: z.string().min(1, "La ubicación es obligatoria").max(500),
  priceCents: z.coerce.number().int().min(0, "El precio debe ser positivo"),
  currency: z.string().length(3).default("EUR"),
});

type ListFormData = z.infer<typeof listFormSchema>;

interface CreateEditListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateListInput) => Promise<void>;
  list?: AdminList | null; // If provided, we're editing
  isLoading?: boolean;
}

export function CreateEditListModal({
  isOpen,
  onClose,
  onSubmit,
  list,
  isLoading = false,
}: CreateEditListModalProps) {
  const isEditing = !!list;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ListFormData>({
    resolver: zodResolver(listFormSchema),
    defaultValues: {
      name: "",
      location: "",
      priceCents: 4900,
      currency: "EUR",
    },
  });

  // Watch price for live conversion
  const priceCents = useWatch({ control, name: "priceCents" });

  // Reset form when modal opens/closes or list changes
  useEffect(() => {
    if (isOpen && list) {
      reset({
        name: list.name,
        location: list.location,
        priceCents: list.priceCents,
        currency: list.currency,
      });
    } else if (isOpen && !list) {
      reset({
        name: "",
        location: "",
        priceCents: 4900,
        currency: "EUR",
      });
    }
  }, [isOpen, list, reset]);

  const handleFormSubmit = async (data: ListFormData) => {
    await onSubmit(data);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? "Editar Lista" : "Nueva Lista"}
      description={
        isEditing
          ? "Modifica los datos de la lista"
          : "Crea una nueva lista de propiedades de particulares"
      }
      size="md"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Nombre de la lista
          </label>
          <Input
            id="name"
            placeholder="Madrid Centro"
            {...register("name")}
            error={errors.name?.message}
          />
        </div>

        {/* Location */}
        <div>
          <label
            htmlFor="location"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Ubicación
          </label>
          <Input
            id="location"
            placeholder="Madrid, España"
            {...register("location")}
            error={errors.location?.message}
          />
        </div>

        {/* Price */}
        <div>
          <label
            htmlFor="priceCents"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Precio mensual (céntimos)
          </label>
          <div className="flex items-center gap-2">
            <Input
              id="priceCents"
              type="number"
              placeholder="4900"
              {...register("priceCents")}
              error={errors.priceCents?.message}
            />
            <span className="whitespace-nowrap text-sm text-slate-500">
              <span className="font-medium">
                €{((Number(priceCents) || 0) / 100).toFixed(2)}
              </span>
              /mes
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Introduce el precio en céntimos (ej: 4900 = €49.00)
          </p>
        </div>

        {/* Currency */}
        <div>
          <label
            htmlFor="currency"
            className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Moneda
          </label>
          <select
            id="currency"
            {...register("currency")}
            className="w-full rounded-lg border border-border-light bg-white px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-border-dark dark:bg-slate-900"
          >
            <option value="EUR">EUR - Euro</option>
            <option value="USD">USD - Dólar</option>
            <option value="GBP">GBP - Libra</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="accent" isLoading={isLoading}>
            {isEditing ? "Guardar cambios" : "Crear lista"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
