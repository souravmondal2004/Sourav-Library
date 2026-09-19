import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/layout/Navbar';
import MobileBottomNav from './components/layout/MobileBottomNav';
import HeroBanner from './components/catalog/HeroBanner';
import CategoryTabs from './components/catalog/CategoryTabs';
import BookCard from './components/catalog/BookCard';
import PdfReaderModal from './components/reader/PdfReaderModal';
import AdminDashboard from './components/admin/AdminDashboard';
import UserLibrary from './components/library/UserLibrary';
import AuthModal from './components/auth/AuthModal';
import VideoHub from './components/video/VideoHub';
import VideoPlayerView from './components/video/VideoPlayerView';
import SouravAIChat from './components/ai/SouravAIChat';
import { videoService } from './services/videoService';
import { api, getStoredUser, getAuthToken, getCachedDocuments, getCachedCategories, getCachedFeatured } from './services/api';
import { BookOpen, Sparkles, Compass, AlertCircle, Database, Shield, Code2, Server, Zap, Cpu, Search, RefreshCw, Radio, Tv, Video } from 'lucide-react';

import { INITIAL_CATEGORIES, INITIAL_DOCUMENTS } from './services/seedData';

export default function App() {
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'admin'
  const [currentSection, setCurrentSection] = useState('books'); // 'books' | 'videos' | 'ai'
  const [videos, setVideos] = useState(() => videoService.getAllVideos());
  const [activeVideo, setActiveVideo] = useState(null);
  const [categories, setCategories] = useState(getCachedCategories());
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [books, setBooks] = useState(getCachedDocuments());
  const [featuredBooks, setFeaturedBooks] = useState(getCachedFeatured());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [serverOnline, setServerOnline] = useState(true);

  // Modals
  const [activeReaderBook, setActiveReaderBook] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('login');
  const [showLibraryModal, setShowLibraryModal] = useState(false);

  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const mobileSearchInputRef = useRef(null);

  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const handleOpenMobileSearch = () => {
    if (currentView !== 'home') setCurrentView('home');
    setTimeout(() => {
      if (mobileSearchInputRef.current) {
        mobileSearchInputRef.current.focus();
        mobileSearchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Listen to server status notifications + Auto-retry when offline + Keep-alive ping
  useEffect(() => {
    let retryTimer = null;
    let keepAliveTimer = null;
    let retryCount = 0;
    const MAX_RETRIES = 30; // Stop after 5 minutes (30 × 10s)

    const handleStatus = (e) => {
      if (e.detail) {
        const isOnline = e.detail.online;
        setServerOnline(isOnline);
        if (!isOnline) {
          if (isLocalhost) {
            setError('Backend Server is Offline: Your system server stopped (e.g. laptop lid was closed). Run start-all.bat to reconnect.');
          } else {
            setError('Cloud Server Waking Up (~20s): Render sleeps inactive containers. Your library is loaded from cache and will sync automatically.');
            // Auto-retry every 10 seconds until server wakes up
            if (!retryTimer) {
              retryCount = 0;
              retryTimer = setInterval(async () => {
                retryCount++;
                if (retryCount > MAX_RETRIES) {
                  clearInterval(retryTimer);
                  retryTimer = null;
                  return;
                }
                const online = await api.system.checkHealth();
                if (online) {
                  clearInterval(retryTimer);
                  retryTimer = null;
                  retryCount = 0;
                  fetchData(); // Re-fetch all data once server is back
                }
              }, 10000);
            }
          }
        } else {
          setError(null);
          // Server came online — clear retry timer
          if (retryTimer) {
            clearInterval(retryTimer);
            retryTimer = null;
            retryCount = 0;
          }
        }
      }
    };

    window.addEventListener('scribd-server-status', handleStatus);
    api.system.checkHealth();

    // Keep-alive: ping the backend every 8 minutes while user has the tab open
    // This prevents Render from sleeping (15 min inactivity threshold)
    if (!isLocalhost) {
      keepAliveTimer = setInterval(() => {
        api.system.checkHealth();
      }, 8 * 60 * 1000); // 8 minutes
    }

    return () => {
      window.removeEventListener('scribd-server-status', handleStatus);
      if (retryTimer) clearInterval(retryTimer);
      if (keepAliveTimer) clearInterval(keepAliveTimer);
    };
  }, []);

  // Load initial data (categories, catalog, bookmarks) with instant SWR & parallel fetching
  const fetchData = async () => {
    const hasExistingData = books && books.length > 0;
    if (!hasExistingData) {
      setLoading(true);
    } else {
      setIsBackgroundSyncing(true);
    }

    try {
      // 1. Prepare documents request (size 100 to fetch all 31 documents)
      let docsPromise;
      if (searchQuery.trim()) {
        docsPromise = api.documents.search(searchQuery.trim(), 0, 100);
      } else if (selectedCategory) {
        docsPromise = api.documents.getByCategory(selectedCategory, 0, 100);
      } else {
        docsPromise = api.documents.getAll(0, 100);
      }

      // 2. Fetch categories, featured documents, catalog, and bookmarks concurrently
      const [catsRes, featuredRes, docsRes, bookmarksRes] = await Promise.allSettled([
        api.categories.getAll(),
        api.documents.getFeatured(),
        docsPromise,
        getAuthToken() ? api.library.getBookmarks() : Promise.resolve(null)
      ]);

      if (catsRes.status === 'fulfilled' && Array.isArray(catsRes.value) && catsRes.value.length > 0) {
        setCategories(catsRes.value);
      }

      if (featuredRes.status === 'fulfilled' && Array.isArray(featuredRes.value) && featuredRes.value.length > 0) {
        setFeaturedBooks(featuredRes.value);
      }

      if (docsRes.status === 'fulfilled' && docsRes.value && Array.isArray(docsRes.value.content)) {
        setBooks(docsRes.value.content);
      }

      if (bookmarksRes.status === 'fulfilled' && Array.isArray(bookmarksRes.value)) {
        const ids = new Set(bookmarksRes.value.map((b) => b.id));
        setBookmarkedIds(ids);
      }

      setError(null);
      setServerOnline(true);
    } catch (err) {
      setServerOnline(false);
      if (isLocalhost) {
        setError('Backend Server is Offline: Run start-all.bat to reconnect.');
      } else {
        setError('Cloud Server Waking Up (~20s): Showing cached library.');
      }
      const cached = getCachedDocuments();
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        setBooks(cached.filter(b => (b.title && b.title.toLowerCase().includes(q)) || (b.author && b.author.toLowerCase().includes(q))));
      } else if (selectedCategory) {
        setBooks(cached.filter(b => b.categoryId === selectedCategory));
      } else {
        setBooks(cached);
      }
    } finally {
      setLoading(false);
      setIsBackgroundSyncing(false);
    }
  };

  const handleOpenAuth = (mode = 'login') => {
    setAuthInitialMode(mode);
    setShowAuthModal(true);
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory, searchQuery]);

  // Handle bookmark toggle
  const handleToggleBookmark = async (documentId) => {
    if (!currentUser) {
      handleOpenAuth('login');
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
      handleOpenAuth('login');
    }
  };

  const handleOpenReader = (book) => {
    if (!currentUser) {
      handleOpenAuth('login');
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

  const handleSelectSection = (section) => {
    setCurrentSection(section);
    if (currentView === 'admin') setCurrentView('home');
    if (section === 'videos') {
      setActiveVideo(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExplore = () => {
    setCurrentView('home');
    setCurrentSection('books');
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
        currentSection={currentSection}
        onSelectSection={handleSelectSection}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        serverOnline={serverOnline}
        onExplore={handleExplore}
        onOpenAuth={handleOpenAuth}
        onOpenLibrary={() => setShowLibraryModal(true)}
        onLogout={handleLogout}
        onQuickAdminLogin={handleQuickAdminLogin}
      />

      {/* Backend connection warning banner */}
      {(!serverOnline || error) && (
        <div style={{
          background: isLocalhost
            ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.18), rgba(245, 158, 11, 0.15))'
            : 'linear-gradient(90deg, rgba(245, 158, 11, 0.18), rgba(16, 185, 129, 0.15))',
          borderBottom: isLocalhost ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
          color: '#fca5a5',
          padding: '0.85rem 1.5rem',
          textAlign: 'center',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          {isLocalhost ? (
            <>
              <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
              <span style={{ color: '#f3f4f6' }}>
                <strong style={{ color: '#f87171' }}>Local Server Offline:</strong>{' '}
                The system server stopped when your laptop was closed or restarted. Your uploaded books and data are <strong>100% safely preserved</strong> on disk! Double-click <code>start-all.bat</code> to reconnect.
              </span>
            </>
          ) : (
            <>
              <Radio size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
              <span style={{ color: '#f3f4f6' }}>
                <strong style={{ color: '#fbbf24' }}>Cloud Server Warming Up (~20s):</strong>{' '}
                Render instances sleep when idle. Auto-reconnecting every 10s... Your <strong>{books?.length || 31} publications</strong> are accessible from cache.
              </span>
            </>
          )}
          <button
            className="btn btn-primary"
            style={{ padding: '4px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
            onClick={fetchData}
          >
            <RefreshCw size={13} /> Retry Connection
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
      ) : currentSection === 'videos' ? (
        <main>
          {activeVideo ? (
            <VideoPlayerView
              video={activeVideo}
              onBack={() => setActiveVideo(null)}
              onSelectVideo={(v) => setActiveVideo(v)}
              allVideos={videos}
            />
          ) : (
            <VideoHub
              onSelectVideo={(v) => setActiveVideo(v)}
              currentUser={currentUser}
              videos={videos}
              setVideos={setVideos}
            />
          )}
        </main>
      ) : currentSection === 'ai' ? (
        <main>
          <SouravAIChat
            currentUser={currentUser}
            allBooks={books}
            allVideos={videos}
          />
        </main>
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
                ref={mobileSearchInputRef}
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
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{books.length} publications available to read immediately</span>
                  {isBackgroundSyncing && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.72rem',
                      color: 'var(--color-emerald-light)',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      padding: '2px 8px',
                      borderRadius: 999
                    }}>
                      <RefreshCw size={10} style={{ animation: 'spin 1.2s linear infinite' }} /> Syncing cloud archive...
                    </span>
                  )}
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
          initialMode={authInitialMode}
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

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        currentView={currentView}
        currentSection={currentSection}
        onSelectSection={handleSelectSection}
        onExplore={handleExplore}
        onOpenSearch={handleOpenMobileSearch}
        onOpenLibrary={() => setShowLibraryModal(true)}
        currentUser={currentUser}
        isAdmin={currentUser?.role === 'ROLE_ADMIN'}
        onToggleAdmin={() => setCurrentView(currentView === 'admin' ? 'home' : 'admin')}
        onOpenAuth={handleOpenAuth}
        searchQuery={searchQuery}
      />
    </div>
  );
}
