import client from "./client";

export const getExpenses = () => client.get("/expenses");
export const getExpenseCategories = () => client.get("/expenses/categories");
export const createExpense = (data) => client.post("/expenses", data);
export const updateExpense = (id, data) => client.put(`/expenses/${id}`, data);
export const deleteExpense = (id) => client.delete(`/expenses/${id}`);
