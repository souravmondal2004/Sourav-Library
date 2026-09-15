import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Layers,
  Edit2,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Star,
  HardDrive,
  Users,
  UserCheck,
  UserPlus,
  Activity,
  Plus,
  Search,
  RefreshCw,
  Database,
  X
} from 'lucide-react';
import { api, getStoredUsers } from '../../services/api';
import { INITIAL_USERS, INITIAL_USER_LOGS, INITIAL_DOCUMENTS } from '../../services/seedData';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString();
  } catch {
    return String(dateStr);
  }
};

export default function AdminDashboard({ categories, onRefreshCategories, onOpenReader }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'manage', 'categories', 'users', 'activity'
  const [stats, setStats] = useState({
    totalDocuments: INITIAL_DOCUMENTS.length,
    publishedDocuments: INITIAL_DOCUMENTS.filter(d => d.isPublished).length,
    totalViews: 305,
    formattedStorage: '10.2 KB'
  });
  const [adminDocs, setAdminDocs] = useState(INITIAL_DOCUMENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [message, setMessage] = useState(null);

  // Upload Form State
  const [pdfFile, setPdfFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [pageCount, setPageCount] = useState('');
  const [language, setLanguage] = useState('English');
  const [publishedYear, setPublishedYear] = useState(new Date().getFullYear());
  const [isFeatured, setIsFeatured] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Edit Modal State
  const [editingDoc, setEditingDoc] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCatId, setEditCatId] = useState('');
  const [editYear, setEditYear] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // New Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  // User Activity & Audit State
  const [userLogs, setUserLogs] = useState(INITIAL_USER_LOGS);
  const [usersList, setUsersList] = useState(getStoredUsers());
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Edit User State
  const [editingUser, setEditingUser] = useState(null);
  const [userEditFullName, setUserEditFullName] = useState('');
  const [userEditEmail, setUserEditEmail] = useState('');
  const [userEditRole, setUserEditRole] = useState('ROLE_USER');
  const [userEditPassword, setUserEditPassword] = useState('');
  const [savingUserEdit, setSavingUserEdit] = useState(false);


  const loadUserActivity = async () => {
    setLoadingUsers(true);
    try {
      const [logs, users] = await Promise.all([
        api.admin.getUserActivity(),
        api.admin.getUsers()
      ]);
      if (Array.isArray(logs)) setUserLogs(logs);
      if (Array.isArray(users)) {
        setUsersList(users);
        setStats(prev => ({ ...prev, totalUsers: users.length }));
      }
    } catch (e) {
      console.error('Failed to load user activity:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUserActivity();
    const interval = setInterval(loadUserActivity, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Load stats & docs
  const loadStats = async () => {
    try {
      const data = await api.admin.getStats();
      setStats(data);
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  };

  const loadAdminDocs = async () => {
    setLoadingDocs(true);
    try {
      const res = await api.admin.getDocuments(searchQuery, selectedCat || null, 0, 50);
      setAdminDocs(res.content || []);
    } catch (e) {
      console.error('Failed to load admin docs:', e);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadAdminDocs();
    loadUserActivity();
  }, [searchQuery, selectedCat]);

  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories]);

  // Handle PDF Upload Submit
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!pdfFile) {
      setMessage({ type: 'error', text: 'Please select a PDF document file to upload.' });
      return;
    }
    if (!title.trim() || !author.trim() || !categoryId) {
      setMessage({ type: 'error', text: 'Title, Author, and Category are required.' });
      return;
    }

    setUploading(true);
    setMessage(null);

    const activeCatId = categoryId || (categories.length > 0 ? categories[0].id : 1);
    const formData = new FormData();
    formData.append('file', pdfFile);
    if (coverFile) {
      formData.append('cover', coverFile);
    }
    formData.append('title', title.trim());
    formData.append('author', author.trim());
    formData.append('description', description.trim());
    formData.append('categoryId', activeCatId);
    if (pageCount) formData.append('pageCount', pageCount);
    if (language) formData.append('language', language);
    if (publishedYear) formData.append('publishedYear', publishedYear);
    formData.append('isFeatured', isFeatured);
    formData.append('isPublished', isPublished);

    try {
      const uploadedDoc = await api.admin.uploadDocument(formData);
      setMessage({
        type: 'success',
        text: `"${uploadedDoc.title}" uploaded and processed successfully! Pages: ${uploadedDoc.pageCount}`
      });

      // Reset form
      setPdfFile(null);
      setCoverFile(null);
      setTitle('');
      setAuthor('');
      setDescription('');
      setPageCount('');

      loadStats();
      loadAdminDocs();
    } catch (err) {
      let errorMsg = err.message || 'Failed to upload document';
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('Load failed') || errorMsg.includes('not running')) {
        errorMsg = 'Backend server is offline. Please ensure your backend is started by running "start-all.bat", then click Upload again.';
      }
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setUploading(false);
    }
  };

  // Toggle Publish / Unpublish
  const handleTogglePublish = async (id) => {
    try {
      await api.admin.togglePublish(id);
      loadAdminDocs();
      loadStats();
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  // Toggle Featured
  const handleToggleFeatured = async (id) => {
    try {
      await api.admin.toggleFeatured(id);
      loadAdminDocs();
    } catch (err) {
      alert('Error updating featured flag: ' + err.message);
    }
  };

  // Delete Document
  const handleDelete = async (id, docTitle) => {
    if (window.confirm(`Are you sure you want to permanently delete "${docTitle}"?`)) {
      try {
        setMessage({ type: 'info', text: `Deleting "${docTitle}"... please wait.` });
        await api.admin.deleteDocument(id);
        loadAdminDocs();
        loadStats();
        setMessage({ type: 'success', text: `Document "${docTitle}" deleted successfully.` });
      } catch (err) {
        alert('Failed to delete document: ' + err.message);
        setMessage({ type: 'error', text: `Failed to delete document: ${err.message}` });
      }
    }
  };

  // Open Edit Modal
  const startEdit = (doc) => {
    setEditingDoc(doc);
    setEditTitle(doc.title);
    setEditAuthor(doc.author);
    setEditDesc(doc.description || '');
    setEditCatId(doc.categoryId);
    setEditYear(doc.publishedYear || '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await api.admin.updateDocument(editingDoc.id, {
        title: editTitle,
        author: editAuthor,
        description: editDesc,
        categoryId: editCatId,
        publishedYear: editYear ? parseInt(editYear, 10) : null,
        isFeatured: editingDoc.isFeatured,
        isPublished: editingDoc.isPublished
      });
      setEditingDoc(null);
      loadAdminDocs();
      setMessage({ type: 'success', text: 'Document metadata updated successfully.' });
    } catch (err) {
      alert('Failed to update: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete User Account
  const handleDeleteUser = async (user) => {
    if (user.role === 'ROLE_ADMIN' || user.id === 1 || user.username?.toLowerCase() === 'sourav') {
      alert('Cannot delete the Master Admin account.');
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete user "${user.username}"?`)) {
      try {
        await api.admin.deleteUser(user.id);
        setUsersList(prev => prev.filter(u => u.id !== user.id));
        setStats(prev => ({ ...prev, totalUsers: Math.max(0, (prev.totalUsers || 1) - 1) }));
        setMessage({ type: 'success', text: `User "${user.username}" deleted successfully.` });
      } catch (err) {
        alert('Failed to delete user: ' + err.message);
      }
    }
  };

  // Edit User Handlers
  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    setUserEditFullName(u.fullName || '');
    setUserEditEmail(u.email || '');
    setUserEditRole(u.role || 'ROLE_USER');
    setUserEditPassword('');
  };

  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingUserEdit(true);
    try {
      const updates = {
        fullName: userEditFullName.trim(),
        email: userEditEmail.trim(),
        role: userEditRole
      };
      if (userEditPassword.trim()) {
        updates.password = userEditPassword.trim();
      }
      await api.admin.updateUser(editingUser.id, updates);

      setUsersList(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...updates } : u));
      setMessage({ type: 'success', text: `User "${editingUser.username}" updated successfully.` });
      setEditingUser(null);
      loadUserActivity();
    } catch (err) {
      alert('Failed to update user: ' + err.message);
    } finally {
      setSavingUserEdit(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      await api.categories.create({
        name: newCatName.trim(),
        description: newCatDesc.trim()
      });
      setNewCatName('');
      setNewCatDesc('');
      onRefreshCategories();
      setMessage({ type: 'success', text: 'New category created successfully.' });
    } catch (err) {
      alert('Failed to create category: ' + err.message);
    } finally {
      setCreatingCat(false);
    }
  };

  return (
    <div className="container admin-view">
      {/* Header Banner */}
      <div className="admin-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
            <span style={{
              background: '#002e3b',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: 1
            }}>
              ADMIN CHANNEL
            </span>
            <span style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 600 }}>● Online & Controlled</span>
          </div>
          <h2>Document & Book Management Console</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Upload PDFs and books, curate the library, manage categories, and monitor readership metrics.
          </p>
        </div>

        <button className="btn btn-outline" onClick={() => { loadStats(); loadAdminDocs(); }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Analytics Overview Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon"><FileText size={24} /></div>
            <div>
              <div className="stat-val">{stats?.totalDocuments ?? adminDocs.length ?? 3}</div>
              <div className="stat-lbl">Total Uploaded Books</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
              <CheckCircle size={24} />
            </div>
            <div>
              <div className="stat-val">{stats?.publishedDocuments ?? adminDocs.filter(d => d.isPublished).length ?? 3}</div>
              <div className="stat-lbl">Published Live</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <BarChart3 size={24} />
            </div>
            <div>
              <div className="stat-val">{stats?.totalViews ?? stats?.totalReads ?? 305}</div>
              <div className="stat-lbl">Total Reads / Views</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
              <HardDrive size={24} />
            </div>
            <div>
              <div className="stat-val">{stats?.formattedStorage ?? stats?.totalStorageFormatted ?? '10.2 KB'}</div>
              <div className="stat-lbl">Disk Storage Used</div>
            </div>
          </div>
          <div className="stat-card" style={{ borderColor: stats?.isPersistent ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)' }}>
            <div className="stat-icon" style={{ background: stats?.isPersistent ? '#dcfce7' : '#fef3c7', color: stats?.isPersistent ? '#16a34a' : '#d97706' }}>
              <Database size={24} />
            </div>
            <div>
              <div className="stat-val" style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: 2 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: (stats?.persistent ?? stats?.isPersistent) ? '#10b981' : '#f59e0b',
                  display: 'inline-block'
                }}></span>
                {stats?.databaseType || ((stats?.persistent ?? stats?.isPersistent) ? 'PostgreSQL (Cloud)' : 'Local H2')}
              </div>
              <div className="stat-lbl">{(stats?.persistent ?? stats?.isPersistent) ? 'Permanent Cloud DB' : 'Ephemeral Storage'}</div>
            </div>
          </div>
        </div>
      )}

      {stats && !(stats?.persistent ?? stats?.isPersistent) && (
        <div style={{
          padding: '0.9rem 1.25rem',
          borderRadius: 8,
          marginBottom: '1.25rem',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          color: '#d97706',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <Database size={20} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong>Ephemeral Container Storage:</strong> Render free containers reset when idle. To make your uploaded books and deletions 100% permanent across offline periods, add a free PostgreSQL cloud database (e.g. from <a href="https://neon.tech" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', fontWeight: 600, color: 'inherit' }}>Neon.tech</a> or Render Postgres) by adding <code>DATABASE_URL</code> to your Render backend environment variables.
          </div>
        </div>
      )}

      {/* Notification Message */}
      {message && (
        <div style={{
          padding: '0.9rem 1.25rem',
          borderRadius: 8,
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#166534' : '#991b1b',
          border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`
        }}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600 }}>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ color: 'inherit' }}><X size={16} /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <UploadCloud size={18} />
          Upload New Book / PDF
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          <FileText size={18} />
          Manage Catalog ({adminDocs.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <UserCheck size={18} />
          Signed Up Users ({usersList.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <Activity size={18} />
          PDF Reading Activity ({userLogs.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <Layers size={18} />
          Add Category
        </button>
      </div>

      {/* Tab 1: Upload Studio */}
      {activeTab === 'upload' && (
        <div className="upload-card">
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Upload Book or PDF Document</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Supported format: PDF up to 100MB. The backend will automatically extract page count and prepare chunked streaming.
          </p>

          {message && (
            <div style={{
              padding: '0.9rem 1.25rem',
              borderRadius: 8,
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              color: message.type === 'success' ? 'var(--color-emerald-light)' : '#fb7185',
              border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)'}`
            }}>
              {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600 }}>{message.text}</span>
              <button onClick={() => setMessage(null)} style={{ color: 'inherit' }}><X size={16} /></button>
            </div>
          )}

          <form onSubmit={handleUploadSubmit}>
            {/* PDF File Picker */}
            <div className="form-group">
              <label className="form-label">Select PDF Document *</label>
              <div
                className="dropzone"
                onClick={() => document.getElementById('pdf-input').click()}
              >
                <UploadCloud size={36} color="var(--color-accent)" style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                  {pdfFile ? pdfFile.name : 'Click or drop PDF file here'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {pdfFile ? `${(pdfFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Standard PDF format'}
                </div>
                <input
                  id="pdf-input"
                  type="file"
                  accept="application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setPdfFile(e.target.files[0]);
                      // Auto-fill title from filename if empty
                      if (!title) {
                        const nameWithoutExt = e.target.files[0].name.replace(/\.[^/.]+$/, '');
                        setTitle(nameWithoutExt);
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Cover Image Picker */}
            <div className="form-group">
              <label className="form-label">Book Cover Image (Optional)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setCoverFile(e.target.files[0]);
                    }
                  }}
                  className="form-input"
                />
                {coverFile && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                    Cover selected: {coverFile.name}
                  </span>
                )}
              </div>
            </div>

            {/* Metadata Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Book Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Systems with Java & Oracle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Author Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Doe"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="form-select"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Publication Year</label>
                <input
                  type="number"
                  value={publishedYear}
                  onChange={(e) => setPublishedYear(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Language</label>
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description / Synopsis</label>
              <textarea
                rows={3}
                placeholder="Overview of the book contents, chapters, or abstract..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-textarea"
              />
            </div>

            {/* Toggles */}
            <div style={{ display: 'flex', gap: '2rem', margin: '1.25rem 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
                Publish Immediately (Publicly Visible)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                />
                Feature on Homepage Showcase
              </label>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="btn btn-accent"
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
            >
              {uploading ? (
                <>
                  <RefreshCw size={18} className="spin-animation" />
                  Uploading & Processing PDF...
                </>
              ) : (
                <>
                  <UploadCloud size={18} />
                  Upload & Publish to Scribd
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Manage Catalog Table */}
      {activeTab === 'manage' && (
        <div>
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search catalog by title or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
              />
            </div>

            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="form-select"
              style={{ width: 220 }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Cover</th>
                  <th>Title & Author</th>
                  <th>Category</th>
                  <th>Pages</th>
                  <th>Reads</th>
                  <th>Status</th>
                  <th>Featured</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminDocs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No documents found matching the filter.
                    </td>
                  </tr>
                ) : (
                  adminDocs.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div style={{
                          width: 38,
                          height: 50,
                          borderRadius: 4,
                          background: '#002e3b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: '0.65rem'
                        }}>
                          <FileText size={18} />
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{doc.title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>by {doc.author}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', background: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: 4 }}>
                          {doc.categoryName}
                        </span>
                      </td>
                      <td>{doc.pageCount || 1}</td>
                      <td>{doc.viewCount || 0}</td>
                      <td>
                        <span className={`status-badge ${doc.isPublished ? 'published' : 'draft'}`}>
                          {doc.isPublished ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleFeatured(doc.id)}
                          style={{ color: doc.isFeatured ? '#eab308' : '#cbd5e1' }}
                          title="Toggle Featured"
                        >
                          <Star size={18} fill={doc.isFeatured ? '#eab308' : 'none'} />
                        </button>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.35rem' }}
                            onClick={() => onOpenReader(doc)}
                            title="Preview in Reader"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.35rem' }}
                            onClick={() => handleTogglePublish(doc.id)}
                            title={doc.isPublished ? 'Unpublish' : 'Publish'}
                          >
                            {doc.isPublished ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.35rem' }}
                            onClick={() => startEdit(doc)}
                            title="Edit Metadata"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '0.35rem', color: '#dc2626', borderColor: '#fca5a5' }}
                            onClick={() => handleDelete(doc.id, doc.title)}
                            title="Delete Document"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Categories */}
      {activeTab === 'categories' && (
        <div className="upload-card">
          <h3 style={{ marginBottom: '0.5rem' }}>Create New Category</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Categories help readers filter and discover books in the Scribd catalog.
          </p>

          <form onSubmit={handleCreateCategory}>
            <div className="form-group">
              <label className="form-label">Category Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Artificial Intelligence & Robotics"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                rows={2}
                placeholder="Brief summary of books belonging to this category..."
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                className="form-textarea"
              />
            </div>

            <button type="submit" disabled={creatingCat} className="btn btn-primary">
              <Plus size={16} /> Create Category
            </button>
          </form>

          <h4 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Existing Categories ({categories.length})</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {categories.map((c) => (
              <div key={c.id} style={{
                background: 'var(--bg-subtle)',
                padding: '0.75rem',
                borderRadius: 8,
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-primary)' }}>{c.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{c.description || 'No description'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Registered Accounts Panel */}
      {activeTab === 'users' && (
        <div className="upload-card" style={{ maxWidth: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '0.4rem' }}>
                Registered User Accounts ({usersList.length})
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                All accounts registered in the database, including credentials, permissions, and sign-up dates.
              </p>
            </div>
            <button className="btn btn-outline" onClick={loadUserActivity} style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}>
              <RefreshCw size={15} /> Refresh Accounts
            </button>
          </div>


          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Username</th>
                  <th>Email Address</th>
                  <th>Role & Access</th>
                  <th>Joined Date</th>
                  <th>Books Read</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No registered users found.
                    </td>
                  </tr>
                ) : (
                  usersList.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{u.id}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#ffffff' }}>{u.username}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.fullName}</div>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{u.email}</td>
                      <td>
                        <span className={`status-badge ${u.role === 'ROLE_ADMIN' ? 'published' : 'draft'}`} style={{
                          background: u.role === 'ROLE_ADMIN' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                          borderColor: u.role === 'ROLE_ADMIN' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(99, 102, 241, 0.35)',
                          color: u.role === 'ROLE_ADMIN' ? 'var(--color-emerald-light)' : '#a5b4fc'
                        }}>
                          {u.role === 'ROLE_ADMIN' ? 'ADMIN (Full Control)' : 'READER (Read Only)'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatDate(u.createdAt)}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--color-emerald-light)' }}>
                        {u.booksReadCount || 0} books
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.45rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            className="btn btn-outline"
                            onClick={() => handleOpenEditUser(u)}
                            style={{
                              padding: '0.35rem 0.65rem',
                              color: 'var(--color-primary)',
                              borderColor: 'rgba(56, 189, 248, 0.3)',
                              fontSize: '0.75rem',
                              borderRadius: '6px'
                            }}
                            title={`Edit / Change ${u.username}`}
                          >
                            <Edit3 size={13} />
                            Change
                          </button>

                          {u.role !== 'ROLE_ADMIN' && u.id !== 1 && u.username?.toLowerCase() !== 'sourav' ? (
                            <button
                              className="btn btn-outline"
                              onClick={() => handleDeleteUser(u)}
                              style={{
                                padding: '0.35rem 0.65rem',
                                color: '#fb7185',
                                borderColor: 'rgba(244, 63, 94, 0.3)',
                                fontSize: '0.75rem',
                                borderRadius: '6px'
                              }}
                              title={`Delete ${u.username}`}
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontStyle: 'italic', paddingLeft: '0.2rem' }}>
                              Protected
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Live PDF Reading Activity Logs */}
      {activeTab === 'activity' && (
        <div className="upload-card" style={{ maxWidth: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: '#ffffff' }}>Book & PDF Reading Activity Logs</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Real-time tracking of which user is reading which PDF/book, including page progress and timestamps.
              </p>
            </div>
            <button className="btn btn-outline" onClick={loadUserActivity}>
              <RefreshCw size={15} /> Refresh Logs
            </button>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User / Reader</th>
                  <th>Email</th>
                  <th>Book Title & Category</th>
                  <th>Last Page</th>
                  <th>Progress</th>
                  <th>Last Read Time</th>
                </tr>
              </thead>
              <tbody>
                {userLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                      No user reading activity recorded yet. When logged-in readers open books in the PDF reader, their activity will appear here live.
                    </td>
                  </tr>
                ) : (
                  userLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--color-emerald-light)' }}>
                          {log.username || 'User #' + log.userId}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {log.fullName || 'Registered Reader'}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {log.userEmail || '—'}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#ffffff' }}>{log.documentTitle || 'Document #' + log.documentId}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-emerald)' }}>
                          {log.categoryName || 'General'}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#ffffff' }}>Page {log.lastPage || 1}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            flex: 1,
                            height: 6,
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: 4,
                            overflow: 'hidden',
                            maxWidth: 100
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(100, log.progressPercent || 0)}%`,
                              background: 'linear-gradient(90deg, #10b981, #06b6d4)'
                            }} />
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                            {Math.round(log.progressPercent || 0)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatDate(log.lastReadAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingDoc && (
        <div className="modal-backdrop" onClick={() => setEditingDoc(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Edit Book Metadata</h3>
              <button onClick={() => setEditingDoc(null)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Author</label>
                <input
                  type="text"
                  required
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  value={editCatId}
                  onChange={(e) => setEditCatId(e.target.value)}
                  className="form-select"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Publication Year</label>
                <input
                  type="number"
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditingDoc(null)}>
                  Cancel
                </button>
                <button type="submit" disabled={savingEdit} className="btn btn-accent">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', color: '#ffffff', margin: 0 }}>Change User Account</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                  Updating user <strong>@{editingUser.username}</strong> (#{editingUser.id})
                </p>
              </div>
              <button onClick={() => setEditingUser(null)} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  value={userEditFullName}
                  onChange={(e) => setUserEditFullName(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Sourav Mondal"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  value={userEditEmail}
                  onChange={(e) => setUserEditEmail(e.target.value)}
                  className="form-input"
                  placeholder="user@example.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role & Access Level</label>
                <select
                  value={userEditRole}
                  onChange={(e) => setUserEditRole(e.target.value)}
                  className="form-select"
                  disabled={editingUser.id === 1 || editingUser.username?.toLowerCase() === 'sourav'}
                >
                  <option value="ROLE_USER">READER (Read Only)</option>
                  <option value="ROLE_ADMIN">ADMIN (Full Control & Uploads)</option>
                </select>
                {(editingUser.id === 1 || editingUser.username?.toLowerCase() === 'sourav') && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    Master Admin role is protected and cannot be changed.
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">New Password (Leave blank to keep unchanged)</label>
                <input
                  type="password"
                  value={userEditPassword}
                  onChange={(e) => setUserEditPassword(e.target.value)}
                  className="form-input"
                  placeholder="Enter new password (optional)"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.75rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
                <button type="submit" disabled={savingUserEdit} className="btn btn-primary">
                  {savingUserEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}


