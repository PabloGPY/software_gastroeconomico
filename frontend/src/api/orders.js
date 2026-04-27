import client from "./client";

export const getActiveOrders = () => client.get("/orders/active");
export const getOrders = () => client.get("/orders");
export const getOrder = (id) => client.get(`/orders/${id}`);
export const createOrder = (data) => client.post("/orders", data);
export const addOrderItems = (id, items) => client.post(`/orders/${id}/items`, items);
export const sendToKitchen = (id) => client.post(`/orders/${id}/send`);
export const updateItemStatus = (orderId, itemId, status) =>
  client.patch(`/orders/${orderId}/items/${itemId}/status`, { status });
export const deliverOrder = (id) => client.post(`/orders/${id}/deliver`);
export const cancelOrder = (id) => client.post(`/orders/${id}/cancel`);
