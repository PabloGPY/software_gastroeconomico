import client from "./client";

export const getPayments = () => client.get("/payments");
export const processPayment = (data) => client.post("/payments", data);
export const getPayment = (id) => client.get(`/payments/${id}`);
