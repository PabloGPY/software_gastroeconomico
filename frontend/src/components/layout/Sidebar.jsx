import { NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { getActiveOrders } from "../../api/orders";
import { readyItems } from "../../utils/orders";
import {
  LayoutDashboard, Utensils, Calendar, ClipboardList,
  ChefHat, CreditCard, TrendingUp, Settings, LogOut, DollarSign, ShoppingBag,
} from "lucide-react";

const allLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { to: "/floor", label: "Mesas", icon: Utensils, roles: ["admin", "waiter", "cashier"] },
  { to: "/reservations", label: "Reservas", icon: Calendar, roles: ["admin", "waiter", "cashier"] },
  { to: "/order", label: "Pedidos", icon: ClipboardList, roles: ["admin", "waiter"] },
  { to: "/counter", label: "Mostrador / Delivery", icon: ShoppingBag, roles: ["admin", "waiter", "cashier"] },
  { to: "/kitchen", label: "Cocina", icon: ChefHat, roles: ["admin", "kitchen"] },
  { to: "/checkout", label: "Caja", icon: CreditCard, roles: ["admin", "cashier"] },
  { to: "/expenses", label: "Egresos", icon: DollarSign, roles: ["admin"] },
  { to: "/reports", label: "Reportes", icon: TrendingUp, roles: ["admin"] },
  { to: "/menu", label: "Menú", icon: Settings, roles: ["admin"] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = allLinks.filter((l) => l.roles.includes(user?.role));

  // Contador de pedidos listos para entregar en "Pedidos" (mesas) y "Mostrador" (para llevar/delivery)
  const { data: activeOrders = [] } = useQuery({
    queryKey: ["active-orders"],
    queryFn: () => getActiveOrders().then((r) => r.data),
    refetchInterval: 15000,
    enabled: !!user && user.role !== "kitchen",
  });
  const readyCount = (pred) => activeOrders.filter((o) => pred(o) && readyItems(o).length > 0).length;
  const badges = {
    "/order": readyCount((o) => o.order_type === "dine_in"),
    "/counter": readyCount((o) => o.order_type !== "dine_in"),
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="w-64 bg-black text-white flex flex-col min-h-screen">
      <div className="p-5 border-b border-gray-800 text-center">
        <h1><img src="/logo.png" alt="Fooders — Pizzas & Papas" className="w-24 h-24 mx-auto" /></h1>
        <p className="text-xs text-gray-400 mt-1">{user?.full_name}</p>
        <span className="inline-block text-xs bg-orange-700 text-orange-100 px-2 py-0.5 rounded mt-1 capitalize">
          {user?.role === "waiter" ? "Mozo" : user?.role === "cashier" ? "Cajero" : user?.role === "kitchen" ? "Cocina" : "Admin"}
        </span>
      </div>

      <nav className="flex-1 py-4">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isActive
                  ? "bg-orange-600 text-white"
                  : "text-gray-300 hover:bg-gray-900 hover:text-white"
              }`
            }
          >
            <Icon size={18} />
            {label}
            {badges[to] > 0 && (
              <span className="ml-auto bg-green-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center"
                title="Listos para entregar">
                {badges[to]}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-6 py-4 text-sm text-gray-400 hover:text-white hover:bg-gray-900 border-t border-gray-800 transition-colors"
      >
        <LogOut size={18} />
        Cerrar sesión
      </button>
    </aside>
  );
}
