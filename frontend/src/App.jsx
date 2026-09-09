import React, { useState, useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import HeroBanner from './components/catalog/HeroBanner';
import CategoryTabs from './components/catalog/CategoryTabs';
import BookCard from './components/catalog/BookCard';
import PdfReaderModal from './components/reader/PdfReaderModal';
import AdminDashboard from './components/admin/AdminDashboard';
import UserLibrary from './components/library/UserLibrary';
import AuthModal from './components/auth/AuthModal';
import { api, getStoredUser, getAuthToken } from './services/api';
import { BookOpen, Sparkles, Compass, AlertCircle, Database, Shield, Code2, Server, Zap, Cpu, Search } from 'lucide-react';

import { INITIAL_CATEGORIES, INITIAL_DOCUMENTS } from './services/seedData';

export default function App() {
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'admin'
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [books, setBooks] = useState(INITIAL_DOCUMENTS);
  const [featuredBooks, setFeaturedBooks] = useState(INITIAL_DOCUMENTS.filter(b => b.isFeatured));
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modals
  const [activeReaderBook, setActiveReaderBook] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());

  // Load initial data (categories, catalog, bookmarks)
  const fetchData = async () => {
    try {
      // 1. Fetch categories
      const cats = await api.categories.getAll();
      if (Array.isArray(cats) && cats.length > 0) {
        setCategories(cats);
      }

      // 2. Fetch featured books
      const featured = await api.documents.getFeatured();
      if (Array.isArray(featured) && featured.length > 0) {
        setFeaturedBooks(featured);
      }

      // 3. Fetch catalog
      let docsResponse;
      if (searchQuery.trim()) {
        docsResponse = await api.documents.search(searchQuery.trim());
      } else if (selectedCategory) {
        docsResponse = await api.documents.getByCategory(selectedCategory);
      } else {
        docsResponse = await api.documents.getAll(0, 24);
      }
      if (docsResponse && Array.isArray(docsResponse.content)) {
        setBooks(docsResponse.content);
      }

      // 4. If logged in, fetch bookmarks
      if (getAuthToken()) {
        try {
          const userBookmarks = await api.library.getBookmarks();
          const ids = new Set((userBookmarks || []).map((b) => b.id));
          setBookmarkedIds(ids);
        } catch (e) {
          // Non-blocking
        }
      }
      setError(null);
    } catch (err) {
      // If backend is not reached, filter local initial documents gracefully
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        setBooks(INITIAL_DOCUMENTS.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)));
      } else if (selectedCategory) {
        setBooks(INITIAL_DOCUMENTS.filter(b => b.categoryId === selectedCategory));
      } else {
        setBooks(INITIAL_DOCUMENTS);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory, searchQuery]);

  // Handle bookmark toggle
  const handleToggleBookmark = async (documentId) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    try {
      const res = await api.library.toggleBookmark(documentId);
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (res.bookmarked) next.add(documentId);
        else next.delete(documentId);
        return next;
      });
    } catch (err) {
      alert('Error updating bookmark: ' + err.message);
    }
  };

  // 1-Click Quick Admin Login
  const handleQuickAdminLogin = async () => {
    try {
      const data = await api.auth.login('admin', 'admin123');
      setCurrentUser(data);
      setCurrentView('admin');
      // Refresh bookmarks
      const userBookmarks = await api.library.getBookmarks();
      setBookmarkedIds(new Set((userBookmarks || []).map((b) => b.id)));
    } catch (e) {
      setShowAuthModal(true);
    }
  };

  const handleOpenReader = (book) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    setActiveReaderBook(book);
  };

  const handleLogout = () => {
    api.auth.logout();
    setCurrentUser(null);
    setBookmarkedIds(new Set());
    if (currentView === 'admin') setCurrentView('home');
  };

  const handleExplore = () => {
    setCurrentView('home');
    setSelectedCategory(null);
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const primaryFeatured = featuredBooks.length > 0 ? featuredBooks[0] : books[0];

  return (
    <div className="app-root">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        currentView={currentView}
        setCurrentView={setCurrentView}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        onExplore={handleExplore}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenLibrary={() => setShowLibraryModal(true)}
        onLogout={handleLogout}
        onQuickAdminLogin={handleQuickAdminLogin}
      />

      {/* Backend connection warning banner */}
      {error && (
        <div style={{
          background: '#fef3c7',
          borderBottom: '1px solid #fde68a',
          color: '#92400e',
          padding: '0.75rem',
          textAlign: 'center',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            className="btn btn-outline"
            style={{ padding: '2px 8px', fontSize: '0.75rem', marginLeft: 8 }}
            onClick={fetchData}
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {currentView === 'admin' && currentUser?.role === 'ROLE_ADMIN' ? (
        <AdminDashboard
          categories={categories}
          onRefreshCategories={fetchData}
          onOpenReader={(book) => setActiveReaderBook(book)}
        />
      ) : (
        <main>
          {/* Hero Section */}
          {!searchQuery && !selectedCategory && (
            <HeroBanner
              featuredBook={primaryFeatured}
              onReadBook={handleOpenReader}
              onToggleBookmark={handleToggleBookmark}
              isBookmarked={primaryFeatured ? bookmarkedIds.has(primaryFeatured.id) : false}
            />
          )}

          {/* Mobile Search Bar */}
          <div className="container" style={{ marginTop: '0.75rem', marginBottom: '0.25rem' }}>
            <div className="mobile-search-bar">
              <Search size={16} className="search-icon" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="search-input"
                placeholder="Search books, authors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '0.6rem 0.85rem 0.6rem 2.4rem', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Category Filter Chips */}
          <CategoryTabs
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={(id) => setSelectedCategory(id)}
          />

          {/* Catalog Section */}
          <div className="container" style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem' }}>
                  {searchQuery
                    ? `Search Results for "${searchQuery}"`
                    : selectedCategory
                    ? categories.find((c) => c.id === selectedCategory)?.name || 'Category Books'
                    : 'Popular & Trending Reads'}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {books.length} publications available to read immediately
                </p>
              </div>

              {/* Admin quick jump */}
              {currentUser?.role === 'ROLE_ADMIN' && (
                <button
                  className="btn btn-outline"
                  onClick={() => setCurrentView('admin')}
                  style={{ fontSize: '0.82rem' }}
                >
                  <Shield size={14} /> Upload More in Admin Channel
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <BookOpen size={36} color="var(--color-accent)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <div>Loading publications...</div>
              </div>
            ) : books.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                <Compass size={44} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
                <h3>No documents found</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 6 }}>
                  {searchQuery
                    ? 'Try searching for different keywords or explore other categories.'
                    : 'No documents uploaded in this category yet.'}
                </p>
                {currentUser?.role === 'ROLE_ADMIN' && (
                  <button
                    className="btn btn-accent"
                    style={{ marginTop: '1.25rem' }}
                    onClick={() => setCurrentView('admin')}
                  >
                    Open Admin Channel to Upload Books
                  </button>
                )}
              </div>
            ) : (
              <div className="book-grid">
                {books.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onRead={handleOpenReader}
                    onToggleBookmark={handleToggleBookmark}
                    isBookmarked={bookmarkedIds.has(book.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {/* Scribd PDF & Book Reader Modal */}
      {activeReaderBook && (
        <PdfReaderModal
          book={activeReaderBook}
          onClose={() => setActiveReaderBook(null)}
          currentUser={currentUser}
          isBookmarked={bookmarkedIds.has(activeReaderBook.id)}
          onToggleBookmark={handleToggleBookmark}
        />
      )}

      {/* User Library Modal */}
      {showLibraryModal && (
        <UserLibrary
          onClose={() => setShowLibraryModal(false)}
          onReadBook={(book) => {
            setShowLibraryModal(false);
            setActiveReaderBook(book);
          }}
          onToggleBookmark={handleToggleBookmark}
        />
      )}

      {/* Authentication Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            fetchData();
          }}
        />
      )}

      {/* Footer */}
      {/* Modern Luxury Obsidian & Emerald Footer */}
      <footer style={{
        marginTop: '6rem',
        padding: '3.5rem 0 2.5rem',
        borderTop: '1px solid var(--border-glass)',
        background: 'linear-gradient(180deg, rgba(14, 22, 38, 0.4) 0%, rgba(8, 12, 22, 0.98) 100%)',
        fontSize: '0.88rem',
        color: 'var(--text-muted)'
      }}>
        <div className="container">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '2rem',
            paddingBottom: '2.5rem',
            borderBottom: '1px solid var(--border-glass)'
          }}>
            {/* Brand Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
                <div className="brand-icon-box" style={{ width: 34, height: 34 }}>
                  <BookOpen size={18} strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
                  Sourav's Library<span style={{ color: 'var(--color-emerald-light)' }}>.</span>
                </span>
                <span className="brand-badge" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                  Full-Stack Platform
                </span>
              </div>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', maxWidth: 460, margin: 0, lineHeight: 1.6 }}>
                High-performance digital reading architecture with chunked byte-range document streaming, dedicated admin studio, and enterprise persistence.
              </p>
            </div>

            {/* Specific Technical Skills / Tech Stack Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', maxWidth: 540, justifyContent: 'flex-end' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.28)',
                color: 'var(--color-emerald-light)',
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: '0.78rem',
                fontWeight: 600
              }}>
                <Code2 size={13} /> Full-Stack Architecture
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(6, 182, 212, 0.12)',
                border: '1px solid rgba(6, 182, 212, 0.28)',
                color: 'var(--color-cyan)',
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: '0.78rem',
                fontWeight: 600
              }}>
                <Server size={13} /> Spring Boot 3 & REST API
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.28)',
                color: 'var(--color-gold)',
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: '0.78rem',
                fontWeight: 600
              }}>
                <Database size={13} /> Oracle DB & JPA Clustering
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.28)',
                color: '#a5b4fc',
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: '0.78rem',
                fontWeight: 600
              }}>
                <Zap size={13} /> HTTP 206 Byte-Range Streaming
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-card)',
                color: 'var(--text-main)',
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: '0.78rem',
                fontWeight: 600
              }}>
                <Shield size={13} /> JWT Security & RBAC
              </span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(52, 211, 153, 0.12)',
                border: '1px solid rgba(52, 211, 153, 0.28)',
                color: 'var(--color-emerald-light)',
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: '0.78rem',
                fontWeight: 600
              }}>
                <Cpu size={13} /> React & Modern Design System
              </span>
            </div>
          </div>

          {/* Bottom Copyright & Status Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingTop: '1.75rem',
            fontSize: '0.82rem',
            color: 'var(--text-dim)'
          }}>
            <div>
              © {new Date().getFullYear()} <span style={{ color: '#ffffff', fontWeight: 700 }}>Sourav's Library</span> • Crafted with precision by <span style={{ color: 'var(--color-emerald-light)', fontWeight: 700 }}>Sourav Mondal</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-emerald-light)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-emerald)', display: 'inline-block', boxShadow: '0 0 8px var(--color-emerald)' }} />
                Systems Operational
              </span>
              <span>•</span>
              <span>Production Ready</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
