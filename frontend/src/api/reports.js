import client from "./client";

export const getSummary = (params) => client.get("/reports/summary", { params });
export const getSales = (params) => client.get("/reports/sales", { params });
export const getBestSellers = (params) => client.get("/reports/best-sellers", { params });
export const getProfitability = (params) => client.get("/reports/profitability", { params });
export const getPaymentMethods = (params) => client.get("/reports/payment-methods", { params });
export const getByWaiter = (params) => client.get("/reports/by-waiter", { params });
export const getOrderTypes = (params) => client.get("/reports/order-types", { params });
