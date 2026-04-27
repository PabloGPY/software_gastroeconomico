import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getTables, createTable, updateTable, updateTableStatus, deleteTable } from "../../api/tables";
import { getActiveOrders } from "../../api/orders";
import AppLayout from "../../components/layout/AppLayout";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import { Plus, X } from "lucide-react";

const STATUS_COLORS = {
  available: "bg-green-400 hover:bg-green-500",
  occupied: "bg-red-400 hover:bg-red-500",
  reserved: "bg-yellow-400 hover:bg-yellow-500",
  cleaning: "bg-gray-400 hover:bg-gray-500",
};

const STATUS_LABELS = {
  available: "Libre",
  occupied: "Ocupada",
  reserved: "Reservada",
  cleaning: "Limpieza",
};

function TableCard({ table, orderCount, isAdmin, onClick }) {
  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
      style={{ left: `${table.pos_x}%`, top: `${table.pos_y}%` }}
      onClick={() => onClick(table)}
    >
      <div
        className={`${STATUS_COLORS[table.status]} rounded-xl shadow-md transition-all w-20 h-20 flex flex-col items-center justify-center text-white font-bold select-none`}
      >
        <span className="text-lg">{table.number}</span>
        <span className="text-xs opacity-80">{table.capacity}p</span>
        {orderCount > 0 && (
          <span className="text-xs bg-white text-gray-800 rounded-full px-1">{orderCount} p.</span>
        )}
      </div>
      <p className="text-center text-xs text-gray-500 mt-1">{STATUS_LABELS[table.status]}</p>
    </div>
  );
}

function TableModal({ table, orderForTable, onClose, onStatusChange, onGoToOrder, isAdmin }) {
  const { user } = useAuth();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Mesa {table.number}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <p>Capacidad: {table.capacity} personas</p>
          <p>Estado: <span className="font-medium capitalize">{STATUS_LABELS[table.status]}</span></p>
          {orderForTable && <p>Items en pedido: {orderForTable.items.length}</p>}
        </div>
        <div className="flex flex-col gap-2">
          {(user.role === "waiter" || user.role === "admin") && (
            <button
              onClick={() => onGoToOrder(table)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium"
            >
              {table.status === "occupied" ? "Ver / agregar pedido" : "Nuevo pedido"}
            </button>
          )}
          {(user.role === "cashier" || user.role === "admin") && table.status === "occupied" && (
            <button
              onClick={() => onGoToOrder(table, true)}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-medium"
            >
              Cobrar mesa
            </button>
          )}
          {(user.role === "admin" || user.role === "waiter") && (
            <button
              onClick={() => onStatusChange(table, "cleaning")}
              className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-lg text-sm"
            >
              Marcar para limpieza
            </button>
          )}
          {user.role === "admin" && (
            <button
              onClick={() => onStatusChange(table, "available")}
              className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 rounded-lg text-sm"
            >
              Marcar disponible
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function NewTableForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ number: "", capacity: 4, pos_x: 50, pos_y: 50 });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
        <h3 className="font-bold text-lg mb-4">Nueva Mesa</h3>
        <div className="space-y-3">
          <input
            type="number" placeholder="Número de mesa" value={form.number}
            onChange={(e) => setForm({ ...form, number: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="number" placeholder="Capacidad (personas)" value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Cancelar</button>
          <button
            onClick={() => onSave(form)}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-medium"
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FloorMapPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedTable, setSelectedTable] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: () => getTables().then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: activeOrders = [] } = useQuery({
    queryKey: ["active-orders"],
    queryFn: () => getActiveOrders().then((r) => r.data),
    refetchInterval: 15000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateTableStatus(id, status),
    onSuccess: () => { qc.invalidateQueries(["tables"]); setSelectedTable(null); toast.success("Estado actualizado"); },
    onError: () => toast.error("Error al cambiar estado"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => createTable(data),
    onSuccess: () => { qc.invalidateQueries(["tables"]); setShowNewForm(false); toast.success("Mesa creada"); },
    onError: (err) => toast.error(err.response?.data?.detail || "Error al crear mesa"),
  });

  const orderByTable = (tableId) => activeOrders.find((o) => o.table_id === tableId);

  const handleGoToOrder = (table, checkout = false) => {
    setSelectedTable(null);
    if (checkout) {
      navigate(`/checkout?table=${table.id}`);
    } else {
      navigate(`/order/${table.id}`);
    }
  };

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Mapa de mesas</h2>
            <p className="text-gray-500 text-sm">{tables.length} mesas activas</p>
          </div>
          {user.role === "admin" && (
            <button
              onClick={() => setShowNewForm(true)}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Plus size={16} /> Nueva mesa
            </button>
          )}
        </div>

        <div className="flex gap-3 mb-4 text-xs">
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <div key={status} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded ${STATUS_COLORS[status].split(" ")[0]}`} />
              <span className="text-gray-500">{label}</span>
            </div>
          ))}
        </div>

        <div className="relative bg-white rounded-2xl border-2 border-dashed border-gray-200 shadow-sm" style={{ height: "600px" }}>
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              orderCount={orderByTable(table.id)?.items.length || 0}
              isAdmin={user.role === "admin"}
              onClick={setSelectedTable}
            />
          ))}
          {tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              No hay mesas configuradas. Creá la primera mesa.
            </div>
          )}
        </div>

        {selectedTable && (
          <TableModal
            table={selectedTable}
            orderForTable={orderByTable(selectedTable.id)}
            onClose={() => setSelectedTable(null)}
            onStatusChange={(t, status) => statusMutation.mutate({ id: t.id, status })}
            onGoToOrder={handleGoToOrder}
            isAdmin={user.role === "admin"}
          />
        )}

        {showNewForm && (
          <NewTableForm
            onSave={(data) => createMutation.mutate(data)}
            onCancel={() => setShowNewForm(false)}
          />
        )}
      </div>
    </AppLayout>
  );
}
