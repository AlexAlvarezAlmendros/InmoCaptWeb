import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Modal } from "@/components/ui/Modal";
import { Button, Input } from "@/components/ui";
import type { AdminList, CreateListInput } from "@/types";

const listFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(200),
  location: z.string().min(1, "La ubicación es obligatoria").max(500),
});

type ListFormData = z.infer<typeof listFormSchema>;

interface CreateEditListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateListInput) => Promise<void>;
  list?: AdminList | null;
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
    formState: { errors },
  } = useForm<ListFormData>({
    resolver: zodResolver(listFormSchema),
    defaultValues: {
      name: "",
      location: "",
    },
  });

  useEffect(() => {
    if (isOpen && list) {
      reset({
        name: list.name,
        location: list.location,
      });
    } else if (isOpen && !list) {
      reset({
        name: "",
        location: "",
      });
    }
  }, [isOpen, list, reset]);

  const handleFormSubmit = async (data: ListFormData) => {
    await onSubmit({
      name: data.name,
      location: data.location,
      priceCents: list?.priceCents ?? 0,
      currency: list?.currency ?? "EUR",
    });
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
