import client from "./client";

export const getReservations = (params) => client.get("/reservations", { params });
export const createReservation = (data) => client.post("/reservations", data);
export const updateReservation = (id, data) => client.put(`/reservations/${id}`, data);
export const updateReservationStatus = (id, status) => client.patch(`/reservations/${id}/status`, { status });
