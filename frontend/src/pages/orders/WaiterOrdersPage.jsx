import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActiveOrders, deliverOrder } from "../../api/orders";
import { getTables } from "../../api/tables";
import AppLayout from "../../components/layout/AppLayout";
import { useAuth } from "../../contexts/AuthContext";
import { minutesSince, orderLabel, readyItems } from "../../utils/orders";
import toast from "react-hot-toast";
import { CheckCircle, Clock, ChefHat, Plus } from "lucide-react";

const ITEM_STATUS = {
  pending: { label: "Sin enviar", className: "text-gray-500" },
  preparing: { label: "En cocina", className: "text-yellow-600" },
  ready: { label: "Listo", className: "text-green-600 font-semibold" },
  delivered: { label: "Entregado", className: "text-gray-400" },
};

function OrderCard({ order, tables, onDeliver, onAddItems, delivering }) {
  const ready = readyItems(order);
  const visible = order.items.filter((i) => i.status !== "cancelled");

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${ready.length ? "border-green-400 ring-2 ring-green-100" : "border-gray-100"}`}>
      <div className={`px-4 py-3 flex items-center justify-between ${ready.length ? "bg-green-500 text-white" : "bg-gray-50"}`}>
        <span className="font-bold text-lg">{orderLabel(order, tables)}</span>
        <span className={`flex items-center gap-1 text-xs ${ready.length ? "text-green-50" : "text-gray-500"}`}>
          <Clock size={12} /> {minutesSince(order.created_at)} min
        </span>
      </div>

      <ul className="p-4 space-y-1.5 text-sm">
        {visible.map((i) => {
          const st = ITEM_STATUS[i.status] || ITEM_STATUS.pending;
          return (
            <li key={i.id} className={`flex justify-between gap-2 ${i.status === "delivered" ? "line-through text-gray-400" : "text-gray-800"}`}>
              <span>
                {i.quantity}× {i.menu_item_name}
                {i.notes && <span className="text-gray-400 italic"> — {i.notes}</span>}
              </span>
              <span className={`text-xs whitespace-nowrap ${st.className}`}>{st.label}</span>
            </li>
          );
        })}
      </ul>

      <div className="px-4 pb-4 flex gap-2">
        <button onClick={() => onAddItems(order)}
          className="flex items-center justify-center gap-1 border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-sm">
          <Plus size={15} /> Agregar
        </button>
        {ready.length > 0 && (
          <button onClick={() => onDeliver(order)} disabled={delivering}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold">
            <CheckCircle size={16} /> Entregar {ready.reduce((n, i) => n + i.quantity, 0)} a la mesa
          </button>
        )}
      </div>
    </div>
  );
}

export default function WaiterOrdersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [onlyMine, setOnlyMine] = useState(false);

  const { data: activeOrders = [] } = useQuery({
    queryKey: ["active-orders"],
    queryFn: () => getActiveOrders().then((r) => r.data),
    refetchInterval: 10000,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: () => getTables().then((r) => r.data),
  });

  const deliverMutation = useMutation({
    mutationFn: (order) => deliverOrder(order.id),
    onSuccess: () => { qc.invalidateQueries(["active-orders"]); toast.success("Entregado"); },
    onError: (err) => toast.error(err.response?.data?.detail || "Error al entregar"),
  });

  const tableOrders = activeOrders
    .filter((o) => o.order_type === "dine_in")
    .filter((o) => !onlyMine || o.waiter_id === user?.id);
  const toDeliver = tableOrders.filter((o) => readyItems(o).length > 0);
  const inProgress = tableOrders.filter((o) => readyItems(o).length === 0);

  const card = (order) => (
    <OrderCard
      key={order.id}
      order={order}
      tables={tables}
      delivering={deliverMutation.isPending}
      onDeliver={(o) => deliverMutation.mutate(o)}
      onAddItems={(o) => navigate(`/order/${o.table_id}`)}
    />
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Pedidos de mesas</h2>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="accent-orange-500" />
            Solo mis mesas
          </label>
        </div>

        <section className="mb-8">
          <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
            <CheckCircle size={18} /> Listos para entregar ({toDeliver.length})
          </h3>
          {toDeliver.length === 0 ? (
            <p className="text-gray-400 text-sm bg-white rounded-xl border border-dashed border-gray-200 py-8 text-center">
              Nada para llevar a las mesas por ahora
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{toDeliver.map(card)}</div>
          )}
        </section>

        <section>
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <ChefHat size={18} /> En curso ({inProgress.length})
          </h3>
          {inProgress.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No hay otros pedidos de mesa abiertos</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{inProgress.map(card)}</div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
