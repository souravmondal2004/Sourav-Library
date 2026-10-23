import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Sun,
  Moon,
  Bookmark,
  Download,
  ExternalLink,
  RotateCcw,
  RotateCw,
  AlertCircle
} from 'lucide-react';
import { api, getStoredUser } from '../../services/api';

// High-performance client-side cache for loaded PDF document buffers across modal sessions
const globalPdfBufferCache = new Map();

// Helper to reliably load PDF.js library asynchronously on demand
const getPdfJsLib = async () => {
  if (typeof window !== 'undefined' && window.pdfjsLib) {
    if (window.pdfjsLib.GlobalWorkerOptions && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    return window.pdfjsLib;
  }

  // Dynamically load the CDN script on demand if not already present
  if (typeof document !== 'undefined' && !document.getElementById('pdfjs-cdn-script')) {
    const script = document.createElement('script');
    script.id = 'pdfjs-cdn-script';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    document.head.appendChild(script);
  }

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 100));
    if (typeof window !== 'undefined' && window.pdfjsLib) {
      if (window.pdfjsLib.GlobalWorkerOptions && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      return window.pdfjsLib;
    }
  }

  try {
    const pdfjs = await import('pdfjs-dist/build/pdf.js');
    if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || '3.11.174'}/pdf.worker.min.js`;
    }
    return pdfjs;
  } catch (err) {
    console.warn('Bundled pdfjs-dist import fallback error:', err);
    return null;
  }
};

export default function PdfReaderModal({
  book,
  onClose,
  currentUser,
  isBookmarked,
  onToggleBookmark
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(book.pageCount || 1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [theme, setTheme] = useState('light'); // 'light', 'sepia', 'dark'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270 degrees
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 800);

  const toggleDarkWhiteMode = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // PDF.js Canvas Rendering States
  const [pdfDoc, setPdfDoc] = useState(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ loaded: 0, total: 0, percent: 0 });
  const [pdfError, setPdfError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const currentRenderTaskRef = useRef(null);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const maxScroll = scrollHeight - clientHeight;
    if (maxScroll > 0) {
      setScrollProgress(Math.min(100, Math.round((scrollTop / maxScroll) * 100)));
    } else {
      setScrollProgress(0);
    }
  };

  const isTextMode = book.pages && book.pages.length > 0;
  const streamUrl = api.documents.getStreamUrl(book.id);

  const handleDownload = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const user = getStoredUser();
    if (!user) {
      window.dispatchEvent(new CustomEvent('scribd-open-auth', { detail: 'login' }));
      return;
    }
    try {
      await api.documents.download(book);
    } catch (err) {
      if (err.message && err.message.includes('sign in')) {
        window.dispatchEvent(new CustomEvent('scribd-open-auth', { detail: 'login' }));
      } else {
        alert('Download failed: ' + err.message);
      }
    }
  };

  // Load PDF document using PDF.js when opening an uploaded file
  useEffect(() => {
    if (isTextMode) {
      setTotalPages(book.pages.length);
      return;
    }

    let isMounted = true;
    setIsLoadingPdf(true);
    setPdfError(null);
    setPdfDoc(null);
    setDownloadProgress({ loaded: 0, total: 0, percent: 0 });

    async function loadDocument() {
      try {
        const pdfjs = await getPdfJsLib();
        if (!pdfjs) {
          throw new Error('PDF rendering library is initializing. Please wait a moment or reload.');
        }

        if (pdfjs.GlobalWorkerOptions && !pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        const cacheKey = `${book.id}_${book.fileName || book.title || ''}`;
        if (retryCount > 0) {
          globalPdfBufferCache.delete(cacheKey);
        }

        // Fast Path 1: Instant in-memory client cache (0ms reopen)
        if (retryCount === 0 && globalPdfBufferCache.has(cacheKey)) {
          const cachedBuffer = globalPdfBufferCache.get(cacheKey);
          const task = pdfjs.getDocument({
            data: cachedBuffer,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true
          });
          const doc = await task.promise;
          if (!isMounted) return;
          setPdfDoc(doc);
          setTotalPages(doc.numPages);
          setIsLoadingPdf(false);
          return;
        }

        // Fast Path 2: Progressive HTTP Range Streaming direct from activeStreamUrl (Page 1 in <1s)
        const directCloudUrl = `https://sourav-library.onrender.com/api/documents/${book.id}/stream`;
        // Bypass Vercel 4.5MB proxy limit by connecting directly to Render cloud when hosted on Vercel
        const isVercelHost = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
        const activeStreamUrl = (retryCount > 0 || isVercelHost) ? directCloudUrl : streamUrl;

        let doc = null;
        try {
          const loadingTask = pdfjs.getDocument({
            url: activeStreamUrl,
            withCredentials: false,
            rangeChunkSize: 131072, // 128KB initial chunk for rapid preview
            disableAutoFetch: false,
            disableStream: false,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true
          });

          loadingTask.onProgress = ({ loaded, total }) => {
            if (isMounted && total > 0) {
              const percent = Math.min(100, Math.round((loaded / total) * 100));
              setDownloadProgress({ loaded, total, percent });
            }
          };

          doc = await loadingTask.promise;
        } catch (streamingErr) {
          console.warn('Progressive streaming fallback to direct fetch:', streamingErr);
          // Resilient Fallback: Stream directly via fetch from direct cloud URL
          const response = await fetch(directCloudUrl);
          if (!response.ok) {
            throw new Error(`Cloud server returned HTTP ${response.status}. Please wait a few seconds and click Retry.`);
          }
          const arrayBuffer = await response.arrayBuffer();
          globalPdfBufferCache.set(cacheKey, arrayBuffer);

          const fallbackTask = pdfjs.getDocument({
            data: arrayBuffer,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true
          });
          doc = await fallbackTask.promise;
        }

        if (!isMounted) return;

        // Populate in-memory cache in background if not already cached
        if (!globalPdfBufferCache.has(cacheKey) && doc && doc.getData) {
          doc.getData().then((data) => {
            globalPdfBufferCache.set(cacheKey, data);
          }).catch(() => {});
        }

        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setIsLoadingPdf(false);
      } catch (err) {
        console.error('PDF.js loading error:', err);
        if (!isMounted) return;

        const errMsg = err?.message || '';
        // If Render free-tier server is waking up from idle or deploying, auto-retry smoothly
        if ((errMsg.includes('502') || errMsg.includes('503') || errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) && retryCount < 3) {
          setTimeout(() => {
            if (isMounted) setRetryCount((c) => c + 1);
          }, 2500);
          return;
        }

        let userMsg = errMsg || 'Unable to render document inline.';
        if (errMsg.includes('502') || errMsg.includes('503') || errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) {
          userMsg = 'Cloud server is waking up or preparing the document. Please click Retry below to open.';
        }
        setPdfError(userMsg);
        setIsLoadingPdf(false);
      }
    }

    loadDocument();

    return () => {
      isMounted = false;
    };
  }, [book.id, isTextMode, streamUrl, book.pages, retryCount]);

  // Render current PDF page onto HTML5 Canvas
  useEffect(() => {
    if (isTextMode || !pdfDoc || !canvasRef.current) return;

    let isCancelled = false;

    async function renderPage() {
      try {
        // Cancel active render task if user rapidly switched pages
        if (currentRenderTaskRef.current) {
          try {
            currentRenderTaskRef.current.cancel();
          } catch {
            // ignore cancellation
          }
        }

        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const effectiveRotation = ((page.rotate || 0) + rotation) % 360;

        // 1. Get native unscaled dimensions of the PDF page at scale 1.0
        const unscaledViewport = page.getViewport({ scale: 1.0, rotation: effectiveRotation });

        // 2. Measure available container width for fit-to-width
        let containerWidth = 800;
        if (containerRef.current && containerRef.current.clientWidth > 0) {
          containerWidth = containerRef.current.clientWidth;
        } else if (typeof window !== 'undefined') {
          containerWidth = window.innerWidth;
        }

        const isMobileScreen = typeof window !== 'undefined' && window.innerWidth < 768;
        // On mobile, keep minimal padding (10px total) so 100% of the PDF page is visible without horizontal scrolling
        const horizontalPadding = isMobileScreen ? 12 : 36;
        const usableWidth = Math.max(260, containerWidth - horizontalPadding);

        // 3. Compute fit-to-width scale
        let fitScale = usableWidth / unscaledViewport.width;
        if (!isMobileScreen) {
          // On desktop, cap default scale between 0.85 and 1.35
          fitScale = Math.min(1.35, Math.max(0.85, fitScale));
        }

        const finalScale = fitScale * (zoomLevel / 100);
        const viewport = page.getViewport({ scale: finalScale, rotation: effectiveRotation });

        // High DPI sharpness: guarantee minimum 2.0 DPR so text is crystal clear at all zoom levels
        const dpr = Math.max(window.devicePixelRatio || 1, 2.0);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);

        const displayWidth = Math.floor(viewport.width);
        const displayHeight = Math.floor(viewport.height);
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        // At 100% zoom, fit width so the whole page is visible.
        // When user zooms in (> 100%), allow canvas to grow so they see large, clear magnified text!
        if (zoomLevel <= 100) {
          canvas.style.maxWidth = '100%';
        } else {
          canvas.style.maxWidth = 'none';
        }

        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;

        // Enhance 2D context text sharpness and anti-aliasing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const renderContext = {
          canvasContext: ctx,
          transform,
          viewport
        };

        const renderTask = page.render(renderContext);
        currentRenderTaskRef.current = renderTask;

        await renderTask.promise;
        currentRenderTaskRef.current = null;

        // Auto-scroll to top and left on page turn
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
          containerRef.current.scrollLeft = 0;
        }

        // Smart pre-fetch next and previous pages in background for instant page flipping
        if (pdfDoc && currentPage < pdfDoc.numPages) {
          pdfDoc.getPage(currentPage + 1).catch(() => {});
        }
        if (pdfDoc && currentPage > 1) {
          pdfDoc.getPage(currentPage - 1).catch(() => {});
        }
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('PDF Page render error:', err);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (currentRenderTaskRef.current) {
        try {
          currentRenderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pdfDoc, currentPage, zoomLevel, rotation, isTextMode, windowWidth]);

  // Save reading progress periodically
  useEffect(() => {
    if (currentUser && book && totalPages > 0) {
      const progressPercent = Math.min(100, Math.round((currentPage / totalPages) * 100));
      api.library.updateProgress(book.id, currentPage, progressPercent).catch(() => {});
    }
  }, [currentPage, book, currentUser, totalPages]);

  // Keyboard navigation (ArrowLeft/Right for page turns; PageUp/Down for natural document scrolling)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        setCurrentPage((prev) => Math.min(totalPages, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentPage((prev) => Math.max(1, prev - 1));
      } else if (e.key === 'Escape' && !isFullscreen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalPages, isFullscreen, onClose]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div className="reader-modal-backdrop" onClick={onClose}>
      <div
        className={`reader-modal-window reader-theme-${theme}`}
        style={isFullscreen ? { maxWidth: '100vw', height: '100vh', borderRadius: 0 } : {}}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Reader Toolbar */}
        <div className="reader-toolbar">
          {/* Left: Book Meta & Close */}
          <div className="reader-toolbar-left">
            <button
              onClick={onClose}
              className="btn reader-tool-btn reader-close-btn"
              title="Close Reader (Esc)"
            >
              <X size={18} strokeWidth={2.4} />
            </button>
            <div className="reader-book-meta-box">
              <h3 className="reader-book-title">
                {book.title}
              </h3>
              <p className="reader-book-meta">
                {book.author} • {book.categoryName}
              </p>
            </div>
          </div>

          {/* Center: Page Controls */}
          <div className="reader-toolbar-center">
            <button
              className="btn reader-tool-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              title="Previous Page"
            >
              <ChevronLeft size={18} strokeWidth={2.4} />
            </button>

            <div className="reader-page-indicator">
              <span className="reader-page-word">Page</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1 && val <= totalPages) {
                    setCurrentPage(val);
                  }
                }}
                className="reader-page-input"
              />
              <span>/ {totalPages}</span>
            </div>

            <button
              className="btn reader-tool-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              title="Next Page"
            >
              <ChevronRight size={18} strokeWidth={2.4} />
            </button>
          </div>

          {/* Right: Theme, Single Download, Bookmark & Desktop Tools */}
          <div className="reader-toolbar-right">
            {/* Single Clean Dark / Light Mode Toggle */}
            <button
              type="button"
              className="btn reader-tool-btn reader-mode-toggle-btn"
              onClick={toggleDarkWhiteMode}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark and light mode"
            >
              {theme === 'dark' ? (
                <Sun size={16} strokeWidth={2.4} color="#fbbf24" />
              ) : (
                <Moon size={16} strokeWidth={2.4} color="#6366f1" />
              )}
              <span className="reader-mode-toggle-label">
                {theme === 'dark' ? 'Light' : 'Dark'}
              </span>
            </button>

            {/* Bookmark button */}
            <button
              type="button"
              className={`btn reader-tool-btn ${isBookmarked ? 'reader-bookmarked' : ''}`}
              onClick={() => onToggleBookmark(book.id)}
              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark this Document'}
            >
              <Bookmark
                size={16}
                strokeWidth={2.4}
                fill={isBookmarked ? '#f59e0b' : 'transparent'}
                color={isBookmarked ? '#f59e0b' : 'currentColor'}
              />
            </button>

            {/* Single Unified Download Document Button */}
            <button
              type="button"
              onClick={handleDownload}
              className="btn reader-tool-btn reader-highlight-btn"
              title="Download PDF to your device"
            >
              <Download size={16} strokeWidth={2.4} />
              <span className="reader-btn-label">Download</span>
            </button>

            {/* Rotate Document button (Desktop only) */}
            <button
              type="button"
              className="btn reader-tool-btn desktop-reader-only"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              title={`Rotate 90° Clockwise (Current: ${rotation}°)`}
            >
              <RotateCw size={16} strokeWidth={2.4} />
              <span className="rotate-btn-text" style={{ fontSize: '0.75rem' }}>
                {rotation > 0 ? `${rotation}°` : 'Rotate'}
              </span>
            </button>

            {/* Desktop-Only Tools (Zoom In/Out, 100%, Open Tab, Fullscreen) */}
            <div className="reader-desktop-tools">
              <button
                type="button"
                className="btn reader-tool-btn"
                onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                title="Zoom Out (-)"
              >
                <ZoomOut size={16} strokeWidth={2.4} />
              </button>
              <button
                type="button"
                className="reader-zoom-indicator"
                onClick={() => setZoomLevel(100)}
                title="Reset Zoom to 100%"
              >
                {zoomLevel}%
              </button>
              <button
                type="button"
                className="btn reader-tool-btn"
                onClick={() => setZoomLevel((z) => Math.min(220, z + 15))}
                title="Zoom In (+)"
              >
                <ZoomIn size={16} strokeWidth={2.4} />
              </button>

              {/* Open in Google Drive Button */}
              <a
                href={book.googleDriveUrl || api.documents.getDriveViewUrl(book.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn reader-tool-btn"
                title="Open PDF directly in Google Drive"
                style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
              >
                <ExternalLink size={16} strokeWidth={2.4} />
                <span className="reader-btn-label">Drive</span>
              </a>

              {/* Fullscreen Button */}
              <button
                type="button"
                className="btn reader-tool-btn"
                onClick={toggleFullscreen}
                title="Toggle Fullscreen"
              >
                <Maximize size={16} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </div>

        {/* Reader Content Body */}
        <div className="reader-content-body">
          {/* Subtle Reading Scroll Progress Bar */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '3px',
              background: 'transparent',
              zIndex: 15,
              pointerEvents: 'none'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${scrollProgress}%`,
                background: 'var(--primary, #00d287)',
                transition: 'width 0.12s ease-out',
                boxShadow: '0 0 8px rgba(0, 210, 135, 0.6)'
              }}
            />
          </div>

          {/* Quick Floating Zoom Dock for Mobile (Always accessible when reading) */}
          <div className="reader-floating-zoom-dock">
            <button
              type="button"
              className="reader-floating-zoom-btn"
              onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
              title="Zoom Out (-)"
              aria-label="Zoom out"
            >
              <ZoomOut size={16} strokeWidth={2.4} />
            </button>

            <button
              type="button"
              className="reader-floating-zoom-label"
              onClick={() => setZoomLevel(100)}
              title="Reset Zoom to 100%"
            >
              {zoomLevel}%
            </button>

            <button
              type="button"
              className="reader-floating-zoom-btn"
              onClick={() => setZoomLevel((z) => Math.min(220, z + 15))}
              title="Zoom In (+)"
              aria-label="Zoom in"
            >
              <ZoomIn size={16} strokeWidth={2.4} />
            </button>
          </div>

          {isTextMode ? (
            /* Structured Text/Chapter Reading View */
            <div
              className="reader-text-container"
              onScroll={handleScroll}
              style={{
                padding: `${2 * (zoomLevel / 100)}rem ${2.5 * (zoomLevel / 100)}rem`,
                fontSize: `${1.05 * (zoomLevel / 100)}rem`,
                transition: 'all 0.2s ease'
              }}
            >
              {(() => {
                const pageData = book.pages.find((p) => p.pageNumber === currentPage) || book.pages[0];
                return (
                  <div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid currentColor',
                      opacity: 0.7,
                      paddingBottom: '0.75rem',
                      marginBottom: '2rem',
                      fontSize: '0.85rem'
                    }}>
                      <span>{book.title}</span>
                      <span>Page {currentPage} of {totalPages}</span>
                    </div>

                    <h2 style={{ fontSize: `${1.75 * (zoomLevel / 100)}rem`, marginBottom: '1.5rem', fontWeight: 800 }}>
                      {pageData?.title || `Page ${currentPage}`}
                    </h2>

                    <div style={{ whiteSpace: 'pre-line', marginBottom: '3rem', letterSpacing: '0.01em' }}>
                      {pageData?.content}
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '2rem',
                      borderTop: '1px solid rgba(128, 128, 128, 0.2)'
                    }}>
                      <button
                        className="btn btn-outline"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        style={{ color: 'inherit', borderColor: 'currentColor' }}
                      >
                        <ChevronLeft size={16} /> Previous Page
                      </button>

                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                        {Math.round((currentPage / totalPages) * 100)}% Completed
                      </span>

                      <button
                        className="btn btn-primary"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      >
                        Next Page <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : isLoadingPdf ? (
            /* Sleek PDF Loading State with Real-Time Progress Bar */
            <div className="pdf-loading-state" style={{ textAlign: 'center', padding: '3rem 1.5rem', maxWidth: '420px', margin: '0 auto' }}>
              <div className="pdf-loading-spinner" style={{ margin: '0 auto 1.25rem' }} />
              <h4 style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '1.15rem' }}>
                {downloadProgress.percent > 0 ? `Loading Document... ${downloadProgress.percent}%` : 'Fast-Streaming Document...'}
              </h4>
              <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', opacity: 0.75 }}>
                {downloadProgress.total > 0
                  ? `${(downloadProgress.loaded / (1024 * 1024)).toFixed(1)} MB of ${(downloadProgress.total / (1024 * 1024)).toFixed(1)} MB streamed`
                  : 'Preparing high-definition pages for reading'}
              </p>
              {downloadProgress.percent > 0 && (
                <div style={{
                  width: '100%',
                  height: '6px',
                  background: 'rgba(128, 128, 128, 0.2)',
                  borderRadius: '999px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${downloadProgress.percent}%`,
                    height: '100%',
                    background: 'var(--primary, #00d287)',
                    transition: 'width 0.15s ease-out',
                    borderRadius: '999px',
                    boxShadow: '0 0 8px rgba(0, 210, 135, 0.6)'
                  }} />
                </div>
              )}
            </div>
          ) : pdfError ? (
            /* Graceful Fallback if PDF fails to render */
            <div className="pdf-error-state">
              <AlertCircle size={44} color="#ff5e36" />
              <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>Unable to preview document inline</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.75 }}>{pdfError}</p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={() => setRetryCount((c) => c + 1)}
                  className="btn btn-primary"
                >
                  <RotateCcw size={16} /> Retry
                </button>
                <a
                  href={streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                >
                  <ExternalLink size={16} /> Open in New Tab
                </a>
                <button
                  onClick={handleDownload}
                  className="btn btn-outline"
                >
                  <Download size={16} /> Download PDF
                </button>
              </div>
            </div>
          ) : (
            /* Mozilla PDF.js Canvas Reader (Desktop + Mobile Flawless) */
            <div
              className="pdf-canvas-container"
              ref={containerRef}
              tabIndex={0}
              onScroll={handleScroll}
            >
              <div className="pdf-page-wrapper">
                <canvas ref={canvasRef} className="pdf-page-canvas" />
              </div>

              {/* Bottom Page Navigation Controls */}
              <div className="reader-bottom-nav-controls" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                maxWidth: 680,
                marginTop: '2rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid rgba(128, 128, 128, 0.2)',
                gap: '0.5rem',
                flexWrap: 'wrap'
              }}>
                <button
                  className="btn btn-outline"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{ color: 'inherit', borderColor: 'currentColor' }}
                >
                  <ChevronLeft size={16} /> Previous Page
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    Page {currentPage} of {totalPages} ({Math.round((currentPage / totalPages) * 100)}%)
                  </span>

                  {/* Zoom Controls inside Bottom Bar */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: 'rgba(128, 128, 128, 0.1)', padding: '2px', borderRadius: '8px' }}>
                    <button
                      className="btn reader-tool-btn"
                      style={{ padding: '0.2rem 0.45rem', minHeight: 28, fontSize: '0.75rem' }}
                      onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                      title="Zoom Out (-)"
                    >
                      <ZoomOut size={14} strokeWidth={2.4} />
                    </button>
                    <button
                      className="reader-zoom-indicator"
                      style={{ minWidth: 46, padding: '0.2rem 0.45rem', minHeight: 28, fontSize: '0.75rem' }}
                      onClick={() => setZoomLevel(100)}
                      title="Reset Zoom to 100%"
                    >
                      {zoomLevel}%
                    </button>
                    <button
                      className="btn reader-tool-btn"
                      style={{ padding: '0.2rem 0.45rem', minHeight: 28, fontSize: '0.75rem' }}
                      onClick={() => setZoomLevel((z) => Math.min(220, z + 15))}
                      title="Zoom In (+)"
                    >
                      <ZoomIn size={14} strokeWidth={2.4} />
                    </button>
                  </div>

                  <button
                    className="btn btn-outline"
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      borderColor: rotation > 0 ? 'var(--primary, #00d287)' : 'rgba(128, 128, 128, 0.3)',
                      color: rotation > 0 ? 'var(--primary, #00d287)' : 'inherit',
                      fontWeight: 600
                    }}
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    title={`Rotate Page 90° Clockwise (Current: ${rotation}°)`}
                  >
                    <RotateCw size={13} />
                    <span>{rotation > 0 ? `${rotation}°` : 'Rotate'}</span>
                  </button>
                </div>

                <button
                  className="btn btn-primary"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next Page <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
