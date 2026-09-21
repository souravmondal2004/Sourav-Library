import React from 'react';
import { BookOpen, Sparkles, BookmarkCheck, Shield, User, LogIn, Upload } from 'lucide-react';
import YoutubeIcon from '../common/YoutubeIcon';

export default function MobileBottomNav({
  currentView,
  currentSection = 'books',
  onSelectSection,
  onExplore,
  onOpenLibrary,
  onOpenUploadPdf,
  currentUser,
  isAdmin,
  onToggleAdmin,
  onOpenAuth,
  searchQuery
}) {
  const isBooksActive = currentView === 'home' && currentSection === 'books';
  const isVideosActive = currentSection === 'videos';
  const isAIActive = currentSection === 'ai';
  const isAdminActive = currentView === 'admin';

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <button
        type="button"
        className={`mobile-nav-item ${isBooksActive ? 'active' : ''}`}
        onClick={() => {
          onSelectSection && onSelectSection('books');
          onExplore();
        }}
      >
        <div className="mobile-nav-icon-box">
          <BookOpen size={19} strokeWidth={isBooksActive ? 2.5 : 2} />
        </div>
        <span className="mobile-nav-label">Books</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item video-nav-item ${isVideosActive ? 'active' : ''}`}
        onClick={() => onSelectSection && onSelectSection('videos')}
      >
        <div className="mobile-nav-icon-box">
          <YoutubeIcon size={20} color={isVideosActive ? '#ff0000' : 'currentColor'} />
        </div>
        <span className="mobile-nav-label">Videos</span>
      </button>

      {/* Upload button strictly for Admin */}
      {isAdmin && (
        <button
          type="button"
          className="mobile-nav-item"
          onClick={onOpenUploadPdf}
          title="Upload PDF Book (Admin Only)"
        >
          <div className="mobile-nav-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', borderRadius: '50%', padding: '2px' }}>
            <Upload size={18} strokeWidth={2.5} color="var(--color-emerald-light)" />
          </div>
          <span className="mobile-nav-label" style={{ color: 'var(--color-emerald-light)', fontWeight: 600 }}>Upload</span>
        </button>
      )}

      <button
        type="button"
        className={`mobile-nav-item ${isAIActive ? 'active' : ''}`}
        onClick={() => onSelectSection && onSelectSection('ai')}
      >
        <div className="mobile-nav-icon-box">
          <Sparkles size={19} color={isAIActive ? '#c084fc' : 'currentColor'} strokeWidth={isAIActive ? 2.5 : 2} />
        </div>
        <span className="mobile-nav-label">Sourav AI</span>
      </button>

      <button
        type="button"
        className="mobile-nav-item"
        onClick={onOpenLibrary}
      >
        <div className="mobile-nav-icon-box">
          <BookmarkCheck size={19} />
        </div>
        <span className="mobile-nav-label">Library</span>
      </button>

      {isAdmin && (
        <button
          type="button"
          className={`mobile-nav-item mobile-nav-admin ${isAdminActive ? 'active' : ''}`}
          onClick={onToggleAdmin}
        >
          <div className="mobile-nav-icon-box">
            <Shield size={20} strokeWidth={isAdminActive ? 2.5 : 2} />
          </div>
          <span className="mobile-nav-label">Admin</span>
        </button>
      )}

      {currentUser ? (
        <button
          type="button"
          className="mobile-nav-item"
          onClick={() => onOpenAuth('account')}
        >
          <div className="mobile-nav-icon-box">
            <div className="mobile-user-avatar">
              {currentUser.username ? currentUser.username.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
          <span className="mobile-nav-label">Profile</span>
        </button>
      ) : (
        <button
          type="button"
          className="mobile-nav-item"
          onClick={() => onOpenAuth('login')}
        >
          <div className="mobile-nav-icon-box">
            <LogIn size={20} />
          </div>
          <span className="mobile-nav-label">Sign In</span>
        </button>
      )}
    </nav>
  );
}
