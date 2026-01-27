import { useState } from "react";
import { Button, Badge, ConfirmDialog } from "@/components/ui";
import { CreateEditListModal, UploadPropertiesModal } from "@/components/admin";
import { formatPrice, formatDate } from "@/lib/utils";
import {
  useAdminLists,
  useCreateList,
  useUpdateList,
  useDeleteList,
  useUploadProperties,
  type UploadData,
} from "@/hooks/useAdminLists";
import type { AdminList, CreateListInput, UploadResult } from "@/types";

export function AdminListsPage() {
  // Data fetching
  const { data: lists, isLoading, error } = useAdminLists();

  // Mutations
  const createList = useCreateList();
  const updateList = useUpdateList();
  const deleteList = useDeleteList();
  const uploadProperties = useUploadProperties();

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<AdminList | null>(null);
  const [uploadingList, setUploadingList] = useState<AdminList | null>(null);
  const [deletingList, setDeletingList] = useState<AdminList | null>(null);

  // Handlers
  const handleCreateList = async (data: CreateListInput) => {
    await createList.mutateAsync(data);
    setIsCreateModalOpen(false);
  };

  const handleUpdateList = async (data: CreateListInput) => {
    if (!editingList) return;
    await updateList.mutateAsync({ listId: editingList.id, data });
    setEditingList(null);
  };

  const handleDeleteList = async () => {
    if (!deletingList) return;
    await deleteList.mutateAsync(deletingList.id);
    setDeletingList(null);
  };

  const handleUploadProperties = async (
    data: UploadData,
  ): Promise<UploadResult> => {
    if (!uploadingList) {
      throw new Error("No list selected");
    }
    const result = await uploadProperties.mutateAsync({
      listId: uploadingList.id,
      data,
    });
    return result.data;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="overflow-hidden rounded-lg border border-border-light bg-card-light dark:border-border-dark dark:bg-card-dark">
          <div className="p-8">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded bg-slate-100 dark:bg-slate-800"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">
          Error al cargar las listas: {error.message}
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Gestión de Listas
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Administra todas las listas de la plataforma
          </p>
        </div>
        <Button variant="accent" onClick={() => setIsCreateModalOpen(true)}>
          + Nueva Lista
        </Button>
      </div>

      {/* Empty state */}
      {lists && lists.length === 0 && (
        <div className="rounded-lg border border-border-light bg-card-light p-12 text-center dark:border-border-dark dark:bg-card-dark">
          <div className="text-4xl">📋</div>
          <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">
            No hay listas
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Crea tu primera lista para empezar
          </p>
          <Button
            variant="accent"
            className="mt-4"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Crear primera lista
          </Button>
        </div>
      )}

      {/* Lists Table */}
      {lists && lists.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border-light bg-card-light dark:border-border-dark dark:bg-card-dark">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-light bg-slate-50 dark:border-border-dark dark:bg-slate-900/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Lista
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Ubicación
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Precio
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Suscriptores
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Inmuebles
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Última actualización
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {lists.map((list) => (
                <tr
                  key={list.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-900/30"
                >
                  <td className="px-4 py-4 font-medium">{list.name}</td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                    {list.location}
                  </td>
                  <td className="px-4 py-4">
                    {formatPrice(list.priceCents, list.currency)}/mes
                  </td>
                  <td className="px-4 py-4">
                    <Badge>{list.subscriberCount}</Badge>
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                    {list.totalProperties}
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                    {formatDate(list.lastUpdatedAt)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingList(list)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => setUploadingList(list)}
                      >
                        Subir JSON
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeletingList(list)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <CreateEditListModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateList}
        isLoading={createList.isPending}
      />

      {/* Edit Modal */}
      <CreateEditListModal
        isOpen={!!editingList}
        onClose={() => setEditingList(null)}
        onSubmit={handleUpdateList}
        list={editingList}
        isLoading={updateList.isPending}
      />

      {/* Upload Modal */}
      <UploadPropertiesModal
        isOpen={!!uploadingList}
        onClose={() => setUploadingList(null)}
        onUpload={handleUploadProperties}
        list={uploadingList}
        isLoading={uploadProperties.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingList}
        onClose={() => setDeletingList(null)}
        onConfirm={handleDeleteList}
        title="Eliminar lista"
        message={`¿Estás seguro de que quieres eliminar la lista "${deletingList?.name}"? Esta acción eliminará también todas las propiedades y no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
        isLoading={deleteList.isPending}
      />
    </div>
  );
}
