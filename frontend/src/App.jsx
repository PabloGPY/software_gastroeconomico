import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import FloorMapPage from "./pages/tables/FloorMapPage";
import ReservationsPage from "./pages/tables/ReservationsPage";
import TableOrderPage from "./pages/orders/TableOrderPage";
import KitchenDisplayPage from "./pages/orders/KitchenDisplayPage";
import CheckoutPage from "./pages/payments/CheckoutPage";
import MenuManagerPage from "./pages/menu/MenuManagerPage";
import ExpensesPage from "./pages/expenses/ExpensesPage";
import ReportsPage from "./pages/reports/ReportsPage";
import ProtectedRoute from "./components/layout/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const ROLE_HOME = {
  admin: "/dashboard",
  waiter: "/floor",
  cashier: "/checkout",
  kitchen: "/kitchen",
};

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role] || "/floor"} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<HomeRedirect />} />

            <Route path="/dashboard" element={
              <ProtectedRoute roles={["admin"]}><DashboardPage /></ProtectedRoute>
            } />
            <Route path="/floor" element={
              <ProtectedRoute roles={["admin", "waiter", "cashier"]}><FloorMapPage /></ProtectedRoute>
            } />
            <Route path="/reservations" element={
              <ProtectedRoute roles={["admin", "waiter", "cashier"]}><ReservationsPage /></ProtectedRoute>
            } />
            <Route path="/order/:tableId" element={
              <ProtectedRoute roles={["admin", "waiter"]}><TableOrderPage /></ProtectedRoute>
            } />
            <Route path="/order" element={
              <ProtectedRoute roles={["admin", "waiter"]}><FloorMapPage /></ProtectedRoute>
            } />
            <Route path="/kitchen" element={
              <ProtectedRoute roles={["admin", "kitchen"]}><KitchenDisplayPage /></ProtectedRoute>
            } />
            <Route path="/checkout" element={
              <ProtectedRoute roles={["admin", "cashier"]}><CheckoutPage /></ProtectedRoute>
            } />
            <Route path="/menu" element={
              <ProtectedRoute roles={["admin"]}><MenuManagerPage /></ProtectedRoute>
            } />
            <Route path="/expenses" element={
              <ProtectedRoute roles={["admin"]}><ExpensesPage /></ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute roles={["admin"]}><ReportsPage /></ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
