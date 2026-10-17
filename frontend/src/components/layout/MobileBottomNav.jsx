import React from 'react';
import { BookOpen, Compass, BookmarkCheck, Shield, User, LogIn, Sparkles } from 'lucide-react';
import YoutubeIcon from '../common/YoutubeIcon';

export default function MobileBottomNav({
  currentView,
  currentSection = 'books',
  onSelectSection,
  onExplore,
  onOpenLibrary,
  currentUser,
  isAdmin,
  onToggleAdmin,
  onOpenAuth,
  t
}) {
  const isBooksActive = currentView === 'home' && currentSection === 'books';
  const isVideosActive = currentView === 'home' && currentSection === 'videos';
  const isAIActive = currentView === 'home' && currentSection === 'ai';
  const isAdminActive = currentView === 'admin';

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      {/* 1. Books / Library */}
      <button
        type="button"
        className={`mobile-nav-item ${isBooksActive ? 'active' : ''}`}
        onClick={() => {
          if (currentView !== 'home') onExplore();
          onSelectSection && onSelectSection('books');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        title={t?.navLibrary || "Books & Library"}
      >
        <div className="mobile-nav-icon-box">
          <BookOpen size={20} strokeWidth={isBooksActive ? 2.5 : 1.8} />
          {isBooksActive && <span className="mobile-nav-indicator" />}
        </div>
        <span className="mobile-nav-label">{t?.navLibrary || 'Library'}</span>
      </button>

      {/* 2. Video Lectures Hub */}
      <button
        type="button"
        className={`mobile-nav-item video-nav-item ${isVideosActive ? 'active' : ''}`}
        onClick={() => {
          if (currentView !== 'home') onExplore();
          onSelectSection && onSelectSection('videos');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        title={t?.navVideos || "Video Lectures"}
      >
        <div className="mobile-nav-icon-box">
          <YoutubeIcon size={20} color={isVideosActive ? 'var(--color-accent, #7c3aed)' : 'currentColor'} />
          {isVideosActive && <span className="mobile-nav-indicator" />}
        </div>
        <span className="mobile-nav-label">{t?.navVideos || 'Videos'}</span>
      </button>

      {/* 3. Center Highlight: Sourav AI */}
      <button
        type="button"
        className={`mobile-nav-item mobile-nav-ai ${isAIActive ? 'active' : ''}`}
        onClick={() => {
          if (currentView !== 'home') onExplore();
          onSelectSection && onSelectSection('ai');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        title="Sourav AI Assistant"
      >
        <div className="mobile-nav-ai-pill">
          <Sparkles size={18} strokeWidth={2.4} />
          <span className="mobile-nav-ai-label">Sourav AI</span>
        </div>
      </button>

      {/* 4. Saved Bookshelf */}
      <button
        type="button"
        className="mobile-nav-item"
        onClick={onOpenLibrary}
        title={t?.navSaved || "Saved Bookshelf"}
      >
        <div className="mobile-nav-icon-box">
          <BookmarkCheck size={20} strokeWidth={1.8} />
        </div>
        <span className="mobile-nav-label">{t?.navSaved || 'Saved'}</span>
      </button>

      {/* 5. Admin or Account Profile */}
      {isAdmin ? (
        <button
          type="button"
          className={`mobile-nav-item ${isAdminActive ? 'active' : ''}`}
          onClick={onToggleAdmin}
          title={t?.navAdmin || "Admin Dashboard"}
        >
          <div className="mobile-nav-icon-box">
            <Shield size={20} strokeWidth={isAdminActive ? 2.5 : 1.8} />
            {isAdminActive && <span className="mobile-nav-indicator" />}
          </div>
          <span className="mobile-nav-label">{t?.navAdmin || 'Admin'}</span>
        </button>
      ) : currentUser ? (
        <button
          type="button"
          className="mobile-nav-item"
          onClick={() => onOpenAuth('account')}
          title={t?.navAccount || "Account Profile"}
        >
          <div className="mobile-nav-icon-box">
            <div className="mobile-avatar-badge">
              {currentUser.username ? currentUser.username.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
          <span className="mobile-nav-label">{t?.navAccount || 'Account'}</span>
        </button>
      ) : (
        <button
          type="button"
          className="mobile-nav-item"
          onClick={() => onOpenAuth('login')}
          title={t?.signIn || "Sign In"}
        >
          <div className="mobile-nav-icon-box">
            <LogIn size={20} strokeWidth={1.8} />
          </div>
          <span className="mobile-nav-label">{t?.signIn || 'Sign In'}</span>
        </button>
      )}
    </nav>
  );
}
