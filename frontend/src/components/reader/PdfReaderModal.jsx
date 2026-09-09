import React, { useState, useEffect } from 'react';
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
  BookOpen,
  ExternalLink
} from 'lucide-react';
import { api } from '../../services/api';

export default function PdfReaderModal({
  book,
  onClose,
  currentUser,
  isBookmarked,
  onToggleBookmark
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [theme, setTheme] = useState('light'); // 'light', 'sepia', 'dark'
  const [isFullscreen, setIsFullscreen] = useState(false);

  const totalPages = book.pageCount || 1;
  const streamUrl = `${api.documents.getStreamUrl(book.id)}#page=${currentPage}&zoom=${zoomLevel}`;

  // Automatically save reading progress periodically or when page changes
  useEffect(() => {
    if (currentUser && book) {
      const progressPercent = Math.min(100, Math.round((currentPage / totalPages) * 100));
      api.library.updateProgress(book.id, currentPage, progressPercent).catch(() => {});
    }
  }, [currentPage, book, currentUser, totalPages]);

  // Handle keyboard navigation (ArrowLeft, ArrowRight, Esc)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentPage((prev) => Math.min(totalPages, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
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
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, maxWidth: 350, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Theme switcher */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.06)', borderRadius: 6, padding: 2 }}>
              <button
                style={{
                  padding: '4px 6px',
                  borderRadius: 4,
                  background: theme === 'light' ? '#fff' : 'transparent',
                  color: theme === 'light' ? '#002e3b' : 'inherit'
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
                  color: theme === 'sepia' ? '#5f4b32' : 'inherit'
                }}
                onClick={() => setTheme('sepia')}
                title="Sepia Warm Mode"
              >
                <Coffee size={15} />
              </button>
              <button
                style={{
                  padding: '4px 6px',
                  borderRadius: 4,
                  background: theme === 'dark' ? '#0f172a' : 'transparent',
                  color: theme === 'dark' ? '#fff' : 'inherit'
                }}
                onClick={() => setTheme('dark')}
                title="Night Mode"
              >
                <Moon size={15} />
              </button>
            </div>

            {/* Zoom */}
            <button
              className="btn btn-outline"
              style={{ padding: '0.4rem' }}
              onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: 36, textAlign: 'center' }}>
              {zoomLevel}%
            </span>
            <button
              className="btn btn-outline"
              style={{ padding: '0.4rem' }}
              onClick={() => setZoomLevel((z) => Math.min(200, z + 15))}
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>

            {/* Bookmark */}
            <button
              className="btn btn-outline"
              style={{ padding: '0.4rem' }}
              onClick={() => onToggleBookmark(book.id)}
              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark this Book'}
            >
              <Bookmark
                size={16}
                fill={isBookmarked ? '#ff5e36' : 'transparent'}
                color={isBookmarked ? '#ff5e36' : 'currentColor'}
              />
            </button>

            {/* Download */}
            <a
              href={api.documents.getDownloadUrl(book.id)}
              download
              className="btn btn-outline"
              style={{ padding: '0.4rem' }}
              title="Download PDF"
            >
              <Download size={16} />
            </a>

            {/* Open in New Window / External Reader */}
            <a
              href={api.documents.getStreamUrl(book.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              style={{ padding: '0.4rem' }}
              title="Open PDF in Full Tab"
            >
              <ExternalLink size={16} />
            </a>

            {/* Fullscreen */}
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

        {/* Reader Content Body */}
        <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {book.pages && book.pages.length > 0 ? (
            <div style={{
              flex: 1,
              maxWidth: 860,
              width: '100%',
              margin: '0 auto',
              padding: `${2 * (zoomLevel / 100)}rem ${2.5 * (zoomLevel / 100)}rem`,
              fontSize: `${1.05 * (zoomLevel / 100)}rem`,
              lineHeight: 1.8,
              transition: 'all 0.2s ease'
            }}>
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
                      {pageData.title || `Page ${currentPage}`}
                    </h2>

                    <div style={{ whiteSpace: 'pre-line', marginBottom: '3rem', letterSpacing: '0.01em' }}>
                      {pageData.content}
                    </div>

                    {/* Bottom Page Navigation Controls */}
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
          ) : (
            <object
              data={streamUrl}
              type="application/pdf"
              className="reader-content-frame"
              style={{ width: '100%', height: '100%' }}
            >
              <iframe
                src={streamUrl}
                title={book.title}
                className="reader-content-frame"
                style={{ width: '100%', height: '100%', border: 'none' }}
              >
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <p style={{ marginBottom: '1rem' }}>Your device cannot preview this PDF inline.</p>
                  <a
                    href={api.documents.getStreamUrl(book.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    Open PDF in Full Tab
                  </a>
                </div>
              </iframe>
            </object>
          )}
        </div>
      </div>
    </div>
  );
}
