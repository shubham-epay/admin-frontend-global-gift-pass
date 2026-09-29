import { api } from './client';

const clean = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null));

export const resourceApi = (endpoint) => ({
  list: (params) => api.get(endpoint, { params: clean(params) }).then((r) => r.data),
  get: (id) => api.get(`${endpoint}/${id}`).then((r) => r.data.data),
  create: (body) => api.post(endpoint, body).then((r) => r.data.data),
  update: (id, body) => api.patch(`${endpoint}/${id}`, body).then((r) => r.data.data),
  remove: (id) => api.delete(`${endpoint}/${id}`).then((r) => r.data.data),
});
