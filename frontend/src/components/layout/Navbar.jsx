import React from 'react';
import { BookOpen, Search, Shield, BookmarkCheck, User, LogOut, X, Sparkles } from 'lucide-react';

export default function Navbar({
  currentUser,
  currentView,
  setCurrentView,
  searchQuery,
  setSearchQuery,
  onOpenAuth,
  onOpenLibrary,
  onLogout,
  onQuickAdminLogin
}) {
  const isAdmin = currentUser && currentUser.role === 'ROLE_ADMIN';

  return (
    <header className="navbar">
      <div className="container nav-wrapper">
        {/* Brand */}
        <div
          className="brand-logo"
          style={{ cursor: 'pointer' }}
          onClick={() => setCurrentView('home')}
        >
          <div className="brand-icon-box">
            <BookOpen size={22} strokeWidth={2.5} />
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}>
            Lumina<span style={{ color: 'var(--color-emerald-light)' }}>.</span>
          </span>
          <span className="brand-badge">Oracle Edition</span>
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

        {/* Navigation & Controls */}
        <div className="nav-actions">
          <button
            className={`btn ${currentView === 'home' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setCurrentView('home')}
          >
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
                onClick={onOpenAuth}
              >
                Sign In
              </button>
              <button
                className="btn btn-primary"
                onClick={onOpenAuth}
              >
                Join Free
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
