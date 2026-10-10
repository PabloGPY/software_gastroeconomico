import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getActiveOrders, updateItemStatus } from "../../api/orders";
import { getTables } from "../../api/tables";
import AppLayout from "../../components/layout/AppLayout";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { CheckCircle, Clock, ChefHat, ShoppingBag, Bike } from "lucide-react";
import { orderLabel, minutesSince } from "../../utils/orders";

const TICKET_HEADER = {
  dine_in: { className: "bg-gray-900", Icon: ChefHat },
  takeaway: { className: "bg-amber-600", Icon: ShoppingBag },
  delivery: { className: "bg-sky-700", Icon: Bike },
};

const ITEM_STATUS_COLORS = {
  pending: "bg-yellow-50 border-yellow-300",
  preparing: "bg-blue-50 border-blue-300",
  ready: "bg-green-50 border-green-300",
  delivered: "bg-gray-50 border-gray-200",
};

const ITEM_STATUS_LABELS = {
  pending: "Pendiente",
  preparing: "Preparando",
  ready: "Listo",
  delivered: "Entregado",
};

function KitchenTicket({ order, table, onItemStatusChange }) {
  const kitchenItems = order.items.filter((i) => !["delivered", "cancelled"].includes(i.status));
  if (kitchenItems.length === 0) return null;

  const minutesAgo = minutesSince(order.created_at);
  const header = TICKET_HEADER[order.order_type] || TICKET_HEADER.dine_in;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
      <div className={`${header.className} text-white px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <header.Icon size={16} />
          <span className="font-bold">{orderLabel(order, table ? [table] : [])}</span>
        </div>
        <div className={`flex items-center gap-2 text-xs ${minutesAgo >= 20 ? "text-red-300 font-bold" : "text-gray-200"}`}>
          <Clock size={12} />
          <span>{minutesAgo}m</span>
        </div>
      </div>
      <div className="p-3 space-y-2">
        {kitchenItems.map((item) => (
          <div key={item.id} className={`border rounded-lg p-3 ${ITEM_STATUS_COLORS[item.status]}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg text-gray-900">{item.quantity}×</span>
                  <span className="font-medium text-gray-800">{item.menu_item_name || `Item #${item.menu_item_id}`}</span>
                </div>
                {item.notes && (
                  <p className="text-xs text-gray-500 mt-1 italic">📝 {item.notes}</p>
                )}
                <span className="text-xs text-gray-400">{ITEM_STATUS_LABELS[item.status]}</span>
              </div>
              <div className="flex flex-col gap-1">
                {item.status === "preparing" && (
                  <button
                    onClick={() => onItemStatusChange(order.id, item.id, "ready")}
                    className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium"
                  >
                    <CheckCircle size={12} /> Listo
                  </button>
                )}
                {item.status === "pending" && (
                  <button
                    onClick={() => onItemStatusChange(order.id, item.id, "preparing")}
                    className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium"
                  >
                    Preparando
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function KitchenDisplayPage() {
  const qc = useQueryClient();
  const token = localStorage.getItem("token");

  const { data: orders = [] } = useQuery({
    queryKey: ["active-orders"],
    queryFn: () => getActiveOrders().then((r) => r.data),
    refetchInterval: 10000,
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["tables"],
    queryFn: () => getTables().then((r) => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ orderId, itemId, status }) => updateItemStatus(orderId, itemId, status),
    onSuccess: () => qc.invalidateQueries(["active-orders"]),
    onError: () => toast.error("Error al actualizar"),
  });

  useEffect(() => {
    if (!token) return;
    const ws = new WebSocket(`ws://${window.location.hostname}:8001/ws/kitchen?token=${token}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.event === "new_order") {
        qc.invalidateQueries(["active-orders"]);
        toast.success(`Nuevo pedido — ${data.label}`);
      }
    };
    ws.onerror = () => console.warn("WS error, polling fallback active");
    return () => ws.close();
  }, [token]);

  const kitchenOrders = orders.filter((o) =>
    !["closed", "cancelled"].includes(o.status) &&
    o.items.some((i) => !["delivered", "cancelled"].includes(i.status))
  );

  const tableById = (id) => tables.find((t) => t.id === id);

  return (
    <AppLayout>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Pantalla de Cocina</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>{kitchenOrders.length} pedidos activos</span>
          </div>
        </div>

        {kitchenOrders.length === 0 ? (
          <div className="text-center py-24">
            <ChefHat size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">Sin pedidos pendientes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {kitchenOrders.map((order) => (
              <KitchenTicket
                key={order.id}
                order={order}
                table={tableById(order.table_id)}
                onItemStatusChange={(orderId, itemId, status) =>
                  statusMutation.mutate({ orderId, itemId, status })
                }
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
