import client from "./client";

export const getCategories = () => client.get("/menu/categories");
export const createCategory = (data) => client.post("/menu/categories", data);
export const updateCategory = (id, data) => client.put(`/menu/categories/${id}`, data);
export const deleteCategory = (id) => client.delete(`/menu/categories/${id}`);

export const getItems = (params) => client.get("/menu/items", { params });
export const createItem = (data) => client.post("/menu/items", data);
export const updateItem = (id, data) => client.put(`/menu/items/${id}`, data);
export const toggleAvailability = (id, is_available) => client.patch(`/menu/items/${id}/availability`, { is_available });
export const deleteItem = (id) => client.delete(`/menu/items/${id}`);
