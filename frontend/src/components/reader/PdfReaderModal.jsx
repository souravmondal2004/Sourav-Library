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
  Coffee,
  Bookmark,
  Download,
  ExternalLink,
  RotateCcw,
  RotateCw,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';

// High-performance client-side cache for loaded PDF document buffers across modal sessions
const globalPdfBufferCache = new Map();

// Helper to reliably load PDF.js library from window or bundled distribution
const getPdfJsLib = async () => {
  if (typeof window !== 'undefined' && window.pdfjsLib) {
    return window.pdfjsLib;
  }
  // Wait up to 2.5s for the CDN script tag in index.html to finish loading
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 100));
    if (typeof window !== 'undefined' && window.pdfjsLib) {
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

  const handleDownload = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const downloadUrl = api.documents.getDownloadUrl(book.id);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', book.originalFilename || `${book.title}.pdf`);
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
    }, 200);
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

        // Fast Path 1: Instant in-memory client cache (0ms reopen)
        if (globalPdfBufferCache.has(book.id)) {
          const cachedBuffer = globalPdfBufferCache.get(book.id);
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

        // Fast Path 2: Progressive HTTP Range Streaming direct from streamUrl (Page 1 in <1s)
        let doc = null;
        try {
          const loadingTask = pdfjs.getDocument({
            url: streamUrl,
            withCredentials: false,
            rangeChunkSize: 65536, // 64KB initial chunk for rapid preview
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
          // Resilient Fallback: Stream directly via fetch
          const response = await fetch(streamUrl);
          if (!response.ok) {
            throw new Error(`Failed to load document stream (HTTP ${response.status}).`);
          }
          const arrayBuffer = await response.arrayBuffer();
          globalPdfBufferCache.set(book.id, arrayBuffer);

          const fallbackTask = pdfjs.getDocument({
            data: arrayBuffer,
            cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
            cMapPacked: true
          });
          doc = await fallbackTask.promise;
        }

        if (!isMounted) return;

        // Populate in-memory cache in background if not already cached
        if (!globalPdfBufferCache.has(book.id) && doc && doc.getData) {
          doc.getData().then((data) => {
            globalPdfBufferCache.set(book.id, data);
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
        if ((errMsg.includes('502') || errMsg.includes('503') || errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) && retryCount < 2) {
          setTimeout(() => {
            if (isMounted) setRetryCount((c) => c + 1);
          }, 3000);
          return;
        }

        let userMsg = errMsg || 'Unable to render document inline.';
        if (errMsg.includes('502') || errMsg.includes('503')) {
          userMsg = 'Cloud server is waking up or updating. Please wait a few seconds and click Retry.';
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

        // Responsive base scale (1.2 default, scaled with zoomLevel)
        const baseScale = 1.25 * (zoomLevel / 100);
        const effectiveRotation = ((page.rotate || 0) + rotation) % 360;
        const viewport = page.getViewport({ scale: baseScale, rotation: effectiveRotation });

        // High DPI sharpness support for Retina and mobile displays
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null;

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
  }, [pdfDoc, currentPage, zoomLevel, rotation, isTextMode]);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={onClose}
              className="btn btn-outline"
              style={{ padding: '0.45rem', borderRadius: '50%' }}
              title="Close Reader (Esc)"
            >
              <X size={18} />
            </button>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {book.title}
              </h3>
              <p style={{ fontSize: '0.75rem', opacity: 0.75, margin: 0 }}>
                {book.author} • {book.categoryName}
              </p>
            </div>
          </div>

          {/* Center: Page Controls */}
          <div className="reader-toolbar-center">
            <button
              className="btn btn-outline"
              style={{ padding: '0.4rem' }}
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              title="Previous Page"
            >
              <ChevronLeft size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', fontWeight: 600 }}>
              <span>Page</span>
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
                style={{
                  width: 44,
                  padding: '2px 4px',
                  textAlign: 'center',
                  borderRadius: 4,
                  border: '1px solid var(--border-color)',
                  background: 'inherit',
                  color: 'inherit',
                  fontWeight: 700
                }}
              />
              <span>of {totalPages}</span>
            </div>

            <button
              className="btn btn-outline"
              style={{ padding: '0.4rem' }}
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              title="Next Page"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Right: Theme, Zoom, Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            {/* Theme switcher */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.06)', borderRadius: 6, padding: 2 }}>
              <button
                style={{
                  padding: '4px 6px',
                  borderRadius: 4,
                  background: theme === 'light' ? '#fff' : 'transparent',
                  color: theme === 'light' ? '#002e3b' : 'inherit',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onClick={() => setTheme('light')}
                title="Light Mode"
              >
                <Sun size={15} />
              </button>
              <button
                style={{
                  padding: '4px 6px',
                  borderRadius: 4,
                  background: theme === 'sepia' ? '#fbf0d9' : 'transparent',
                  color: theme === 'sepia' ? '#5f4b32' : 'inherit',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onClick={() => setTheme('sepia')}
                title="Warm Sepia Mode"
              >
                <Coffee size={15} />
              </button>
              <button
                style={{
                  padding: '4px 6px',
                  borderRadius: 4,
                  background: theme === 'dark' ? '#0f172a' : 'transparent',
                  color: theme === 'dark' ? '#fff' : 'inherit',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onClick={() => setTheme('dark')}
                title="Night Mode"
              >
                <Moon size={15} />
              </button>
            </div>

            {/* Rotate Document button (Universal: Visible on both mobile and desktop) */}
            <button
              className="btn btn-outline"
              style={{
                padding: '0.4rem 0.55rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                borderColor: rotation > 0 ? 'var(--primary, #00d287)' : 'rgba(128, 128, 128, 0.3)',
                color: rotation > 0 ? 'var(--primary, #00d287)' : 'inherit',
                fontWeight: 600,
                fontSize: '0.78rem'
              }}
              onClick={() => setRotation((r) => (r + 90) % 360)}
              title={`Rotate 90° Clockwise (Current: ${rotation}°)`}
            >
              <RotateCw size={16} />
              <span className="rotate-btn-text" style={{ fontSize: '0.75rem' }}>
                {rotation > 0 ? `${rotation}°` : 'Rotate'}
              </span>
            </button>

            {/* Bookmark (Always visible on mobile & desktop) */}
            <button
              className="btn btn-outline"
              style={{ padding: '0.4rem' }}
              onClick={() => onToggleBookmark(book.id)}
              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark this Document'}
            >
              <Bookmark
                size={16}
                fill={isBookmarked ? '#ff5e36' : 'transparent'}
                color={isBookmarked ? '#ff5e36' : 'currentColor'}
              />
            </button>

            {/* Desktop Only Tools (Zoom, Download, Full Tab, Fullscreen) */}
            <div className="reader-desktop-tools" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                className="btn btn-outline"
                style={{ padding: '0.4rem' }}
                onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <button
                onClick={() => setZoomLevel(100)}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  minWidth: 38,
                  textAlign: 'center',
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer'
                }}
                title="Reset Zoom to 100%"
              >
                {zoomLevel}%
              </button>
              <button
                className="btn btn-outline"
                style={{ padding: '0.4rem' }}
                onClick={() => setZoomLevel((z) => Math.min(220, z + 15))}
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>

              <button
                onClick={handleDownload}
                className="btn btn-outline"
                style={{ padding: '0.4rem' }}
                title="Download Document"
              >
                <Download size={16} />
              </button>

              <a
                href={streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
                style={{ padding: '0.4rem' }}
                title="Open Document in Full Tab"
              >
                <ExternalLink size={16} />
              </a>

              <button
                className="btn btn-outline"
                style={{ padding: '0.4rem' }}
                onClick={toggleFullscreen}
                title="Toggle Fullscreen"
              >
                <Maximize size={16} />
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    Page {currentPage} of {totalPages} ({Math.round((currentPage / totalPages) * 100)}%)
                  </span>

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
