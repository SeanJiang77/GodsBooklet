import api from "./client";

export async function createRoom(payload) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE || ''}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getRoom(id) {
  const { data } = await api.get(`/rooms/${id}`);
  return data;
}

export async function addPlayer(id, payload) {
  const { data } = await api.post(`/rooms/${id}/players`, payload);
  return data;
}

export async function assignRoles(id, payload = {}) {
  const { data } = await api.post(`/rooms/${id}/assign`, payload);
  return data;
}

export async function step(id, payload) {
  const { data } = await api.post(`/rooms/${id}/step`, payload);
  return data;
}

export async function undo(id, payload) {
  const { data } = await api.post(`/rooms/${id}/undo`, payload);
  return data;
}
