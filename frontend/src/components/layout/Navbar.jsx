import React from 'react';
import { BookOpen, Search, Shield, BookmarkCheck, User, LogOut, X, Sparkles, Compass, Upload, Sun, Moon, Globe } from 'lucide-react';
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
  onQuickAdminLogin,
  theme = 'light',
  onToggleTheme,
  fontScale = 'md',
  onChangeFontScale
}) {
  const isAdmin = currentUser && (currentUser.role === 'ROLE_ADMIN' || currentUser.role === 'ADMIN' || currentUser.username === 'Sourav' || currentUser.username === 'admin');

  return (
    <header className="header-wrapper">
      {/* 1. Indian Tricolor Top Stripe */}
      <div className="ndli-top-stripe" />

      {/* 2. Government & NDLI Standard Utility Bar */}
      <div className="ndli-top-bar">
        <div className="container ndli-top-bar-inner">
          <div className="ndli-top-gov-info">
            <span className="ndli-top-gov-flag">
              🇮🇳 GOVT OF INDIA
            </span>
            <span style={{ opacity: 0.9 }}>
              Ministry of Education • National Digital Learning Mission • Sourav's Library Repository
            </span>
          </div>

          <div className="ndli-top-tools">
            {/* Accessibility Font Sizing (NDLI Standard UX4G) */}
            <div className="ndli-accessibility-group" title="Adjust text size for enhanced accessibility">
              <button
                type="button"
                className={`ndli-font-btn ${fontScale === 'sm' ? 'active' : ''}`}
                onClick={() => onChangeFontScale && onChangeFontScale('sm')}
                title="Decrease font size"
              >
                A-
              </button>
              <button
                type="button"
                className={`ndli-font-btn ${fontScale === 'md' ? 'active' : ''}`}
                onClick={() => onChangeFontScale && onChangeFontScale('md')}
                title="Default font size"
              >
                A
              </button>
              <button
                type="button"
                className={`ndli-font-btn ${fontScale === 'lg' ? 'active' : ''}`}
                onClick={() => onChangeFontScale && onChangeFontScale('lg')}
                title="Increase font size"
              >
                A+
              </button>
            </div>

            {/* High-Contrast / Dark Mode Toggle */}
            <button
              type="button"
              className="ndli-theme-toggle-btn"
              onClick={onToggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Standard Light Mode' : 'High Contrast Dark Mode'}`}
            >
              {theme === 'dark' ? <Sun size={13} color="#f59e0b" /> : <Moon size={13} color="#cbd5e1" />}
              <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
            </button>

            {/* Regional Languages Pill */}
            <div className="ndli-lang-pill" title="National Digital Library supports multi-lingual learning resources">
              <Globe size={13} color="#38bdf8" />
              <span>English / हिन्दी / বাংলা</span>
            </div>

            {/* Live Server Health Pill */}
            <span
              className={`server-status-pill ${serverOnline ? 'online' : 'offline'}`}
              title={serverOnline ? 'Live Repository Service (Connected to Spring Boot & Database)' : 'Repository Offline'}
            >
              <span className="status-dot"></span>
              {serverOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Institutional Navigation Bar */}
      <nav className="navbar" aria-label="Main Navigation">
        <div className="container nav-wrapper">
          {/* Brand Logo & NDLI Crest */}
          <div
            className="brand-logo"
            onClick={onExplore}
            title="National Digital Repository - Home"
          >
            <div className="brand-crest">
              <BookOpen size={22} strokeWidth={2.5} />
            </div>
            <div className="brand-text-block">
              <span className="brand-title">
                Sourav's Library<span className="brand-title-accent">.</span>
              </span>
              <span className="brand-subtitle">
                National Digital Repository (NDLI Standard)
              </span>
            </div>
          </div>

          {/* 3-Section Switcher Tabs */}
          <div className="section-switcher-bar desktop-nav-only">
            <button
              type="button"
              className={`section-switch-btn ${currentSection === 'books' ? 'active' : ''}`}
              onClick={() => onSelectSection && onSelectSection('books')}
              title="Academic Books, Theses & PDF Documents"
            >
              <BookOpen size={15} />
              <span>Books & PDFs</span>
            </button>
            <button
              type="button"
              className={`section-switch-btn video-btn ${currentSection === 'videos' ? 'active' : ''}`}
              onClick={() => onSelectSection && onSelectSection('videos')}
              title="Curated Video Lectures & NPTEL/Swayam Hub"
            >
              <YoutubeIcon size={15} color={currentSection === 'videos' ? '#ffffff' : 'currentColor'} />
              <span>Video Hub</span>
            </button>
            <button
              type="button"
              className={`section-switch-btn ai-btn ${currentSection === 'ai' ? 'active' : ''}`}
              onClick={() => onSelectSection && onSelectSection('ai')}
              title="Sourav AI - NDLI Knowledge Tutor"
            >
              <Sparkles size={14} color={currentSection === 'ai' ? '#ffffff' : '#38bdf8'} />
              <span>NDLI AI Tutor</span>
            </button>
          </div>

          {/* Compact Nav Search (Desktop) */}
          <div className="search-bar-container">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by title, author, or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Navigation Actions (Desktop) */}
          <div className="nav-actions desktop-nav-only">
            <button
              className={`btn ${currentView === 'home' && !searchQuery && !selectedCategory ? 'btn-primary' : 'btn-outline'}`}
              onClick={onExplore}
              title="Browse all educational resources and collections"
            >
              <Compass size={15} />
              <span>Explore</span>
            </button>

            {currentUser && (
              <button
                className="btn btn-outline"
                onClick={onOpenLibrary}
                title="View your saved bookshelf and reading history"
              >
                <BookmarkCheck size={15} />
                <span>My Bookshelf</span>
              </button>
            )}

            {/* Admin PDF Upload Button */}
            {isAdmin && (
              <button
                className="btn btn-primary"
                onClick={onOpenUploadPdf}
                style={{
                  background: 'var(--color-ndli-green)',
                  borderColor: 'var(--color-ndli-green-dark)',
                  fontWeight: 700
                }}
                title="Contribute / Upload PDF Resource (Admin Only)"
              >
                <Upload size={14} strokeWidth={2.5} />
                <span>+ Upload</span>
              </button>
            )}

            {/* Admin Channel Console */}
            {isAdmin && (
              <button
                className={`btn btn-admin ${currentView === 'admin' ? 'active-admin' : ''}`}
                onClick={() => setCurrentView(currentView === 'admin' ? 'home' : 'admin')}
                title="Open Administrative Repository Studio"
              >
                <Shield size={15} />
                <span>Admin Studio</span>
              </button>
            )}

            {/* User Auth Info */}
            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '0.4rem 0.75rem',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <User size={14} color="#6ee7b7" />
                  <span>{currentUser.username}</span>
                  {isAdmin && (
                    <span style={{
                      fontSize: '0.62rem',
                      background: '#d97706',
                      color: '#ffffff',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontWeight: 800
                    }}>
                      ADMIN
                    </span>
                  )}
                </div>
                <button
                  className="btn btn-outline"
                  onClick={onLogout}
                  title="Sign Out"
                  style={{ padding: '0.5rem' }}
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <button
                  className="btn btn-outline"
                  onClick={() => onOpenAuth('login')}
                >
                  Sign In
                </button>
                <button
                  className="btn btn-accent"
                  onClick={() => onOpenAuth('register')}
                >
                  Register Free
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
                  title="Sign Out"
                  style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                className="btn btn-primary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                onClick={() => onOpenAuth('login')}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
