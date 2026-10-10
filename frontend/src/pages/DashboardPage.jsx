import { useQuery } from "@tanstack/react-query";
import { getSummary } from "../api/reports";
import { getActiveOrders } from "../api/orders";
import { format, startOfMonth } from "date-fns";
import AppLayout from "../components/layout/AppLayout";
import { ORDER_STATUS_LABELS, money, orderLabel } from "../utils/orders";
import { TrendingUp, ShoppingBag, DollarSign, TrendingDown } from "lucide-react";

function KPICard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const { data: summary } = useQuery({
    queryKey: ["summary", monthStart, today],
    queryFn: () => getSummary({ from: monthStart, to: today }).then((r) => r.data),
  });

  const { data: activeOrders = [] } = useQuery({
    queryKey: ["active-orders"],
    queryFn: () => getActiveOrders().then((r) => r.data),
    refetchInterval: 15000,
  });

  const fmt = money;

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-500 text-sm">Resumen del mes actual</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard label="Ingresos del mes" value={fmt(summary?.total_revenue)} icon={TrendingUp} color="bg-green-500" />
          <KPICard label="Pedidos cerrados" value={summary?.total_orders || 0} icon={ShoppingBag} color="bg-blue-500" />
          <KPICard label="Ticket promedio" value={fmt(summary?.avg_ticket)} icon={DollarSign} color="bg-orange-500" />
          <KPICard label="Ganancia neta" value={fmt(summary?.net_profit)} icon={TrendingDown} color="bg-purple-500" />
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">
            Pedidos activos ({activeOrders.length})
          </h3>
          {activeOrders.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay pedidos activos</p>
          ) : (
            <div className="space-y-2">
              {activeOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-700">{orderLabel(order)} — {order.items.length} items</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    order.status === "ready" ? "bg-green-100 text-green-700" :
                    order.status === "sent_to_kitchen" ? "bg-yellow-100 text-yellow-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {ORDER_STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
