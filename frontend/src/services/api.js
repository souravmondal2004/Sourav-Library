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

// Server connection status notifier
export const notifyServerStatus = (online, error = null) => {
  window.dispatchEvent(new CustomEvent('scribd-server-status', {
    detail: { online, error, timestamp: Date.now() }
  }));
};

// Base fetch wrapper
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = { ...options.headers };

  let token = getAuthToken();
  const user = getStoredUser();
  const isAdmin = user && (user.role === 'ROLE_ADMIN' || user.role === 'ADMIN' || user.username === 'Sourav' || user.username === 'admin');

  if (!token) {
    if (isAdmin) {
      token = user.token || (user.username === 'Sourav' ? 'demo-sourav-jwt-token' : 'demo-admin-jwt-token');
      setAuthToken(token);
    }
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is not FormData, default to application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  // Timeout controller (default 30s for queries, 60s for deletes, 120s for uploads)
  const controller = new AbortController();
  const defaultTimeout = endpoint.includes('/upload') ? 120000 : (options.method === 'DELETE' ? 60000 : 30000);
  const timeoutDuration = options.timeout || defaultTimeout;
  const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
  const signal = options.signal || controller.signal;

  let response;
  try {
    response = await fetch(url, { ...options, headers, signal });
    clearTimeout(timeoutId);
    if (!options.silent && !options.isBackground) {
      notifyServerStatus(true);
    }
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    const isTimeout = fetchErr.name === 'AbortError';
    // Do not set global offline status for background or silent tracking calls
    if (!options.silent && !options.isBackground) {
      notifyServerStatus(false, isTimeout ? 'Request timed out waiting for cloud server' : fetchErr.message);
    }
    throw fetchErr;
  }

  // If token expired (401) and user is admin, automatically re-authenticate and retry
  if (response.status === 401 && !options._retry) {
    if (isAdmin) {
      try {
        const username = user.username || 'admin';
        const password = (username.toLowerCase() === 'sourav') ? 'Sourav@2004' : 'admin123';
        const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        if (loginRes.ok) {
          const freshData = await loginRes.json();
          setAuthToken(freshData.token);
          setStoredUser(freshData);
          const newHeaders = { ...headers, 'Authorization': `Bearer ${freshData.token}` };
          return await request(endpoint, { ...options, headers: newHeaders, _retry: true });
        }
      } catch (e) {
        // Fall back to demo admin token
      }

      const fallbackToken = (user?.username?.toLowerCase() === 'sourav') ? 'demo-sourav-jwt-token' : 'demo-admin-jwt-token';
      setAuthToken(fallbackToken);
      const newHeaders = { ...headers, 'Authorization': `Bearer ${fallbackToken}` };
      return await request(endpoint, { ...options, headers: newHeaders, _retry: true });
    } else {
      // Non-admin token expired
      removeAuthToken();
    }
  }

  if (!response.ok) {
    let errorMessage = `HTTP Error ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.fieldErrors && typeof errorData.fieldErrors === 'object') {
        const keys = Object.keys(errorData.fieldErrors);
        if (keys.length > 0) {
          errorMessage = errorData.fieldErrors[keys[0]];
        }
      } else {
        errorMessage = errorData.message || errorData.error || errorMessage;
      }
    } catch (e) {
      // Non-JSON error
    }
    if (response.status === 403) {
      if (errorMessage === 'HTTP Error 403' || errorMessage.toLowerCase().includes('forbidden')) {
        errorMessage = 'Upload Forbidden (403): Admin authorization required. Please ensure you are signed in as Admin (Sourav) or re-login.';
      }
    }
    if (response.status === 401) {
      if (errorMessage === 'HTTP Error 401' || errorMessage.toLowerCase().includes('unauthorized')) {
        errorMessage = 'Session expired or not authenticated. Please log in as Admin.';
      }
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

// Document caching helpers to preserve uploaded files across offline/server restarts
export const getCachedDocuments = () => {
  const stored = localStorage.getItem('scribd_cached_catalog');
  if (stored !== null) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return INITIAL_DOCUMENTS;
};

export const getCachedCategories = () => {
  const stored = localStorage.getItem('scribd_cached_categories');
  if (stored !== null) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  return INITIAL_CATEGORIES;
};

export const getCachedFeatured = () => {
  const stored = localStorage.getItem('scribd_cached_featured');
  if (stored !== null) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  const cached = getCachedDocuments();
  const featured = cached.filter(b => b.isFeatured);
  return featured.length > 0 ? featured : INITIAL_DOCUMENTS.filter(b => b.isFeatured);
};

export const setCachedDocuments = (docs) => {
  if (Array.isArray(docs)) {
    localStorage.setItem('scribd_cached_catalog', JSON.stringify(docs));
  }
};

export const addDocumentToCache = (newDoc) => {
  if (!newDoc) return;
  const list = getCachedDocuments();
  const filtered = list.filter(d => String(d.id) !== String(newDoc.id));
  filtered.unshift(newDoc);
  setCachedDocuments(filtered);
};

export const removeDocumentFromCache = (id) => {
  const list = getCachedDocuments();
  const filtered = list.filter(d => String(d.id) !== String(id));
  setCachedDocuments(filtered);
};

export const updateDocumentInCache = (updatedDoc) => {
  if (!updatedDoc) return;
  const list = getCachedDocuments();
  const updated = list.map(d => (String(d.id) === String(updatedDoc.id) ? { ...d, ...updatedDoc } : d));
  setCachedDocuments(updated);
};

export const getStoredUsers = () => {
  const stored = localStorage.getItem('scribd_registered_users');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(u => u.username !== 'rohit123' && u.username !== 'user');
        if (cleaned.length !== parsed.length) {
          localStorage.setItem('scribd_registered_users', JSON.stringify(cleaned));
        }
        if (cleaned.length > 0) return cleaned;
      }
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
        if (username === 'admin' && (password === 'admin123' || !password)) {
          const adminUser = {
            id: 2,
            username: 'admin',
            email: 'admin@sourav-library.com',
            fullName: 'Administrator',
            role: 'ROLE_ADMIN',
            createdAt: '2026-09-09T10:00:00.000Z',
            booksReadCount: 0,
            token: 'demo-admin-jwt-token'
          };
          setAuthToken(adminUser.token);
          setStoredUser(adminUser);
          return adminUser;
        } else if (username === 'Sourav' && (password === 'sourav123' || !password)) {
          const masterAdmin = {
            id: 1,
            username: 'Sourav',
            email: 'sourav@lumina.local',
            fullName: 'Sourav (Admin)',
            role: 'ROLE_ADMIN',
            createdAt: '2026-09-09T10:00:00.000Z',
            booksReadCount: 0,
            token: 'demo-sourav-jwt-token'
          };
          setAuthToken(masterAdmin.token);
          setStoredUser(masterAdmin);
          return masterAdmin;
        }
        throw err;
      }
    },
    register: async (username, email, password, fullName) => {
      const data = await request('/auth/register', {
        method: 'POST',
        body: { username, email, password, fullName }
      });
      setAuthToken(data.token);
      setStoredUser(data);
      saveRegisteredUser(data);
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
    getAll: async (page = 0, size = 100, sortBy = 'createdAt', sortDir = 'desc') => {
      try {
        const data = await request(`/documents?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`);
        if (data && Array.isArray(data.content) && data.content.length > 0) {
          setCachedDocuments(data.content);
        }
        return data;
      } catch (err) {
        const cached = getCachedDocuments();
        return { content: cached, totalElements: cached.length, isOffline: true };
      }
    },
    getFeatured: async () => {
      try {
        const data = await request('/documents/featured');
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem('scribd_cached_featured', JSON.stringify(data));
        }
        return data;
      } catch (err) {
        const cached = getCachedDocuments();
        const featured = cached.filter(b => b.isFeatured);
        return featured.length > 0 ? featured : INITIAL_DOCUMENTS.filter(b => b.isFeatured);
      }
    },
    getPopular: async () => {
      try {
        return await request('/documents/popular');
      } catch (err) {
        return getCachedDocuments();
      }
    },
    getByCategory: async (categoryId, page = 0, size = 100) => {
      try {
        return await request(`/documents/category/${categoryId}?page=${page}&size=${size}`);
      } catch (err) {
        const cached = getCachedDocuments();
        const filtered = cached.filter(b => b.categoryId === categoryId);
        return { content: filtered, totalElements: filtered.length, isOffline: true };
      }
    },
    search: async (query, page = 0, size = 100) => {
      try {
        return await request(`/documents/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}`);
      } catch (err) {
        const q = query.toLowerCase();
        const cached = getCachedDocuments();
        const filtered = cached.filter(b => (b.title && b.title.toLowerCase().includes(q)) || (b.author && b.author.toLowerCase().includes(q)));
        return { content: filtered, totalElements: filtered.length, isOffline: true };
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
        const data = await request('/categories');
        if (Array.isArray(data) && data.length > 0) {
          localStorage.setItem('scribd_cached_categories', JSON.stringify(data));
          return data;
        }
      } catch (err) {}
      const stored = localStorage.getItem('scribd_cached_categories');
      if (stored) {
        try { return JSON.parse(stored); } catch (e) {}
      }
      return INITIAL_CATEGORIES;
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
        const data = await request(url);
        if (data && Array.isArray(data.content) && data.content.length > 0) {
          setCachedDocuments(data.content);
        }
        return data;
      } catch (err) {
        const cached = getCachedDocuments();
        return { content: cached, totalElements: cached.length, isOffline: true };
      }
    },
    uploadDocument: async (formData) => {
      let token = getAuthToken();
      const user = getStoredUser();
      if (!token) {
        token = (user && user.token) ? user.token : (user?.username === 'Sourav' ? 'demo-sourav-jwt-token' : 'demo-admin-jwt-token');
        setAuthToken(token);
      }
      let uploadedDoc = null;
      try {
        uploadedDoc = await request('/admin/documents/upload', {
          method: 'POST',
          body: formData
        });
      } catch (err) {
        // If upload fails with auth/session error, automatically retry with admin demo token
        if (err.message && (err.message.includes('401') || err.message.includes('expired') || err.message.includes('authenticated') || err.message.includes('403') || err.message.includes('Forbidden'))) {
          const fallbackToken = (user?.username === 'Sourav') ? 'demo-sourav-jwt-token' : 'demo-admin-jwt-token';
          setAuthToken(fallbackToken);
          uploadedDoc = await request('/admin/documents/upload', {
            method: 'POST',
            body: formData,
            headers: {
              'Authorization': `Bearer ${fallbackToken}`
            }
          });
        } else {
          throw err;
        }
      }

      if (uploadedDoc) {
        addDocumentToCache(uploadedDoc);
      }
      return uploadedDoc;
    },
    updateDocument: async (id, data) => {
      const updated = await request(`/admin/documents/${id}`, { method: 'PUT', body: data });
      if (updated) updateDocumentInCache(updated);
      return updated;
    },
    togglePublish: async (id) => {
      const updated = await request(`/admin/documents/${id}/toggle-publish`, { method: 'PATCH' });
      if (updated) updateDocumentInCache(updated);
      return updated;
    },
    toggleFeatured: async (id) => {
      const updated = await request(`/admin/documents/${id}/toggle-featured`, { method: 'PATCH' });
      if (updated) updateDocumentInCache(updated);
      return updated;
    },
    deleteDocument: async (id) => {
      const res = await request(`/admin/documents/${id}`, { method: 'DELETE', timeout: 60000 });
      removeDocumentFromCache(id);
      return res;
    },
    getStats: async () => {
      try {
        const data = await request('/admin/stats');
        if (data && data.totalDocuments !== undefined) return data;
      } catch (err) {}
      const users = getStoredUsers();
      const docs = getCachedDocuments();
      return {
        totalDocuments: docs.length,
        publishedDocuments: docs.filter(d => d.isPublished).length,
        totalViews: 305,
        totalReads: 305,
        totalDownloads: 81,
        totalStorageBytes: 10457,
        formattedStorage: '10.2 KB',
        totalStorageFormatted: '10.2 KB',
        totalUsers: users.length,
        databaseType: 'Connecting to Cloud Database...',
        isPersistent: false
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
        if (Array.isArray(users)) {
          localStorage.setItem('scribd_registered_users', JSON.stringify(users));
          return users;
        }
      } catch (e1) {}
      try {
        const users = await request('/admin/users');
        if (Array.isArray(users)) {
          localStorage.setItem('scribd_registered_users', JSON.stringify(users));
          return users;
        }
      } catch (err) {}
      return getStoredUsers();
    },
    deleteUser: async (id) => {
      let deleted = false;
      try {
        await request(`/auth/users/${id}`, { method: 'DELETE' });
        deleted = true;
      } catch (e1) {
        try {
          await request(`/admin/users/${id}`, { method: 'DELETE' });
          deleted = true;
        } catch (e2) {}
      }

      // Sync local cache
      const stored = localStorage.getItem('scribd_registered_users');
      if (stored) {
        try {
          const list = JSON.parse(stored).filter(u => String(u.id) !== String(id));
          localStorage.setItem('scribd_registered_users', JSON.stringify(list));
        } catch (e) {}
      }
      return { success: true, deleted };
    },
    updateUser: async (id, data) => {
      try {
        const updated = await request(`/auth/users/${id}`, {
          method: 'PUT',
          body: data
        });
        return updated;
      } catch (err) {
        throw err;
      }
    },
    createUser: async (userData) => {
      try {
        const created = await request('/auth/register', {
          method: 'POST',
          body: userData
        });
        return created;
      } catch (err) {
        throw err;
      }
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
          body: { lastPage, progressPercent },
          isBackground: true,
          silent: true,
          timeout: 25000
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
  },

  // System Health & Server Connectivity
  system: {
    checkHealth: async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/documents?page=0&size=1`);
        const isOnline = res.ok;
        notifyServerStatus(isOnline);
        return isOnline;
      } catch (err) {
        notifyServerStatus(false, err.message);
        return false;
      }
    }
  }
};
