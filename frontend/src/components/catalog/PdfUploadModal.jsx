import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Image, Sparkles, Check, AlertCircle, Cloud, BookOpen } from 'lucide-react';
import { api } from '../../services/api';

export default function PdfUploadModal({ isOpen, onClose, categories = [], onDocumentUploaded }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [pageCount, setPageCount] = useState('');
  const [publishedYear, setPublishedYear] = useState(new Date().getFullYear());
  const [isFeatured, setIsFeatured] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const pdfInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Initialize category when categories change
  React.useEffect(() => {
    if (categories && categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  if (!isOpen) return null;

  const handlePdfSelected = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMsg('Please select a valid PDF file (*.pdf)');
      return;
    }
    setErrorMsg(null);
    setPdfFile(file);

    // Auto-populate Title & Author if empty
    if (!title) {
      const cleanName = file.name
        .replace(/\.pdf$/i, '')
        .replace(/[-_]/g, ' ')
        .trim();
      setTitle(cleanName);
    }
    if (!author) {
      setAuthor("Sourav's Library");
    }
  };

  const handleCoverSelected = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file for cover (JPG, PNG, WEBP)');
      return;
    }
    setCoverFile(file);
    const objectUrl = URL.createObjectURL(file);
    setCoverPreview(objectUrl);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handlePdfSelected(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pdfFile) {
      setErrorMsg('Please select a PDF document file to upload.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Please enter a book / document title.');
      return;
    }
    if (!author.trim()) {
      setErrorMsg('Please enter the author or publisher name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

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
    if (publishedYear) formData.append('publishedYear', publishedYear);
    formData.append('isFeatured', isFeatured);
    formData.append('isPublished', true);

    try {
      const uploadedDoc = await api.documents.upload(formData);
      if (onDocumentUploaded) {
        onDocumentUploaded(uploadedDoc);
      }
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error('Failed to upload PDF:', err);
      let msg = err.message || 'Failed to upload document.';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        msg = 'Connection error. The cloud server might be waking up (~20s). Please try again in a few moments.';
      }
      setErrorMsg(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content pdf-upload-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '92%' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="modal-icon-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-emerald-light)' }}>
              <Upload size={20} />
            </div>
            <div>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Upload PDF Book or Document</span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: 'var(--color-emerald-light)',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                  <Cloud size={11} /> Cloud Storage
                </span>
              </h3>
              <p className="modal-subtitle">
                Preserve publications in high-fidelity with auto-sync directly to Google Drive (5 TB).
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0.75rem 1rem',
            margin: '0 1.5rem 1rem',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            color: '#f87171',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="video-modal-form" style={{ padding: '0 1.5rem 1.5rem' }}>
          {/* PDF Drag and Drop Area */}
          <div
            className={`pdf-dropzone ${isDragging ? 'dragging' : ''} ${pdfFile ? 'has-file' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => pdfInputRef.current?.click()}
            style={{
              border: isDragging ? '2px dashed var(--color-emerald-light)' : '2px dashed var(--border-color, rgba(255,255,255,0.15))',
              borderRadius: 12,
              padding: '1.5rem 1rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragging ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
              transition: 'all 0.2s ease',
              marginBottom: '1.25rem'
            }}
          >
            <input
              type="file"
              ref={pdfInputRef}
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => handlePdfSelected(e.target.files[0])}
            />

            {pdfFile ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-emerald-light)'
                }}>
                  <FileText size={24} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.92rem' }}>
                    {pdfFile.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {formatFileSize(pdfFile.size)} • Click to replace file
                  </div>
                </div>
                <Check size={18} color="var(--color-emerald-light)" style={{ marginLeft: 8 }} />
              </div>
            ) : (
              <div>
                <Upload size={32} color="var(--color-emerald-light)" style={{ margin: '0 auto 8px', opacity: 0.85 }} />
                <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.95rem', marginBottom: 4 }}>
                  Drop your PDF here or <span style={{ color: 'var(--color-emerald-light)', textDecoration: 'underline' }}>Browse files</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Supports documents, research papers, and books up to 100 MB
                </div>
              </div>
            )}
          </div>

          {/* Form Fields Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                Book / Document Title <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Designing Data-Intensive Applications"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '0.88rem' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                Author / Publisher <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Martin Kleppmann"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                required
                style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '0.88rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                Category
              </label>
              <select
                className="form-input"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '0.88rem' }}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                Optional Cover Image
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="file"
                  ref={coverInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleCoverSelected(e.target.files[0])}
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => coverInputRef.current?.click()}
                  style={{ flex: 1, padding: '0.6rem 0.8rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Image size={14} />
                  <span>{coverFile ? coverFile.name.slice(0, 16) + '...' : 'Choose Cover'}</span>
                </button>
                {coverPreview && (
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    style={{ width: 34, height: 38, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--color-emerald-light)' }}
                  />
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                Page Count (Optional)
              </label>
              <input
                type="number"
                min="1"
                className="form-input"
                placeholder="Auto-detected if empty"
                value={pageCount}
                onChange={(e) => setPageCount(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '0.88rem' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
                Publication Year
              </label>
              <input
                type="number"
                min="1900"
                max="2099"
                className="form-input"
                value={publishedYear}
                onChange={(e) => setPublishedYear(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '0.88rem' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>
              Description or Executive Summary
            </label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Brief overview of the book's topics and key takeaways..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.85rem', fontSize: '0.88rem', resize: 'vertical' }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '1.25rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ padding: '0.65rem 1.25rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{
                padding: '0.65rem 1.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, var(--color-emerald-light, #10b981) 0%, #059669 100%)',
                color: '#fff',
                fontWeight: 700
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                  <span>Uploading & Syncing to Drive...</span>
                </>
              ) : (
                <>
                  <Cloud size={16} />
                  <span>Upload & Sync with Drive</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
