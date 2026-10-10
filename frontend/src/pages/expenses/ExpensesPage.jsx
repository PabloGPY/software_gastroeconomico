import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getExpenses, createExpense, deleteExpense } from "../../api/expenses";
import AppLayout from "../../components/layout/AppLayout";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Plus, Trash2, X } from "lucide-react";
import { money } from "../../utils/orders";

function ExpenseForm({ onSave, onCancel }) {
  const [form, setForm] = useState({
    category: "", description: "", amount: "", expense_date: format(new Date(), "yyyy-MM-dd"),
  });

  const categories = ["Proveedores", "Personal", "Servicios", "Alquiler", "Mantenimiento", "Marketing", "Otro"];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">Nuevo egreso</h3>
          <button onClick={onCancel}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Categoría</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Seleccioná...</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <input placeholder="Descripción" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <input type="number" step="1" min="0" placeholder="Monto (Gs.)" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <div>
            <label className="block text-xs text-gray-600 mb-1">Fecha</label>
            <input type="date" value={form.expense_date}
              onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
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

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => getExpenses().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => { qc.invalidateQueries(["expenses"]); setShowForm(false); toast.success("Egreso registrado"); },
    onError: (err) => toast.error(err.response?.data?.detail || "Error"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => { qc.invalidateQueries(["expenses"]); toast.success("Egreso eliminado"); },
  });

  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Egresos</h2>
            <p className="text-red-500 font-medium">Total: {money(total)}</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Nuevo egreso
          </button>
        </div>

        <div className="space-y-2">
          {expenses.length === 0 && (
            <div className="text-center py-12 text-gray-400">No hay egresos registrados</div>
          )}
          {expenses.map((e) => (
            <div key={e.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{e.category}</span>
                  <p className="font-medium text-gray-900">{e.description}</p>
                </div>
                <p className="text-xs text-gray-400 mt-1">{format(new Date(e.expense_date), "dd/MM/yyyy")}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-bold text-red-500">{money(e.amount)}</p>
                <button onClick={() => deleteMutation.mutate(e.id)} className="text-gray-300 hover:text-red-400">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {showForm && <ExpenseForm onSave={(data) => createMutation.mutate(data)} onCancel={() => setShowForm(false)} />}
      </div>
    </AppLayout>
  );
}
