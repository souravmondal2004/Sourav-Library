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
import PdfUploadModal from './components/catalog/PdfUploadModal';
import VideoHub from './components/video/VideoHub';
import VideoPlayerView from './components/video/VideoPlayerView';
import SouravAIChat from './components/ai/SouravAIChat';
import { videoService } from './services/videoService';
import { api, getStoredUser, getAuthToken, getCachedDocuments, getCachedCategories, getCachedFeatured } from './services/api';
import { BookOpen, Sparkles, Compass, AlertCircle, Database, Shield, Code2, Server, Zap, Cpu, Search, RefreshCw, Radio, Tv, Video, Upload, Cloud, CheckCircle2, Info, ShieldCheck, GraduationCap, Headphones, FileText, Globe, Landmark, Layers } from 'lucide-react';

import { INITIAL_CATEGORIES, INITIAL_DOCUMENTS } from './services/seedData';
import { getTranslation, LANGUAGES } from './services/translations';

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

  // Multi-Language State (English, Bengali, Hindi, Urdu)
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sl-language') || 'en';
    }
    return 'en';
  });
  const t = getTranslation(language);

  const handleSelectLanguage = (langCode) => {
    setLanguage(langCode);
    localStorage.setItem('sl-language', langCode);
  };

  useEffect(() => {
    if (language === 'ur') {
      document.documentElement.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
    }
  }, [language]);

  // Theme & Accessibility Scaling States
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sl-theme') || 'light';
    }
    return 'light';
  });
  const [fontScale, setFontScale] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sl-font-scale') || 'md';
    }
    return 'md';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sl-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.remove('font-scale-sm', 'font-scale-md', 'font-scale-lg');
    document.documentElement.classList.add(`font-scale-${fontScale}`);
    localStorage.setItem('sl-font-scale', fontScale);
  }, [fontScale]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleChangeFontScale = (scale) => {
    setFontScale(scale);
  };

  const handleSelectDomain = (keyword) => {
    setCurrentView('home');
    setCurrentSection('books');
    const matched = categories.find((c) => c.name.toLowerCase().includes(keyword.toLowerCase()));
    if (matched) {
      setSelectedCategory(matched.id);
    } else {
      setSelectedCategory(null);
      setSearchQuery(keyword);
    }
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  // Modals
  const [activeReaderBook, setActiveReaderBook] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('login');
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [isPdfUploadOpen, setIsPdfUploadOpen] = useState(false);
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState(null);

  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const mobileSearchInputRef = useRef(null);

  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const isAdmin = currentUser && (currentUser.role === 'ROLE_ADMIN' || currentUser.role === 'ADMIN' || currentUser.username === 'Sourav' || currentUser.username === 'admin');

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

    const handleAuthEvent = (e) => {
      const mode = (e.detail && typeof e.detail === 'string') ? e.detail : 'login';
      handleOpenAuth(mode);
    };
    window.addEventListener('scribd-open-auth', handleAuthEvent);

    return () => {
      window.removeEventListener('scribd-server-status', handleStatus);
      window.removeEventListener('scribd-open-auth', handleAuthEvent);
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

      // 2. Fetch categories, featured documents, catalog, bookmarks, and videos concurrently
      const [catsRes, featuredRes, docsRes, bookmarksRes, videosRes] = await Promise.allSettled([
        api.categories.getAll(),
        api.documents.getFeatured(),
        docsPromise,
        getAuthToken() ? api.library.getBookmarks() : Promise.resolve(null),
        videoService.fetchVideos()
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

      if (videosRes.status === 'fulfilled' && Array.isArray(videosRes.value) && videosRes.value.length > 0) {
        setVideos(videosRes.value);
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

  const handleOpenInDrive = (book, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const driveUrl = book.googleDriveUrl || api.documents.getDriveViewUrl(book.id);
    window.open(driveUrl, '_blank', 'noopener,noreferrer');
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

  // PDF Upload Handler: prepend to catalog and trigger notification
  const handlePdfUploaded = (uploadedDoc) => {
    if (!uploadedDoc) return;
    setBooks((prev) => [uploadedDoc, ...prev.filter((b) => b.id !== uploadedDoc.id)]);
    setSyncNotice({
      type: 'success',
      message: `"${uploadedDoc.title}" uploaded & saved to Google Drive!`
    });
    setTimeout(() => setSyncNotice(null), 5000);
    fetchData();
  };

  // PDF Delete Handler: confirm and delete from library & Drive
  const handleDeleteBook = async (id, title) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${title || 'this publication'}"?\n\nThis will remove the file from your library and sync changes to Google Drive.`
    );
    if (!confirmed) return;

    try {
      await api.documents.delete(id);
      setBooks((prev) => prev.filter((b) => b.id !== id));
      setFeaturedBooks((prev) => prev.filter((b) => b.id !== id));
      setSyncNotice({
        type: 'info',
        message: `"${title}" has been deleted and synced with Google Drive.`
      });
      setTimeout(() => setSyncNotice(null), 5000);
    } catch (err) {
      console.error('Failed to delete book:', err);
      alert('Could not delete document: ' + (err.message || 'Server error. Please verify connection.'));
    }
  };

  // Manual Google Drive Sync for PDF & Category catalog
  const handleManualPdfDriveSync = async () => {
    setIsDriveSyncing(true);
    setSyncNotice({
      type: 'loading',
      message: 'Backing up and synchronizing books & categories with Google Drive...'
    });
    try {
      await Promise.allSettled([
        api.documents.syncWithDrive(),
        api.categories.syncWithDrive()
      ]);
      setSyncNotice({
        type: 'success',
        message: 'Library catalog & categories successfully synced to Google Drive!'
      });
      fetchData();
    } catch (err) {
      setSyncNotice({
        type: 'error',
        message: 'Drive sync note: ' + (err.message || 'Offline or sync deferred.')
      });
    } finally {
      setIsDriveSyncing(false);
      setTimeout(() => setSyncNotice(null), 6000);
    }
  };

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
        onOpenUploadPdf={() => setIsPdfUploadOpen(true)}
        onLogout={handleLogout}
        onQuickAdminLogin={handleQuickAdminLogin}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        fontScale={fontScale}
        onChangeFontScale={handleChangeFontScale}
        language={language}
        onSelectLanguage={handleSelectLanguage}
        t={t}
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
          {/* Hero & Search Section */}
          {!searchQuery && !selectedCategory && (
            <HeroBanner
              featuredBook={primaryFeatured}
              onReadBook={handleOpenReader}
              onToggleBookmark={handleToggleBookmark}
              isBookmarked={primaryFeatured ? bookmarkedIds.has(primaryFeatured.id) : false}
              onUploadPdf={isAdmin ? () => setIsPdfUploadOpen(true) : null}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSelectCategory={setSelectedCategory}
              categories={categories}
              t={t}
            />
          )}

          {/* Stats Bar */}
          {!searchQuery && !selectedCategory && (
            <div className="ndli-stats-strip">
              <div className="container ndli-stats-row">
                <div className="ndli-stat-item">
                  <div className="ndli-stat-icon">
                    <BookOpen size={20} />
                  </div>
                  <div className="ndli-stat-content">
                    <div className="ndli-stat-number">{books.length}+ {t?.library || 'Books'}</div>
                    <div className="ndli-stat-title">{t?.stat1Label || 'Curated Books & Papers'}</div>
                  </div>
                </div>

                <div className="ndli-stat-item">
                  <div className="ndli-stat-icon">
                    <GraduationCap size={20} />
                  </div>
                  <div className="ndli-stat-content">
                    <div className="ndli-stat-number">{t?.stat2Num || '100% Free'}</div>
                    <div className="ndli-stat-title">{t?.stat2Label || 'Open Access Forever'}</div>
                  </div>
                </div>

                <div className="ndli-stat-item">
                  <div className="ndli-stat-icon">
                    <Zap size={20} />
                  </div>
                  <div className="ndli-stat-content">
                    <div className="ndli-stat-number">{t?.stat3Num || 'Instant'}</div>
                    <div className="ndli-stat-title">{t?.stat3Label || 'Cloud PDF Streaming'}</div>
                  </div>
                </div>

                <div className="ndli-stat-item">
                  <div className="ndli-stat-icon">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="ndli-stat-content">
                    <div className="ndli-stat-number">Cloud Sync</div>
                    <div className="ndli-stat-title">Google Drive Preserved</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Search Bar */}
          <div className="container" style={{ marginTop: '0.75rem', marginBottom: '0.25rem' }}>
            <div className="mobile-search-bar">
              <input
                ref={mobileSearchInputRef}
                type="text"
                className="search-input"
                placeholder={t?.searchPlaceholder || "Search books, authors..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '0.6rem 0.85rem 0.6rem 2.6rem', fontSize: '0.85rem' }}
              />
              <Search size={16} strokeWidth={2.4} className="search-icon" />
            </div>
          </div>

          {/* Category Filter Chips */}
          <CategoryTabs
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={(id) => setSelectedCategory(id)}
            t={t}
          />

          {/* Catalog Section */}
          <div className="container" style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.85rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {searchQuery
                    ? `Search Results for "${searchQuery}"`
                    : selectedCategory
                    ? categories.find((c) => c.id === selectedCategory)?.name || 'Collection'
                    : 'Browse the Collection'}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span>{books.length} publications available</span>
                  {isBackgroundSyncing && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.72rem',
                      color: 'var(--color-accent)',
                      background: 'var(--color-accent-soft)',
                      border: '1px solid var(--border-accent)',
                      padding: '2px 8px',
                      borderRadius: 999
                    }}>
                      <RefreshCw size={10} style={{ animation: 'spin 1.2s linear infinite' }} /> Syncing...
                    </span>
                  )}
                </p>
              </div>

              {/* Action Buttons: Upload PDF (Admin Only) + Cloud Sync + Admin */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                {isAdmin && (
                  <button
                    className="btn btn-primary"
                    onClick={() => setIsPdfUploadOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.84rem',
                      padding: '0.5rem 1rem',
                      background: 'var(--color-accent)',
                      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      borderRadius: '4px'
                    }}
                  >
                    <Upload size={14} strokeWidth={2.5} /> Upload PDF
                  </button>
                )}

                <button
                  className="btn btn-outline"
                  onClick={handleManualPdfDriveSync}
                  disabled={isDriveSyncing}
                  title="Backup & sync all PDF documents metadata to Google Drive cloud"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.82rem',
                    padding: '0.5rem 0.9rem',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-main)',
                    background: 'var(--card-bg)'
                  }}
                >
                  <Cloud size={14} className={isDriveSyncing ? 'animate-spin' : ''} />
                  {isDriveSyncing ? 'Syncing...' : 'Sync with Cloud Archive'}
                </button>

                {isAdmin && (
                  <button
                    className="btn btn-outline"
                    onClick={() => setCurrentView('admin')}
                    style={{ fontSize: '0.82rem', padding: '0.5rem 0.9rem' }}
                  >
                    <Shield size={14} /> Admin Studio
                  </button>
                )}
              </div>
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
                {isAdmin && (
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
                    onOpenInDrive={handleOpenInDrive}
                    onToggleBookmark={handleToggleBookmark}
                    isBookmarked={bookmarkedIds.has(book.id)}
                    onDelete={isAdmin ? handleDeleteBook : null}
                    currentUser={currentUser}
                    onRequireAuth={handleOpenAuth}
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

      {/* PDF Upload Modal */}
      <PdfUploadModal
        isOpen={isPdfUploadOpen}
        onClose={() => setIsPdfUploadOpen(false)}
        categories={categories}
        onDocumentUploaded={handlePdfUploaded}
        currentUser={currentUser}
        onQuickAdminLogin={handleQuickAdminLogin}
      />

      {/* Cloud Drive Sync Notification Toast */}
      {syncNotice && (
        <div style={{
          position: 'fixed',
          bottom: '5.2rem',
          right: '1.5rem',
          zIndex: 9999,
          background: syncNotice.type === 'error'
            ? 'rgba(239, 68, 68, 0.95)'
            : syncNotice.type === 'info'
            ? 'rgba(59, 130, 246, 0.95)'
            : 'rgba(16, 185, 129, 0.95)',
          color: '#ffffff',
          padding: '0.75rem 1.25rem',
          borderRadius: 10,
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.45)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: '0.88rem',
          fontWeight: 600,
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          {syncNotice.type === 'loading' ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : syncNotice.type === 'error' ? (
            <AlertCircle size={16} />
          ) : syncNotice.type === 'info' ? (
            <Cloud size={16} />
          ) : (
            <CheckCircle2 size={16} />
          )}
          <span>{syncNotice.message}</span>
        </div>
      )}

      {/* Premium Footer */}
      <footer className="ndli-footer">
        <div className="container">
          <div className="ndli-footer-main">
            {/* Column 1: About */}
            <div className="ndli-footer-col">
              <h5><Info size={16} color="#60a5fa" /> About</h5>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', lineHeight: 1.7, marginBottom: '0.85rem' }}>
                Sourav's Library is a modern digital repository providing free, open access to quality learning resources across all disciplines. Built with Spring Boot & React.
              </p>
              <div className="ndli-footer-cert-badge">
                <ShieldCheck size={14} color="#34d399" />
                <span>Cloud Secured • Google Drive Sync</span>
              </div>
            </div>

            {/* Column 2: Browse */}
            <div className="ndli-footer-col">
              <h5><GraduationCap size={16} color="#60a5fa" /> Browse</h5>
              <ul className="ndli-footer-links">
                <li><a href="#school" onClick={(e) => { e.preventDefault(); handleSelectDomain('School'); }}>School Education</a></li>
                <li><a href="#higher" onClick={(e) => { e.preventDefault(); handleSelectDomain('Science'); }}>Science & Research</a></li>
                <li><a href="#research" onClick={(e) => { e.preventDefault(); handleSelectDomain('Research'); }}>Research Papers</a></li>
                <li><a href="#tech" onClick={(e) => { e.preventDefault(); handleSelectDomain('Computer'); }}>Engineering & Tech</a></li>
                <li><a href="#career" onClick={(e) => { e.preventDefault(); handleSelectDomain('Career'); }}>Career Development</a></li>
              </ul>
            </div>

            {/* Column 3: Features */}
            <div className="ndli-footer-col">
              <h5><Layers size={16} color="#a78bfa" /> Features</h5>
              <ul className="ndli-footer-links">
                <li><a href="#streaming" onClick={(e) => e.preventDefault()}>Instant PDF Streaming</a></li>
                <li><a href="#cloud" onClick={(e) => e.preventDefault()}>Google Drive Cloud Sync</a></li>
                <li><a href="#video" onClick={(e) => { e.preventDefault(); handleSelectSection('videos'); }}>Video Lecture Hub</a></li>
                <li><a href="#ai" onClick={(e) => { e.preventDefault(); handleSelectSection('ai'); }}>AI Study Assistant</a></li>
                <li><a href="#idr" onClick={(e) => e.preventDefault()}>Digital Repository</a></li>
              </ul>
            </div>

            {/* Column 4: Legal */}
            <div className="ndli-footer-col">
              <h5><FileText size={16} color="#34d399" /> Legal</h5>
              <ul className="ndli-footer-links">
                <li><a href="#terms" onClick={(e) => e.preventDefault()}>Terms of Service</a></li>
                <li><a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a></li>
                <li><a href="#open-access" onClick={(e) => e.preventDefault()}>Open Access Policy</a></li>
                <li><a href="#copyright" onClick={(e) => e.preventDefault()}>Copyright</a></li>
                <li><a href="#accessibility" onClick={(e) => e.preventDefault()}>Accessibility</a></li>
              </ul>
            </div>

            {/* Column 5: Connect */}
            <div className="ndli-footer-col">
              <h5><Headphones size={16} color="#fb7185" /> Connect</h5>
              <ul className="ndli-footer-links">
                <li><a href="mailto:sourav09864@gmail.com">Email Support</a></li>
                <li><a href="#faq" onClick={(e) => e.preventDefault()}>FAQs & Help</a></li>
                <li><a href="#feedback" onClick={(e) => e.preventDefault()}>Feedback</a></li>
              </ul>
              <div style={{ marginTop: '0.85rem', color: '#64748b', fontSize: '0.76rem' }}>
                <strong style={{ color: '#94a3b8' }}>Powered by</strong> Spring Boot 3 & React 19
              </div>
            </div>
          </div>
        </div>

        <div className="ndli-footer-bottom">
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              © {new Date().getFullYear()} <strong>Sourav's Library</strong> — Built by <strong>Sourav Mondal</strong>
            </div>
            <div className="ndli-footer-bottom-links">
              <span>Open Source</span>
              <span>•</span>
              <span>Free Forever</span>
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
        onOpenUploadPdf={() => setIsPdfUploadOpen(true)}
        currentUser={currentUser}
        isAdmin={currentUser?.role === 'ROLE_ADMIN'}
        onToggleAdmin={() => setCurrentView(currentView === 'admin' ? 'home' : 'admin')}
        onOpenAuth={handleOpenAuth}
        searchQuery={searchQuery}
      />
    </div>
  );
}
