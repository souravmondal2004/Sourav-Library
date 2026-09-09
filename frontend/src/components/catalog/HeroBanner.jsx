import React from 'react';
import { Sparkles, BookOpen, Eye, ArrowRight, Bookmark } from 'lucide-react';
import { api } from '../../services/api';

export default function HeroBanner({ featuredBook, onReadBook, onToggleBookmark, isBookmarked }) {
  if (!featuredBook) {
    return (
      <section className="hero-section">
        <div className="container hero-content">
          <div>
            <div className="hero-tag">
              <Sparkles size={14} /> Lumina Digital Archive
            </div>
            <h1 className="hero-title">
              Knowledge Crafted for <span className="hero-title-highlight">Forward Thinkers.</span>
            </h1>
            <p className="hero-desc">
              Curated books, research publications, and technical blueprints. Streamed directly with instant byte-range precision, backed by enterprise Oracle persistence.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="hero-section">
      <div className="container hero-content">
        <div>
          <div className="hero-tag">
            <Sparkles size={14} /> Spotlight Publication
          </div>
          <h1 className="hero-title">
            <span className="hero-title-highlight">{featuredBook.title}</span>
          </h1>
          <p style={{ color: 'var(--color-emerald-light)', fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.85rem' }}>
            By {featuredBook.author} • {featuredBook.categoryName}
          </p>
          <p className="hero-desc">
            {featuredBook.description || 'Immerse yourself in this curated publication. Seamlessly stream with high-fidelity rendering, responsive zoom, night mode, and bookmarking.'}
          </p>
          <div className="hero-buttons" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              style={{ padding: '0.8rem 1.8rem', fontSize: '1rem' }}
              onClick={() => onReadBook(featuredBook)}
            >
              <BookOpen size={18} />
              Read Document
            </button>
            <button
              className="btn btn-outline"
              style={{ padding: '0.8rem 1.4rem' }}
              onClick={() => onToggleBookmark(featuredBook.id)}
            >
              <Bookmark
                size={18}
                fill={isBookmarked ? 'var(--color-gold)' : 'transparent'}
                color={isBookmarked ? 'var(--color-gold)' : '#ffffff'}
              />
              {isBookmarked ? 'Saved to Library' : 'Save for Later'}
            </button>
          </div>
        </div>

        {/* Hero Card Preview */}
        <div className="hero-featured-card">
          <div style={{
            width: 145,
            height: 200,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #0e1626, #162238)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '1.2rem',
            color: '#fff',
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.5)',
            flexShrink: 0
          }}>
            <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--color-emerald-light)', fontWeight: 800 }}>
              FULL PDF
            </span>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.3, color: '#ffffff' }}>
              {featuredBook.title}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {featuredBook.pageCount || 1} Pages
            </span>
          </div>

          <div>
            <span style={{
              display: 'inline-block',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--color-emerald-light)',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 6,
              marginBottom: '0.6rem'
            }}>
              {featuredBook.categoryName}
            </span>
            <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 700 }}>
              Live Streaming Engine
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1rem' }}>
              HTTP 206 chunked byte-range architecture serves high-resolution documents with zero initial delay.
            </p>
            <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Eye size={14} color="var(--color-emerald-light)" /> {featuredBook.viewCount || 0} Reads
              </span>
              <span>Year: {featuredBook.publishedYear || 2026}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
