export const ORDER_TYPE_LABELS = {
  dine_in: "Salón",
  takeaway: "Para llevar",
  delivery: "Delivery",
};

export const ORDER_TYPE_COLORS = {
  dine_in: "bg-gray-100 text-gray-700",
  takeaway: "bg-amber-100 text-amber-800",
  delivery: "bg-sky-100 text-sky-800",
};

export const ORDER_STATUS_LABELS = {
  open: "Abierto",
  sent_to_kitchen: "En cocina",
  partially_ready: "Parcialmente listo",
  ready: "Listo",
  delivered: "Entregado",
  closed: "Cobrado",
  cancelled: "Cancelado",
};

export const PAYMENT_METHOD_LABELS = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  mixed: "Mixto",
};

// "Mesa 3", "Para llevar · Ana" o "Delivery · Juan"
export function orderLabel(order, tables = []) {
  if (!order) return "";
  if (order.order_type === "takeaway") return `Para llevar · ${order.customer_name}`;
  if (order.order_type === "delivery") return `Delivery · ${order.customer_name}`;
  const number = order.table_number ?? tables.find((t) => t.id === order.table_id)?.number ?? order.table_id;
  return `Mesa ${number}`;
}

export function orderSubtotal(order) {
  return (order?.items || [])
    .filter((i) => i.status !== "cancelled")
    .reduce((sum, i) => sum + parseFloat(i.unit_price) * i.quantity, 0);
}

export function orderTotal(order) {
  return orderSubtotal(order) + parseFloat(order?.delivery_fee || 0);
}

export const money = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

// El backend guarda UTC y a veces lo devuelve sin zona horaria: sin la "Z"
// el navegador lo interpretaría como hora local (3 h de diferencia en Argentina).
export function parseServerDate(value) {
  if (!value) return null;
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
}

export const minutesSince = (value) => Math.max(0, Math.floor((Date.now() - parseServerDate(value)) / 60000));
