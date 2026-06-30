import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

export const getRecipes = (query = '', page = 0, limit = 6) =>
  api.get('/recipes', { params: { query, page, limit } });

export const getRecipe = (id) => api.get(`/${id}`);

export const urlToJson = (url) =>
  api.post('/url_to_json', null, { params: { url } });

export const uploadFileToJson = (file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/upload_file_to_json', form);
};

export const recipeToDB = (data) => api.post('/recipe_to_db', data);

export const updateRecipe = (id, data) => api.put(`/${id}`, data);

export const deleteRecipe = (id) => api.delete(`/${id}`);
