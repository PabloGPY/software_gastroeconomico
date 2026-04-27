import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const DEFAULT_ROUTES = {
  admin: "/dashboard",
  waiter: "/floor",
  cashier: "/checkout",
  kitchen: "/kitchen",
};

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={DEFAULT_ROUTES[user.role] || "/login"} replace />;
  }
  return children;
}
