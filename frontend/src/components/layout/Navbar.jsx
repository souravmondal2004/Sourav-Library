import React from 'react';
import { BookOpen, Search, Shield, BookmarkCheck, User, LogOut, X, Sparkles, Compass, Tv, Video, Upload } from 'lucide-react';
import YoutubeIcon from '../common/YoutubeIcon';

export default function Navbar({
  currentUser,
  currentView,
  setCurrentView,
  currentSection = 'books',
  onSelectSection,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  serverOnline = true,
  onExplore,
  onOpenAuth,
  onOpenLibrary,
  onOpenUploadPdf,
  onLogout,
  onQuickAdminLogin
}) {
  const isAdmin = currentUser && (currentUser.role === 'ROLE_ADMIN' || currentUser.role === 'ADMIN' || currentUser.username === 'Sourav' || currentUser.username === 'admin');

  return (
    <header className="navbar">
      <div className="container nav-wrapper">
        {/* Brand */}
        <div
          className="brand-logo"
          style={{ cursor: 'pointer' }}
          onClick={onExplore}
        >
          <div className="brand-icon-box">
            <BookOpen size={22} strokeWidth={2.5} />
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}>
            Lumina<span style={{ color: 'var(--color-emerald-light)' }}>.</span>
          </span>
          <span className="brand-badge">Oracle Edition</span>
          <span
            className={`server-status-pill ${serverOnline ? 'online' : 'offline'}`}
            title={serverOnline ? 'Connected to local Spring Boot & Oracle database' : 'Backend is offline. Double-click start-all.bat to connect.'}
          >
            <span className="status-dot"></span>
            {serverOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* 3-Section Switcher Tabs */}
        <div className="section-switcher-bar desktop-nav-only">
          <button
            type="button"
            className={`section-switch-btn ${currentSection === 'books' ? 'active' : ''}`}
            onClick={() => onSelectSection && onSelectSection('books')}
            title="Scribd Digital Library & PDF Reader"
          >
            <BookOpen size={14} />
            <span>Books & PDFs</span>
          </button>
          <button
            type="button"
            className={`section-switch-btn video-btn ${currentSection === 'videos' ? 'active' : ''}`}
            onClick={() => onSelectSection && onSelectSection('videos')}
            title="YouTube & Uploaded Video Streaming Hub"
          >
            <YoutubeIcon size={15} color={currentSection === 'videos' ? '#ff0000' : 'currentColor'} />
            <span>Video Hub</span>
          </button>
          <button
            type="button"
            className={`section-switch-btn ai-btn ${currentSection === 'ai' ? 'active' : ''}`}
            onClick={() => onSelectSection && onSelectSection('ai')}
            title="Sourav AI Chatbot (Gemini Powered)"
          >
            <Sparkles size={14} color={currentSection === 'ai' ? '#c084fc' : 'currentColor'} />
            <span>Sourav AI</span>
          </button>
        </div>

        {/* Search */}
        <div className="search-bar-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search books, authors, research papers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '0.9rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Navigation & Controls (Desktop) */}
        <div className="nav-actions desktop-nav-only">
          <button
            className={`btn ${currentView === 'home' && !searchQuery && !selectedCategory ? 'btn-primary' : 'btn-outline'}`}
            onClick={onExplore}
            title="Browse all publications and categories"
          >
            <Compass size={16} />
            Explore
          </button>

          {currentUser && (
            <button
              className="btn btn-outline"
              onClick={onOpenLibrary}
            >
              <BookmarkCheck size={16} />
              My Library
            </button>
          )}

          {/* Admin PDF Upload Button - Strictly for Admin (Sourav) */}
          {isAdmin && (
            <button
              className="btn btn-primary"
              onClick={onOpenUploadPdf}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.84rem',
                padding: '0.45rem 0.95rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Upload PDF book or document (Admin Only)"
            >
              <Upload size={15} strokeWidth={2.5} />
              <span>+ Upload PDF</span>
            </button>
          )}

          {/* Dedicated Admin Channel Button - STRICTLY FOR ADMIN ONLY */}
          {isAdmin && (
            <button
              className={`btn btn-admin ${currentView === 'admin' ? 'active-admin' : ''}`}
              onClick={() => setCurrentView(currentView === 'admin' ? 'home' : 'admin')}
              title="Admin Control & Upload Channel"
            >
              <Shield size={16} />
              <span>Admin Channel</span>
              <span style={{
                background: '#10b981',
                color: '#080c16',
                fontSize: '0.65rem',
                padding: '1px 6px',
                borderRadius: '10px',
                fontWeight: 800
              }}>
                ACTIVE
              </span>
            </button>
          )}

          {/* User Auth Info */}
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#ffffff',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-card)',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)'
              }}>
                <User size={15} color="var(--color-emerald-light)" />
                <span>{currentUser.username}</span>
                {isAdmin && (
                  <span style={{
                    fontSize: '0.65rem',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#080c16',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 800
                  }}>ADMIN</span>
                )}
              </div>
              <button
                className="btn btn-outline"
                onClick={onLogout}
                title="Log Out"
                style={{ padding: '0.55rem' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className="btn btn-outline"
                onClick={() => onOpenAuth('login')}
              >
                Sign In
              </button>
              <button
                className="btn btn-primary"
                onClick={() => onOpenAuth('register')}
              >
                Join Free
              </button>
            </div>
          )}
        </div>

        {/* Mobile Header Quick Actions */}
        <div className="mobile-header-actions">
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div
                className="mobile-user-avatar"
                title={`${currentUser.username} (${currentUser.role})`}
                onClick={() => onOpenAuth('account')}
              >
                {currentUser.username ? currentUser.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <button
                className="btn btn-outline"
                onClick={onLogout}
                title="Log Out"
                style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary"
              style={{ padding: '0.38rem 0.75rem', fontSize: '0.78rem' }}
              onClick={() => onOpenAuth('login')}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
