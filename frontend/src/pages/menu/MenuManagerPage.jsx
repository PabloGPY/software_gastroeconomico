import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCategories, createItem, updateItem, deleteItem, toggleAvailability } from "../../api/menu";
import AppLayout from "../../components/layout/AppLayout";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, X, Eye, EyeOff } from "lucide-react";

function ItemForm({ item, categories, onSave, onCancel }) {
  const [form, setForm] = useState(item || { category_id: categories[0]?.id || "", name: "", description: "", price: "", cost: "", sort_order: 0 });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">{item ? "Editar" : "Nuevo"} item</h3>
          <button onClick={onCancel}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: parseInt(e.target.value) })}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
          <textarea placeholder="Descripción (opcional)" value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Precio de venta</label>
              <input type="number" step="0.01" placeholder="0.00" value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Costo (para rentabilidad)</label>
              <input type="number" step="0.01" placeholder="0.00" value={form.cost || ""}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Cancelar</button>
          <button onClick={() => onSave(form)}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MenuManagerPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: createItem,
    onSuccess: () => { qc.invalidateQueries(["categories"]); setShowForm(false); toast.success("Item creado"); },
    onError: (err) => toast.error(err.response?.data?.detail || "Error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateItem(id, data),
    onSuccess: () => { qc.invalidateQueries(["categories"]); setEditItem(null); toast.success("Item actualizado"); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteItem,
    onSuccess: () => { qc.invalidateQueries(["categories"]); toast.success("Item eliminado"); },
  });

  const availabilityMutation = useMutation({
    mutationFn: ({ id, available }) => toggleAvailability(id, available),
    onSuccess: () => qc.invalidateQueries(["categories"]),
  });

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Gestión del Menú</h2>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Nuevo item
          </button>
        </div>

        <div className="space-y-6">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b">
                <h3 className="font-semibold text-gray-800">{cat.name}</h3>
              </div>
              <div className="divide-y">
                {cat.items.filter((i) => i.is_active).map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${item.is_available ? "text-gray-900" : "text-gray-400"}`}>{item.name}</p>
                        {!item.is_available && (
                          <span className="text-xs bg-red-100 text-red-500 px-2 py-0.5 rounded-full">No disponible</span>
                        )}
                      </div>
                      {item.description && <p className="text-xs text-gray-400">{item.description}</p>}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-orange-500">${parseFloat(item.price).toFixed(2)}</p>
                        {item.cost && <p className="text-xs text-gray-400">Costo: ${parseFloat(item.cost).toFixed(2)}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => availabilityMutation.mutate({ id: item.id, available: !item.is_available })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50">
                          {item.is_available ? <Eye size={15} /> : <EyeOff size={15} />}
                        </button>
                        <button onClick={() => setEditItem(item)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50">
                          <Edit size={15} />
                        </button>
                        <button onClick={() => deleteMutation.mutate(item.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {cat.items.filter((i) => i.is_active).length === 0 && (
                  <p className="text-gray-400 text-sm px-5 py-4">Sin items en esta categoría</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {showForm && (
          <ItemForm categories={categories} onSave={(data) => createMutation.mutate(data)} onCancel={() => setShowForm(false)} />
        )}
        {editItem && (
          <ItemForm item={editItem} categories={categories}
            onSave={(data) => updateMutation.mutate({ id: editItem.id, data })}
            onCancel={() => setEditItem(null)} />
        )}
      </div>
    </AppLayout>
  );
}
