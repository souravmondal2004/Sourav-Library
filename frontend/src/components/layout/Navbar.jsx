import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Search, Shield, BookmarkCheck, User, LogOut, X, Compass, Upload, Sun, Moon, Globe, ChevronDown, Check, Sparkles } from 'lucide-react';
import YoutubeIcon from '../common/YoutubeIcon';
import { LANGUAGES } from '../../services/translations';

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
  onChangeFontScale,
  language = 'en',
  onSelectLanguage,
  t
}) {
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef(null);
  const isAdmin = currentUser && (currentUser.role === 'ROLE_ADMIN' || currentUser.role === 'ADMIN' || currentUser.username === 'Sourav' || currentUser.username === 'admin');

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <header className="header-wrapper">
      {/* 1. Gradient Accent Stripe (Navy & Deep Purple) */}
      <div className="ndli-top-stripe" />

      {/* 2. Utility Top Bar */}
      <div className="ndli-top-bar">
        <div className="container ndli-top-bar-inner">
          <div className="ndli-top-gov-info">
            <span className="ndli-top-gov-flag">
              📚 {t?.library || 'LIBRARY'}
            </span>
            <span style={{ opacity: 0.85 }}>
              {t?.brandTitle || "Sourav's Library"} • {t?.heroTagline || "Open Access Digital Repository"}
            </span>
          </div>

          <div className="ndli-top-tools">
            {/* Accessibility Font Sizing */}
            <div className="ndli-accessibility-group" title="Adjust text size">
              <button
                type="button"
                className={`ndli-font-btn ${fontScale === 'sm' ? 'active' : ''}`}
                onClick={() => onChangeFontScale && onChangeFontScale('sm')}
                title="Smaller text"
              >
                A-
              </button>
              <button
                type="button"
                className={`ndli-font-btn ${fontScale === 'md' ? 'active' : ''}`}
                onClick={() => onChangeFontScale && onChangeFontScale('md')}
                title="Default text"
              >
                A
              </button>
              <button
                type="button"
                className={`ndli-font-btn ${fontScale === 'lg' ? 'active' : ''}`}
                onClick={() => onChangeFontScale && onChangeFontScale('lg')}
                title="Larger text"
              >
                A+
              </button>
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              className="ndli-theme-toggle-btn"
              onClick={onToggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light Mode' : 'Dark Mode'}`}
            >
              {theme === 'dark' ? <Sun size={13} color="#fbbf24" /> : <Moon size={13} color="#94a3b8" />}
              <span>{theme === 'dark' ? t?.light || 'Light' : t?.dark || 'Dark'}</span>
            </button>

            {/* Language Dropdown (English, বাংলা, हिन्दी, اردو) */}
            <div className="lang-selector-wrapper" ref={langDropdownRef}>
              <button
                type="button"
                className="ndli-lang-btn"
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                title="Change language / ভাষা পরিবর্তন"
                aria-haspopup="true"
                aria-expanded={langDropdownOpen}
              >
                <Globe size={13} color="var(--color-purple, #a855f7)" />
                <span className="lang-current-label">
                  {currentLangObj.flag} {currentLangObj.native}
                </span>
                <ChevronDown size={11} style={{ transform: langDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {langDropdownOpen && (
                <div className="lang-dropdown-menu">
                  <div className="lang-dropdown-header">Select Language / ভাষা</div>
                  {LANGUAGES.map((langItem) => (
                    <button
                      key={langItem.code}
                      type="button"
                      className={`lang-option-item ${language === langItem.code ? 'selected' : ''}`}
                      onClick={() => {
                        onSelectLanguage && onSelectLanguage(langItem.code);
                        setLangDropdownOpen(false);
                      }}
                    >
                      <span className="lang-option-flag">{langItem.flag}</span>
                      <div className="lang-option-text">
                        <span className="lang-option-native">{langItem.native}</span>
                        <span className="lang-option-name">{langItem.name}</span>
                      </div>
                      {language === langItem.code && <Check size={14} className="lang-check-icon" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Server Status */}
            <span
              className={`server-status-pill ${serverOnline ? 'online' : 'offline'}`}
              title={serverOnline ? 'Connected to cloud services' : 'Services offline'}
            >
              <span className="status-dot"></span>
              {serverOnline ? (t?.live || 'Live') : (t?.offline || 'Offline')}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Navigation */}
      <nav className="navbar" aria-label="Main Navigation">
        <div className="container nav-wrapper">
          {/* Brand */}
          <div
            className="brand-logo"
            onClick={onExplore}
            title={`${t?.brandTitle || "Sourav's Library"} — Home`}
          >
            <div className="brand-crest">
              <BookOpen size={22} strokeWidth={2.4} />
            </div>
            <div className="brand-text-block">
              <span className="brand-title">
                {t?.brandTitle || "Sourav's Library"}<span className="brand-title-accent">.</span>
              </span>
              <span className="brand-subtitle">
                {t?.brandSubtitle || 'Digital Repository'}
              </span>
            </div>
          </div>

          {/* Section Switcher */}
          <div className="section-switcher-bar desktop-nav-only">
            <button
              type="button"
              className={`section-switch-btn ${currentSection === 'books' ? 'active' : ''}`}
              onClick={() => onSelectSection && onSelectSection('books')}
              title="Books & PDF Documents"
            >
              <BookOpen size={15} />
              <span>{t?.library || 'Library'}</span>
            </button>
            <button
              type="button"
              className={`section-switch-btn video-btn ${currentSection === 'videos' ? 'active' : ''}`}
              onClick={() => onSelectSection && onSelectSection('videos')}
              title="Video Lectures"
            >
              <YoutubeIcon size={15} color={currentSection === 'videos' ? '#ffffff' : 'currentColor'} />
              <span>{t?.videos || 'Videos'}</span>
            </button>
            <button
              type="button"
              className={`section-switch-btn ai-btn ${currentSection === 'ai' ? 'active' : ''}`}
              onClick={() => onSelectSection && onSelectSection('ai')}
              title="Sourav AI Knowledge Assistant"
            >
              <Sparkles size={14} color={currentSection === 'ai' ? '#ffffff' : '#c084fc'} />
              <span>Sourav AI</span>
            </button>
          </div>

          {/* Crisp, Sharp Desktop Search Bar (Fixed blur & sizing) */}
          <div className="search-bar-container desktop-nav-only">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder={t?.searchPlaceholder || "Search books, authors..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search repository"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Desktop Nav Actions */}
          <div className="nav-actions desktop-nav-only">
            <button
              className={`btn ${currentView === 'home' && !searchQuery && !selectedCategory ? 'btn-primary' : 'btn-outline'}`}
              onClick={onExplore}
              title="Browse all resources"
            >
              <Compass size={15} />
              <span>{t?.explore || 'Explore'}</span>
            </button>

            {currentUser && (
              <button
                className="btn btn-outline"
                onClick={onOpenLibrary}
                title="Your saved books"
              >
                <BookmarkCheck size={15} />
                <span>{t?.bookshelf || 'Bookshelf'}</span>
              </button>
            )}

            {isAdmin && (
              <button
                className="btn btn-primary"
                onClick={onOpenUploadPdf}
                title="Upload PDF (Admin)"
              >
                <Upload size={14} strokeWidth={2.5} />
                <span>{t?.upload || 'Upload'}</span>
              </button>
            )}

            {isAdmin && (
              <button
                className={`btn btn-admin ${currentView === 'admin' ? 'active-admin' : ''}`}
                onClick={() => setCurrentView(currentView === 'admin' ? 'home' : 'admin')}
                title="Admin Dashboard"
              >
                <Shield size={15} />
                <span>{t?.admin || 'Admin'}</span>
              </button>
            )}

            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '8px'
                }}>
                  <User size={14} color="var(--color-purple, #a855f7)" />
                  <span>{currentUser.username}</span>
                  {isAdmin && (
                    <span style={{
                      fontSize: '0.6rem',
                      background: 'var(--color-accent, #7c3aed)',
                      color: '#ffffff',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: 800,
                      letterSpacing: '0.5px'
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  className="btn btn-outline"
                  onClick={() => onOpenAuth('login')}
                >
                  {t?.signIn || 'Sign In'}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => onOpenAuth('register')}
                >
                  {t?.getStarted || 'Get Started'}
                </button>
              </div>
            )}
          </div>

          {/* Mobile Header Actions */}
          <div className="mobile-header-actions">
            {/* Quick Language Toggle on Mobile */}
            <button
              type="button"
              className="mobile-header-btn"
              onClick={() => {
                const order = ['en', 'bn', 'hi', 'ur'];
                const nextIdx = (order.indexOf(language) + 1) % order.length;
                onSelectLanguage && onSelectLanguage(order[nextIdx]);
              }}
              title={`Switch language: currently ${currentLangObj.native}`}
              aria-label="Change Language"
            >
              <span style={{ fontSize: '0.85rem' }}>{currentLangObj.flag}</span>
            </button>

            {/* Quick Mobile Theme Toggle */}
            <button
              type="button"
              className="mobile-header-btn"
              onClick={onToggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light Mode' : 'Dark Mode'}`}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={17} color="#fbbf24" /> : <Moon size={17} color="#94a3b8" />}
            </button>

            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div
                  className="mobile-user-avatar"
                  title={`${currentUser.username}`}
                  onClick={() => onOpenAuth('account')}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--color-accent, #7c3aed)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
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
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', borderRadius: '8px' }}
                onClick={() => onOpenAuth('login')}
              >
                {t?.signIn || 'Sign In'}
              </button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
