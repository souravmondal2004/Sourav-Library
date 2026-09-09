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
import { BookOpen, Sparkles, Compass, AlertCircle, Database, Shield } from 'lucide-react';

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
      <footer style={{
        marginTop: '5rem',
        padding: '2.5rem 0',
        borderTop: '1px solid var(--border-color)',
        background: '#ffffff',
        fontSize: '0.85rem',
        color: 'var(--text-muted)'
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>Scribd Clone</span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Database size={14} color="#ea580c" /> Powered by Oracle Database & Spring Boot 3
            </span>
          </div>
          <div>
            Built with React, Spring Boot, and Oracle DB • Full-Featured Admin Upload Channel & Reader
          </div>
        </div>
      </footer>
    </div>
  );
}
