import client from "./client";

export const getTables = () => client.get("/tables");
export const createTable = (data) => client.post("/tables", data);
export const updateTable = (id, data) => client.put(`/tables/${id}`, data);
export const updateTableStatus = (id, status) => client.patch(`/tables/${id}/status`, { status });
export const deleteTable = (id) => client.delete(`/tables/${id}`);
