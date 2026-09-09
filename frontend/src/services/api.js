/**
 * Scribd Clone API Client
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Helper to get JWT token from localStorage
export const getAuthToken = () => localStorage.getItem('scribd_token');
export const setAuthToken = (token) => localStorage.setItem('scribd_token', token);
export const removeAuthToken = () => localStorage.removeItem('scribd_token');

export const getStoredUser = () => {
  const user = localStorage.getItem('scribd_user');
  return user ? JSON.parse(user) : null;
};
export const setStoredUser = (user) => localStorage.setItem('scribd_user', JSON.stringify(user));
export const removeStoredUser = () => localStorage.removeItem('scribd_user');

// Base fetch wrapper
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = { ...options.headers };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is not FormData, default to application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    // Token expired or unauthorized
    // Don't auto logout on every 401 if checking me
  }

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // Non-JSON error
    }
    throw new Error(errorMessage);
  }

  // Check if response has content
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  return response;
}

export const api = {
  // Authentication
  auth: {
    login: async (username, password) => {
      const data = await request('/auth/login', {
        method: 'POST',
        body: { username, password }
      });
      setAuthToken(data.token);
      setStoredUser(data);
      return data;
    },
    register: async (username, email, password, fullName) => {
      const data = await request('/auth/register', {
        method: 'POST',
        body: { username, email, password, fullName }
      });
      setAuthToken(data.token);
      setStoredUser(data);
      return data;
    },
    getMe: () => request('/auth/me'),
    logout: () => {
      removeAuthToken();
      removeStoredUser();
    }
  },

  // Public Catalog & Documents
  documents: {
    getAll: (page = 0, size = 12, sortBy = 'createdAt', sortDir = 'desc') =>
      request(`/documents?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`),
    getFeatured: () => request('/documents/featured'),
    getPopular: () => request('/documents/popular'),
    getByCategory: (categoryId, page = 0, size = 12) =>
      request(`/documents/category/${categoryId}?page=${page}&size=${size}`),
    search: (query, page = 0, size = 12) =>
      request(`/documents/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}`),
    getDetails: (id) => request(`/documents/${id}`),
    getStreamUrl: (id) => `${API_BASE_URL}/documents/${id}/stream`,
    getCoverUrl: (id) => `${API_BASE_URL}/documents/${id}/cover`,
    getDownloadUrl: (id) => `${API_BASE_URL}/documents/${id}/download`
  },

  // Categories
  categories: {
    getAll: () => request('/categories'),
    getById: (id) => request(`/categories/${id}`),
    create: (data) => request('/categories', { method: 'POST', body: data })
  },

  // Admin Channel
  admin: {
    getDocuments: (query = '', categoryId = null, page = 0, size = 10) => {
      let url = `/admin/documents?page=${page}&size=${size}`;
      if (query) url += `&query=${encodeURIComponent(query)}`;
      if (categoryId) url += `&categoryId=${categoryId}`;
      return request(url);
    },
    uploadDocument: async (formData) => {
      return await request('/admin/documents/upload', {
        method: 'POST',
        body: formData // Multipart FormData
      });
    },
    updateDocument: (id, data) =>
      request(`/admin/documents/${id}`, { method: 'PUT', body: data }),
    togglePublish: (id) =>
      request(`/admin/documents/${id}/toggle-publish`, { method: 'PATCH' }),
    toggleFeatured: (id) =>
      request(`/admin/documents/${id}/toggle-featured`, { method: 'PATCH' }),
    deleteDocument: (id) =>
      request(`/admin/documents/${id}`, { method: 'DELETE' }),
    getStats: () => request('/admin/stats'),
    getUserActivity: () => request('/admin/user-activity'),
    getUsers: () => request('/admin/users')
  },

  // User Library
  library: {
    getHistory: () => request('/user/library/history'),
    getBookmarks: () => request('/user/library/bookmarks'),
    updateProgress: (documentId, lastPage, progressPercent) =>
      request(`/user/library/progress/${documentId}`, {
        method: 'POST',
        body: { lastPage, progressPercent }
      }),
    toggleBookmark: (documentId) =>
      request(`/user/library/bookmark/${documentId}`, { method: 'POST' }),
    getBookmarkStatus: (documentId) =>
      request(`/user/library/bookmark/${documentId}/status`)
  }
};
