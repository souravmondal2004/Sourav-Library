import React from 'react';
import { Compass, Search, BookmarkCheck, Shield, User, LogIn } from 'lucide-react';

export default function MobileBottomNav({
  currentView,
  onExplore,
  onOpenSearch,
  onOpenLibrary,
  currentUser,
  isAdmin,
  onToggleAdmin,
  onOpenAuth,
  searchQuery
}) {
  const isExploreActive = currentView === 'home' && !searchQuery;
  const isSearchActive = !!searchQuery;
  const isAdminActive = currentView === 'admin';

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <button
        type="button"
        className={`mobile-nav-item ${isExploreActive ? 'active' : ''}`}
        onClick={onExplore}
      >
        <div className="mobile-nav-icon-box">
          <Compass size={20} strokeWidth={isExploreActive ? 2.5 : 2} />
        </div>
        <span className="mobile-nav-label">Explore</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${isSearchActive ? 'active' : ''}`}
        onClick={onOpenSearch}
      >
        <div className="mobile-nav-icon-box">
          <Search size={20} strokeWidth={isSearchActive ? 2.5 : 2} />
        </div>
        <span className="mobile-nav-label">Search</span>
      </button>

      <button
        type="button"
        className="mobile-nav-item"
        onClick={onOpenLibrary}
      >
        <div className="mobile-nav-icon-box">
          <BookmarkCheck size={20} />
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
