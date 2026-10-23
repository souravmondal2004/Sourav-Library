import React from 'react';
import { BookOpen, Bookmark, Eye, Download, Trash2, CheckCircle2, ExternalLink } from 'lucide-react';
import { api, getStoredUser } from '../../services/api';

// Global in-memory cache for cover image load state
const coverStatusCache = new Map();

export default function BookCard({ book, onRead, onOpenInDrive, onToggleBookmark, isBookmarked, onDelete, currentUser, onRequireAuth, t }) {
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

  // Modern American Navy / Dark Gradients for procedural fallback covers
  const coverGradients = [
    'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', // Deep Navy to Royal Blue
    'linear-gradient(135deg, #090d16 0%, #1e293b 100%)', // Midnight Black to Slate
    'linear-gradient(135deg, #172554 0%, #1d4ed8 100%)', // Electric Sapphire
    'linear-gradient(135deg, #030712 0%, #111827 100%)', // Pure Charcoal Black
    'linear-gradient(135deg, #0f2027 0%, #203a43 100%)', // Dark Cyan Petrol
    'linear-gradient(135deg, #18181b 0%, #27272a 100%)'  // Modern Zinc
  ];
  const bgGradient = coverGradients[(book.id || 1) % coverGradients.length];

  const handleImageLoad = () => {
    coverStatusCache.set(book.id, 'loaded');
    setHasCoverImg(true);
  };

  const handleImageError = () => {
    coverStatusCache.set(book.id, 'failed');
    setCoverFailed(true);
  };

  return (
    <div className="book-card" onClick={() => onRead(book)}>
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
          <span className="book-badge-featured">{t?.featured || 'FEATURED'}</span>
        )}

        {/* Format Tag */}
        <span className="book-card-format-tag">
          PDF
        </span>

        {/* Fallback procedural cover */}
        <div className="book-card-procedural-cover" style={{ display: hasCoverImg ? 'none' : 'flex' }}>
          <div className="book-card-procedural-spine" />
          <div>
            <div className="book-card-procedural-tag">
              {book.categoryName || 'Digital Library'}
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
              <CheckCircle2 size={12} color="#60a5fa" /> {t?.verifiedPdf || 'Verified PDF'}
            </span>
            <span>{book.publishedYear || 2026}</span>
          </div>
        </div>

        {/* Quick Read Overlay (Desktop Hover) */}
        <div className="book-card-overlay">
          <button type="button" className="book-card-read-btn">
            <BookOpen size={16} /> {t?.readNow || 'Read Now'}
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
          title={isBookmarked ? (t?.removeFromBookshelf || 'Remove Bookmark') : (t?.saveToBookshelf || 'Save to Bookshelf')}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this book'}
        >
          <Bookmark
            size={16}
            strokeWidth={2.4}
            fill={isBookmarked ? '#ffffff' : 'transparent'}
            color={isBookmarked ? '#ffffff' : '#0f172a'}
          />
        </button>
      </div>

      <div className="book-card-body" onClick={(e) => e.stopPropagation()}>
        <span className="book-card-category">{book.categoryName || 'General'}</span>
        <h3 className="book-card-title" title={book.title} onClick={() => onRead(book)}>
          {book.title}
        </h3>
        <p className="book-card-author">by {book.author}</p>

        {/* Actions (Read + Drive + Download) */}
        <div className="book-card-actions">
          <button
            type="button"
            className="btn btn-primary book-read-action-btn"
            onClick={() => onRead(book)}
            title="Read in PDF Reader"
          >
            <BookOpen size={14} />
            <span>{t?.readOnline || 'Read'}</span>
          </button>
          <button
            type="button"
            className="btn btn-outline book-drive-action-btn"
            onClick={(e) => {
              if (onOpenInDrive) {
                onOpenInDrive(book, e);
              } else {
                e.stopPropagation();
                const dUrl = book.googleDriveUrl || api.documents.getDriveViewUrl(book.id);
                window.open(dUrl, '_blank', 'noopener,noreferrer');
              }
            }}
            title="Open directly in Google Drive"
          >
            <ExternalLink size={14} />
            <span>Drive</span>
          </button>
          <button
            type="button"
            className="btn btn-outline book-dl-action-btn"
            onClick={handleDownloadClick}
            disabled={downloading}
            title={currentUser ? 'Download PDF to device' : 'Sign in to download'}
          >
            <Download size={14} className={downloading ? 'animate-bounce' : ''} />
          </button>
          {onDelete && (
            <button
              type="button"
              className="btn btn-outline book-del-action-btn"
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
            <Eye size={12} color="var(--color-accent)" /> {book.viewCount || 0}
          </span>
          <span>{book.pageCount ? `${book.pageCount} ${t?.pages || 'pgs'}` : 'PDF'}</span>
          <span>{book.publishedYear || 2026}</span>
        </div>
      </div>
    </div>
  );
}
