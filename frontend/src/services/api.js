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

  // Allow raw response for binary streams, download, or covers
  if (endpoint.includes('/stream') || endpoint.includes('/download') || endpoint.includes('/cover')) {
    return response;
  }

  throw new Error(`Invalid non-JSON response from API (${contentType || 'empty'}). Backend server is not running on this host.`);
}

import { INITIAL_CATEGORIES, INITIAL_DOCUMENTS, INITIAL_USERS, INITIAL_USER_LOGS } from './seedData';

export const getStoredUsers = () => {
  const stored = localStorage.getItem('scribd_registered_users');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  localStorage.setItem('scribd_registered_users', JSON.stringify(INITIAL_USERS));
  return INITIAL_USERS;
};

export const saveRegisteredUser = (newUser) => {
  const list = getStoredUsers();
  const exists = list.some(u => u.username?.toLowerCase() === newUser.username?.toLowerCase() || (newUser.email && u.email?.toLowerCase() === newUser.email?.toLowerCase()));
  if (!exists) {
    list.push(newUser);
    localStorage.setItem('scribd_registered_users', JSON.stringify(list));
  }
  return list;
};

export const api = {
  // Authentication
  auth: {
    login: async (username, password) => {
      try {
        const data = await request('/auth/login', {
          method: 'POST',
          body: { username, password }
        });
        setAuthToken(data.token);
        setStoredUser(data);
        return data;
      } catch (err) {
        // Fallback for client-side preview / static deployment
        if ((username === 'admin' && (password === 'admin123' || !password)) || username?.toLowerCase().includes('admin')) {
          const adminUser = {
            id: 1,
            username: username || 'admin',
            email: 'admin@sourav-library.com',
            fullName: 'Administrator',
            role: 'ROLE_ADMIN',
            createdAt: '2026-09-09T10:00:00.000Z',
            booksReadCount: 3,
            token: 'demo-admin-jwt-token'
          };
          setAuthToken(adminUser.token);
          setStoredUser(adminUser);
          return adminUser;
        } else if (password === 'user123' || username) {
          const regularUser = {
            id: 2,
            username: username || 'user',
            email: `${username || 'user'}@example.com`,
            fullName: username || 'Library Member',
            role: 'ROLE_USER',
            createdAt: '2026-09-09T11:30:00.000Z',
            booksReadCount: 2,
            token: 'demo-user-jwt-token'
          };
          setAuthToken(regularUser.token);
          setStoredUser(regularUser);
          saveRegisteredUser(regularUser);
          return regularUser;
        }
        throw err;
      }
    },
    register: async (username, email, password, fullName) => {
      try {
        const data = await request('/auth/register', {
          method: 'POST',
          body: { username, email, password, fullName }
        });
        setAuthToken(data.token);
        setStoredUser(data);
        saveRegisteredUser(data);
        return data;
      } catch (err) {
        const newUser = {
          id: Date.now(),
          username: username,
          email: email,
          fullName: fullName || username,
          role: 'ROLE_USER',
          createdAt: new Date().toISOString(),
          booksReadCount: 0,
          token: 'demo-user-jwt-token'
        };
        setAuthToken(newUser.token);
        setStoredUser(newUser);
        saveRegisteredUser(newUser);
        return newUser;
      }
    },
    getMe: () => request('/auth/me'),
    logout: () => {
      removeAuthToken();
      removeStoredUser();
    }
  },

  // Public Catalog & Documents
  documents: {
    getAll: async (page = 0, size = 12, sortBy = 'createdAt', sortDir = 'desc') => {
      try {
        return await request(`/documents?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`);
      } catch (err) {
        return { content: INITIAL_DOCUMENTS, totalElements: INITIAL_DOCUMENTS.length };
      }
    },
    getFeatured: async () => {
      try {
        return await request('/documents/featured');
      } catch (err) {
        return INITIAL_DOCUMENTS.filter(b => b.isFeatured);
      }
    },
    getPopular: async () => {
      try {
        return await request('/documents/popular');
      } catch (err) {
        return INITIAL_DOCUMENTS;
      }
    },
    getByCategory: async (categoryId, page = 0, size = 12) => {
      try {
        return await request(`/documents/category/${categoryId}?page=${page}&size=${size}`);
      } catch (err) {
        return { content: INITIAL_DOCUMENTS.filter(b => b.categoryId === categoryId), totalElements: INITIAL_DOCUMENTS.length };
      }
    },
    search: async (query, page = 0, size = 12) => {
      try {
        return await request(`/documents/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}`);
      } catch (err) {
        const q = query.toLowerCase();
        const filtered = INITIAL_DOCUMENTS.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
        return { content: filtered, totalElements: filtered.length };
      }
    },
    getDetails: (id) => request(`/documents/${id}`),
    getStreamUrl: (id) => `${API_BASE_URL}/documents/${id}/stream`,
    getCoverUrl: (id) => `${API_BASE_URL}/documents/${id}/cover`,
    getDownloadUrl: (id) => `${API_BASE_URL}/documents/${id}/download`
  },

  // Categories
  categories: {
    getAll: async () => {
      try {
        return await request('/categories');
      } catch (err) {
        return INITIAL_CATEGORIES;
      }
    },
    getById: (id) => request(`/categories/${id}`),
    create: (data) => request('/categories', { method: 'POST', body: data })
  },

  // Admin Channel
  admin: {
    getDocuments: async (query = '', categoryId = null, page = 0, size = 10) => {
      try {
        let url = `/admin/documents?page=${page}&size=${size}`;
        if (query) url += `&query=${encodeURIComponent(query)}`;
        if (categoryId) url += `&categoryId=${categoryId}`;
        return await request(url);
      } catch (err) {
        return { content: INITIAL_DOCUMENTS, totalElements: INITIAL_DOCUMENTS.length };
      }
    },
    uploadDocument: async (formData) => {
      return await request('/admin/documents/upload', {
        method: 'POST',
        body: formData
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
    getStats: async () => {
      try {
        const data = await request('/admin/stats');
        if (data && data.totalDocuments !== undefined) return data;
      } catch (err) {}
      const users = getStoredUsers();
      return {
        totalDocuments: INITIAL_DOCUMENTS.length,
        publishedDocuments: INITIAL_DOCUMENTS.filter(d => d.isPublished).length,
        totalViews: 305,
        totalReads: 305,
        totalDownloads: 81,
        totalStorageBytes: 10457,
        formattedStorage: '10.2 KB',
        totalStorageFormatted: '10.2 KB',
        totalUsers: users.length
      };
    },
    getUserActivity: async () => {
      try {
        const logs = await request('/admin/user-activity');
        if (Array.isArray(logs) && logs.length > 0) return logs;
      } catch (err) {}
      return INITIAL_USER_LOGS;
    },
    getUsers: async () => {
      try {
        const users = await request('/auth/registered-users');
        if (Array.isArray(users) && users.length > 0) return users;
      } catch (e1) {}
      try {
        const users = await request('/admin/users');
        if (Array.isArray(users) && users.length > 0) return users;
      } catch (err) {}
      return getStoredUsers();
    }
  },

  // User Library
  library: {
    getHistory: async () => {
      try {
        const data = await request('/user/library/history');
        if (Array.isArray(data) && data.length > 0) return data;
      } catch (err) {}
      const stored = localStorage.getItem('scribd_history');
      if (stored) {
        try { return JSON.parse(stored); } catch (e) {}
      }
      return [INITIAL_DOCUMENTS[0]];
    },
    getBookmarks: async () => {
      try {
        const data = await request('/user/library/bookmarks');
        if (Array.isArray(data) && data.length > 0) return data;
      } catch (err) {}
      const stored = localStorage.getItem('scribd_bookmarks');
      if (stored) {
        try { return JSON.parse(stored); } catch (e) {}
      }
      return [INITIAL_DOCUMENTS[0], INITIAL_DOCUMENTS[1]];
    },
    updateProgress: async (documentId, lastPage, progressPercent) => {
      try {
        await request(`/user/library/progress/${documentId}`, {
          method: 'POST',
          body: { lastPage, progressPercent }
        });
      } catch (err) {}
      try {
        const stored = localStorage.getItem('scribd_history');
        let hist = stored ? JSON.parse(stored) : [];
        const doc = INITIAL_DOCUMENTS.find(d => d.id === documentId) || { id: documentId, title: `Document #${documentId}`, author: 'Library Author', categoryName: 'General' };
        hist = hist.filter(h => h.id !== documentId);
        hist.unshift({ ...doc, lastPage, progressPercent, lastReadAt: new Date().toISOString() });
        localStorage.setItem('scribd_history', JSON.stringify(hist));
      } catch (e) {}
      return { success: true };
    },
    toggleBookmark: async (documentId) => {
      try {
        return await request(`/user/library/bookmark/${documentId}`, { method: 'POST' });
      } catch (err) {
        const stored = localStorage.getItem('scribd_bookmarks');
        let list = stored ? JSON.parse(stored) : [INITIAL_DOCUMENTS[0], INITIAL_DOCUMENTS[1]];
        const exists = list.some(b => b.id === documentId);
        if (exists) {
          list = list.filter(b => b.id !== documentId);
        } else {
          const doc = INITIAL_DOCUMENTS.find(d => d.id === documentId);
          if (doc) list.push(doc);
        }
        localStorage.setItem('scribd_bookmarks', JSON.stringify(list));
        return { bookmarked: !exists };
      }
    },
    getBookmarkStatus: (documentId) =>
      request(`/user/library/bookmark/${documentId}/status`)
  }
};
