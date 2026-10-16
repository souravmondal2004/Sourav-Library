import React from 'react';
import { BookOpen, Bookmark, Eye, Download, FileText, Trash2, CheckCircle2 } from 'lucide-react';
import { api, getStoredUser } from '../../services/api';

// Global in-memory cache for cover image load state
const coverStatusCache = new Map();

export default function BookCard({ book, onRead, onToggleBookmark, isBookmarked, onDelete, currentUser, onRequireAuth }) {
  const cachedStatus = coverStatusCache.get(book.id);
  const [hasCoverImg, setHasCoverImg] = React.useState(cachedStatus === 'loaded');
  const [coverFailed, setCoverFailed] = React.useState(cachedStatus === 'failed');
  const [downloading, setDownloading] = React.useState(false);

  const handleDownloadClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    const user = currentUser || getStoredUser();
    if (!user) {
      if (onRequireAuth) {
        onRequireAuth('login');
      } else {
        window.dispatchEvent(new CustomEvent('scribd-open-auth', { detail: 'login' }));
      }
      return;
    }

    setDownloading(true);
    try {
      await api.documents.download(book);
    } catch (err) {
      if (err.message && err.message.includes('sign in')) {
        if (onRequireAuth) {
          onRequireAuth('login');
        } else {
          window.dispatchEvent(new CustomEvent('scribd-open-auth', { detail: 'login' }));
        }
      } else {
        alert('Download failed: ' + err.message);
      }
    } finally {
      setDownloading(false);
    }
  };

  // Authoritative institutional background palettes (NDLI government library style)
  const institutionalGradients = [
    'linear-gradient(135deg, #002147 0%, #0b3056 100%)', // Indian Gov / NDLI Navy
    'linear-gradient(135deg, #064e3b 0%, #0d7751 100%)', // Forest Academic Green
    'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', // Deep Oxford Blue
    'linear-gradient(135deg, #451a03 0%, #78350f 100%)', // Warm Cedar / Archive Amber
    'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', // Classical Slate
    'linear-gradient(135deg, #701a75 0%, #4a044e 100%)'  // Royal Scholarly Plum
  ];
  const bgGradient = institutionalGradients[(book.id || 1) % institutionalGradients.length];

  const handleImageLoad = () => {
    coverStatusCache.set(book.id, 'loaded');
    setHasCoverImg(true);
  };

  const handleImageError = () => {
    coverStatusCache.set(book.id, 'failed');
    setCoverFailed(true);
  };

  return (
    <div className="book-card">
      <div className="book-card-cover-container" style={{ background: bgGradient }}>
        {!coverFailed && (
          <img
            src={api.documents.getCoverUrl(book.id)}
            alt={book.title}
            className="book-card-cover-img"
            loading="lazy"
            decoding="async"
            fetchpriority="low"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
              opacity: hasCoverImg ? 1 : 0,
              transition: 'opacity 0.3s ease',
              zIndex: 1
            }}
          />
        )}

        {book.isFeatured && (
          <span className="book-badge-featured">SPOTLIGHT</span>
        )}

        {/* Academic Open Access Tag */}
        <span className="book-card-format-tag">
          OPEN ACCESS PDF
        </span>

        {/* Fallback procedural academic book cover (Realistic human-crafted typography) */}
        <div className="book-card-procedural-cover" style={{ display: hasCoverImg ? 'none' : 'flex' }}>
          <div className="book-card-procedural-spine" />
          <div>
            <div className="book-card-procedural-tag">
              {book.categoryName || 'National Repository'}
            </div>
            <div className="book-card-procedural-title">
              {book.title}
            </div>
            <div className="book-card-procedural-author">
              by {book.author}
            </div>
          </div>
          <div className="book-card-procedural-footer">
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={12} color="#6ee7b7" /> Verified Text
            </span>
            <span>{book.publishedYear || 2026}</span>
          </div>
        </div>

        {/* Quick Read Overlay */}
        <div className="book-card-overlay" onClick={() => onRead(book)}>
          <button type="button" className="book-card-read-btn">
            <BookOpen size={16} /> Read Document
          </button>
        </div>

        {/* Bookmark Action Pill */}
        <button
          type="button"
          className={`book-card-bookmark-btn ${isBookmarked ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark(book.id);
          }}
          title={isBookmarked ? 'Remove from Bookshelf' : 'Save to Bookshelf'}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this resource'}
        >
          <Bookmark size={15} fill={isBookmarked ? '#ffffff' : 'none'} color={isBookmarked ? '#ffffff' : '#002147'} />
        </button>
      </div>

      <div className="book-card-body">
        <span className="book-card-category">{book.categoryName || 'General Academic'}</span>
        <h3 className="book-card-title" title={book.title} onClick={() => onRead(book)}>
          {book.title}
        </h3>
        <p className="book-card-author">by {book.author}</p>

        {/* Quick Actions (Read + Download) */}
        <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1, padding: '0.45rem', fontSize: '0.82rem' }}
            onClick={() => onRead(book)}
            title="Read online in PDF reader"
          >
            <BookOpen size={14} />
            <span>Read Online</span>
          </button>
          <button
            type="button"
            className="btn btn-outline"
            style={{
              padding: '0.45rem 0.65rem',
              color: 'var(--color-ndli-navy)',
              borderColor: 'var(--border-input)',
              background: 'var(--bg-main)'
            }}
            onClick={handleDownloadClick}
            disabled={downloading}
            title={currentUser ? 'Download PDF to device' : 'Sign in to download'}
          >
            <Download size={14} className={downloading ? 'animate-bounce' : ''} />
          </button>
          {onDelete && (
            <button
              type="button"
              className="btn btn-outline"
              style={{
                padding: '0.45rem 0.65rem',
                borderColor: '#fca5a5',
                color: '#dc2626',
                background: '#fef2f2'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(book.id, book.title);
              }}
              title="Delete Document (Admin)"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Metadata Footer */}
        <div className="book-card-meta">
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Eye size={13} color="var(--color-ndli-green)" /> {book.viewCount || 0} Reads
          </span>
          <span>{book.pageCount ? `${book.pageCount} Pages` : 'Full Text'}</span>
          <span>Year: {book.publishedYear || 2026}</span>
        </div>
      </div>
    </div>
  );
}
