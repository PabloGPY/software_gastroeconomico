import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getReservations, createReservation, updateReservationStatus } from "../../api/reservations";
import { getTables } from "../../api/tables";
import AppLayout from "../../components/layout/AppLayout";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { Plus, X } from "lucide-react";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  seated: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-gray-100 text-gray-600",
};

function ReservationForm({ tables, onSave, onCancel }) {
  const [form, setForm] = useState({
    table_id: tables[0]?.id || "",
    customer_name: "",
    customer_phone: "",
    party_size: 2,
    reserved_at: "",
    duration_minutes: 90,
    notes: "",
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">Nueva reserva</h3>
          <button onClick={onCancel}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mesa</label>
            <select
              value={form.table_id}
              onChange={(e) => setForm({ ...form, table_id: parseInt(e.target.value) })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {tables.map((t) => (
                <option key={t.id} value={t.id}>Mesa {t.number} ({t.capacity} personas)</option>
              ))}
            </select>
          </div>
          <input
            placeholder="Nombre del cliente"
            value={form.customer_name}
            onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Teléfono (opcional)"
            value={form.customer_phone}
            onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Personas</label>
              <input type="number" min="1" value={form.party_size}
                onChange={(e) => setForm({ ...form, party_size: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Duración (min)</label>
              <input type="number" min="30" step="30" value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Fecha y hora</label>
            <input type="datetime-local" value={form.reserved_at}
              onChange={(e) => setForm({ ...form, reserved_at: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <textarea
            placeholder="Notas (opcional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Cancelar</button>
          <button
            onClick={() => onSave({ ...form, reserved_at: new Date(form.reserved_at).toISOString() })}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReservationsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [dateFilter, setDateFilter] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: reservations = [] } = useQuery({
    queryKey: ["reservations", dateFilter],
    queryFn: () => getReservations({ date: dateFilter }).then((r) => r.data),
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: () => getTables().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: () => { qc.invalidateQueries(["reservations"]); setShowForm(false); toast.success("Reserva creada"); },
    onError: (err) => toast.error(err.response?.data?.detail || "Error"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateReservationStatus(id, status),
    onSuccess: () => { qc.invalidateQueries(["reservations"]); toast.success("Estado actualizado"); },
  });

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Reservas</h2>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus size={16} /> Nueva reserva
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">Filtrar por fecha</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-3">
          {reservations.length === 0 && (
            <div className="text-center py-12 text-gray-400">No hay reservas para esta fecha</div>
          )}
          {reservations.map((r) => {
            const table = tables.find((t) => t.id === r.table_id);
            return (
              <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{r.customer_name}</p>
                    <p className="text-sm text-gray-500">
                      Mesa {table?.number} · {r.party_size} personas · {r.duration_minutes} min
                    </p>
                    {r.customer_phone && <p className="text-sm text-gray-400">{r.customer_phone}</p>}
                    <p className="text-sm text-gray-700 mt-1">
                      {format(new Date(r.reserved_at), "dd/MM/yyyy HH:mm")}
                    </p>
                    {r.notes && <p className="text-xs text-gray-400 mt-1 italic">{r.notes}</p>}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[r.status]}`}>
                      {r.status}
                    </span>
                    <div className="flex gap-1 mt-2">
                      {r.status === "pending" && (
                        <button onClick={() => statusMutation.mutate({ id: r.id, status: "confirmed" })}
                          className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100">
                          Confirmar
                        </button>
                      )}
                      {r.status !== "cancelled" && r.status !== "seated" && (
                        <>
                          <button onClick={() => statusMutation.mutate({ id: r.id, status: "seated" })}
                            className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100">
                            Sentar
                          </button>
                          <button onClick={() => statusMutation.mutate({ id: r.id, status: "cancelled" })}
                            className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100">
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {showForm && (
          <ReservationForm
            tables={tables}
            onSave={(data) => createMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
          />
        )}
      </div>
    </AppLayout>
  );
}
