import React from 'react';
import { BookOpen, Bookmark, Eye, Download, FileText } from 'lucide-react';
import { api } from '../../services/api';

export default function BookCard({ book, onRead, onToggleBookmark, isBookmarked }) {
  // Deep jewel tone gradient covers tailored to the obsidian aesthetic
  const gradients = [
    'linear-gradient(145deg, #09261e 0%, #064e3b 100%)', // Emerald Deep
    'linear-gradient(145deg, #0c1a30 0%, #1e3a8a 100%)', // Midnight Sapphire
    'linear-gradient(145deg, #1f1033 0%, #581c87 100%)', // Royal Amethyst
    'linear-gradient(145deg, #2b110a 0%, #7c2d12 100%)', // Amber Cognac
    'linear-gradient(145deg, #08282b 0%, #115e59 100%)', // Deep Teal
    'linear-gradient(145deg, #2a0b1c 0%, #831843 100%)'  // Ruby Wine
  ];
  const bgGradient = gradients[(book.id || 1) % gradients.length];

  return (
    <div className="book-card">
      <div className="book-card-cover-container" style={{ background: bgGradient }}>
        {book.coverImagePath ? (
          <img
            src={api.documents.getCoverUrl(book.id)}
            alt={book.title}
            className="book-card-cover-img"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ) : null}

        {book.isFeatured && (
          <span className="book-badge-featured">FEATURED</span>
        )}

        {/* Dynamic visual book spine & title */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <FileText size={22} color="var(--color-emerald-light)" style={{ marginBottom: '0.5rem', opacity: 0.9 }} />
          <h4 style={{
            color: '#ffffff',
            fontSize: '0.98rem',
            fontWeight: 700,
            lineHeight: 1.3,
            marginBottom: '0.3rem',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.6)'
          }}>
            {book.title}
          </h4>
          <p style={{
            color: '#94a3b8',
            fontSize: '0.78rem',
            fontWeight: 500,
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)'
          }}>
            {book.author}
          </p>
        </div>
      </div>

      <div className="book-card-body">
        <span className="book-card-category">{book.categoryName}</span>
        <h3 className="book-card-title" title={book.title}>{book.title}</h3>
        <p className="book-card-author">by {book.author}</p>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '0.85rem' }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1, padding: '0.45rem', fontSize: '0.82rem' }}
            onClick={() => onRead(book)}
          >
            <BookOpen size={14} />
            Read Now
          </button>
          <button
            className="btn btn-outline"
            style={{ padding: '0.45rem', width: 38 }}
            onClick={() => onToggleBookmark(book.id)}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark book'}
          >
            <Bookmark
              size={15}
              fill={isBookmarked ? 'var(--color-gold)' : 'transparent'}
              color={isBookmarked ? 'var(--color-gold)' : 'currentColor'}
            />
          </button>
        </div>

        <div className="book-card-meta">
          <span>{book.pageCount || 1} pages</span>
          <span>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Eye size={12} color="var(--color-emerald-light)" /> {book.viewCount || 0}
          </span>
          <span style={{ marginLeft: 'auto' }}>
            <a
              href={api.documents.getDownloadUrl(book.id)}
              download
              title="Download PDF"
              style={{ color: 'var(--text-muted)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <Download size={13} />
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
