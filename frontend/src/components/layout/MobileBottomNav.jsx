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
        title="Books & Documents"
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
        title="Video Lectures Hub"
      >
        <div className="mobile-nav-icon-box">
          <YoutubeIcon size={19} color={isVideosActive ? '#ffffff' : 'currentColor'} />
        </div>
        <span className="mobile-nav-label">Video Hub</span>
      </button>

      {/* Upload button strictly for Admin */}
      {isAdmin && (
        <button
          type="button"
          className="mobile-nav-item"
          onClick={onOpenUploadPdf}
          title="Upload Resource"
        >
          <div className="mobile-nav-icon-box" style={{ background: '#0d7751', borderRadius: '50%', color: '#fff', width: 28, height: 28 }}>
            <Upload size={16} strokeWidth={2.5} />
          </div>
          <span className="mobile-nav-label" style={{ color: '#0d7751', fontWeight: 700 }}>Upload</span>
        </button>
      )}

      <button
        type="button"
        className={`mobile-nav-item ${isAIActive ? 'active' : ''}`}
        onClick={() => onSelectSection && onSelectSection('ai')}
        title="NDLI AI Knowledge Assistant"
      >
        <div className="mobile-nav-icon-box">
          <Sparkles size={19} color={isAIActive ? '#ff9933' : 'currentColor'} strokeWidth={isAIActive ? 2.5 : 2} />
        </div>
        <span className="mobile-nav-label">AI Tutor</span>
      </button>

      <button
        type="button"
        className="mobile-nav-item"
        onClick={onOpenLibrary}
        title="Saved Bookshelf"
      >
        <div className="mobile-nav-icon-box">
          <BookmarkCheck size={19} />
        </div>
        <span className="mobile-nav-label">Bookshelf</span>
      </button>

      {isAdmin && (
        <button
          type="button"
          className={`mobile-nav-item mobile-nav-admin ${isAdminActive ? 'active' : ''}`}
          onClick={onToggleAdmin}
          title="Admin Control"
        >
          <div className="mobile-nav-icon-box">
            <Shield size={19} strokeWidth={isAdminActive ? 2.5 : 2} />
          </div>
          <span className="mobile-nav-label">Admin</span>
        </button>
      )}

      {currentUser ? (
        <button
          type="button"
          className="mobile-nav-item"
          onClick={() => onOpenAuth('account')}
          title="Profile & Settings"
        >
          <div className="mobile-nav-icon-box">
            <div className="mobile-user-avatar" style={{ width: 24, height: 24, fontSize: '0.7rem' }}>
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
          title="Sign in to your account"
        >
          <div className="mobile-nav-icon-box">
            <LogIn size={19} />
          </div>
          <span className="mobile-nav-label">Sign In</span>
        </button>
      )}
    </nav>
  );
}
