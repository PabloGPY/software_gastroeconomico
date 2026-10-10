import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSummary, getSales, getBestSellers, getPaymentMethods, getOrderTypes } from "../../api/reports";
import { ORDER_TYPE_LABELS } from "../../utils/orders";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import AppLayout from "../../components/layout/AppLayout";
import { format, startOfMonth, startOfWeek, subDays } from "date-fns";

const PERIODS = [
  { label: "Hoy", from: () => format(new Date(), "yyyy-MM-dd"), to: () => format(new Date(), "yyyy-MM-dd") },
  { label: "Esta semana", from: () => format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"), to: () => format(new Date(), "yyyy-MM-dd") },
  { label: "Este mes", from: () => format(startOfMonth(new Date()), "yyyy-MM-dd"), to: () => format(new Date(), "yyyy-MM-dd") },
  { label: "Últimos 30 días", from: () => format(subDays(new Date(), 30), "yyyy-MM-dd"), to: () => format(new Date(), "yyyy-MM-dd") },
];

const PIE_COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6"];

function KPICard({ label, value, sub, color = "text-gray-900" }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function ReportsPage() {
  const [periodIdx, setPeriodIdx] = useState(2);
  const [chartPeriod, setChartPeriod] = useState("day");

  const from = PERIODS[periodIdx].from();
  const to = PERIODS[periodIdx].to();
  const params = { from, to };

  const { data: summary } = useQuery({
    queryKey: ["summary", from, to],
    queryFn: () => getSummary(params).then((r) => r.data),
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales", from, to, chartPeriod],
    queryFn: () => getSales({ ...params, period: chartPeriod }).then((r) => r.data),
  });

  const { data: bestSellers = [] } = useQuery({
    queryKey: ["best-sellers", from, to],
    queryFn: () => getBestSellers(params).then((r) => r.data),
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["payment-methods", from, to],
    queryFn: () => getPaymentMethods(params).then((r) => r.data),
  });

  const { data: orderTypes = [] } = useQuery({
    queryKey: ["order-types", from, to],
    queryFn: () => getOrderTypes(params).then((r) => r.data),
  });
  const channelsTotal = orderTypes.reduce((sum, c) => sum + c.total, 0);

  const fmt = (n) => `$${Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;

  const salesChartData = sales.map((s) => ({
    name: s.period.substring(0, 10),
    Ingresos: parseFloat(s.revenue),
    Pedidos: s.orders,
  }));

  const pieData = paymentMethods.map((p) => ({
    name: p.method === "cash" ? "Efectivo" : p.method === "card" ? "Tarjeta" : "Transfer.",
    value: parseFloat(p.total),
  }));

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Reportes</h2>
          <div className="flex gap-2">
            {PERIODS.map((p, i) => (
              <button
                key={i}
                onClick={() => setPeriodIdx(i)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  periodIdx === i ? "bg-orange-500 text-white" : "bg-white border text-gray-600 hover:border-orange-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <KPICard label="Ingresos" value={fmt(summary?.total_revenue)} color="text-green-600" />
          <KPICard label="Pedidos" value={summary?.total_orders || 0} />
          <KPICard label="Ticket promedio" value={fmt(summary?.avg_ticket)} />
          <KPICard label="Egresos" value={fmt(summary?.total_expenses)} color="text-red-500" />
          <KPICard
            label="Ganancia neta"
            value={fmt(summary?.net_profit)}
            color={(summary?.net_profit || 0) >= 0 ? "text-green-600" : "text-red-500"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Ventas por período</h3>
              <div className="flex gap-1">
                {["day", "week", "month"].map((p) => (
                  <button key={p} onClick={() => setChartPeriod(p)}
                    className={`px-2 py-1 text-xs rounded ${chartPeriod === p ? "bg-orange-100 text-orange-600 font-medium" : "text-gray-400 hover:text-gray-600"}`}>
                    {p === "day" ? "Día" : p === "week" ? "Semana" : "Mes"}
                  </button>
                ))}
              </div>
            </div>
            {salesChartData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={salesChartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => `$${val.toFixed(2)}`} />
                  <Bar dataKey="Ingresos" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Métodos de pago</h3>
            {pieData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(val) => `$${parseFloat(val).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Ventas por canal</h3>
          {orderTypes.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Sin datos para el período</p>
          ) : (
            <div className="space-y-3">
              {["dine_in", "takeaway", "delivery"].map((type) => {
                const row = orderTypes.find((c) => c.order_type === type) || { count: 0, total: 0 };
                const pct = channelsTotal > 0 ? (row.total / channelsTotal) * 100 : 0;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{ORDER_TYPE_LABELS[type]} <span className="text-gray-400">· {row.count} pedidos</span></span>
                      <span className="font-medium text-gray-900">{fmt(row.total)} <span className="text-gray-400 font-normal">({pct.toFixed(0)}%)</span></span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Top productos</h3>
          {bestSellers.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Sin datos para el período</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b">
                  <th className="pb-2 font-medium">#</th>
                  <th className="pb-2 font-medium">Producto</th>
                  <th className="pb-2 font-medium text-right">Cantidad</th>
                  <th className="pb-2 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {bestSellers.map((item, idx) => (
                  <tr key={item.name} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 text-gray-400">{idx + 1}</td>
                    <td className="py-2 font-medium text-gray-800">{item.name}</td>
                    <td className="py-2 text-right text-gray-600">{item.qty_sold}</td>
                    <td className="py-2 text-right font-medium text-orange-500">{fmt(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
