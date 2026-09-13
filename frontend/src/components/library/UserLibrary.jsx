import React, { useState, useEffect } from 'react';
import { X, Bookmark, History, BookOpen } from 'lucide-react';
import { api } from '../../services/api';
import BookCard from '../catalog/BookCard';

export default function UserLibrary({ onClose, onReadBook, onToggleBookmark }) {
  const [activeTab, setActiveTab] = useState('bookmarks'); // 'bookmarks', 'history'
  const [bookmarks, setBookmarks] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLibrary = async () => {
      setLoading(true);
      try {
        const [bmList, histList] = await Promise.all([
          api.library.getBookmarks(),
          api.library.getHistory()
        ]);
        setBookmarks(bmList || []);
        setHistory(histList || []);
      } catch (err) {
        console.error('Failed to load library:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLibrary();
  }, []);

  const items = activeTab === 'bookmarks' ? bookmarks : history;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 840, maxHeight: '85vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="user-library-header">
          <div className="user-library-tabs">
            <button
              className={`btn ${activeTab === 'bookmarks' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('bookmarks')}
            >
              <Bookmark size={16} /> Saved ({bookmarks.length})
            </button>
            <button
              className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('history')}
            >
              <History size={16} /> History ({history.length})
            </button>
          </div>

          <button onClick={onClose} className="btn btn-outline user-library-close-btn" style={{ padding: '0.4rem' }}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading library...
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <BookOpen size={40} color="var(--color-emerald-light)" style={{ margin: '0 auto 1rem', opacity: 0.7 }} />
            <h4 style={{ color: '#ffffff', fontSize: '1.2rem' }}>
              {activeTab === 'bookmarks' ? 'No saved books yet' : 'No reading history yet'}
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 6, maxWidth: 420, margin: '0.5rem auto 1.5rem' }}>
              {activeTab === 'bookmarks'
                ? 'Click the bookmark icon on any publication to build your private library collection.'
                : 'Books you open in the interactive reader will automatically save your page progress here.'}
            </p>
            <button className="btn btn-primary" onClick={onClose}>
              Browse Catalog
            </button>
          </div>
        ) : (
          <div className="book-grid" style={{ marginBottom: 0 }}>
            {items.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onRead={onReadBook}
                onToggleBookmark={async (id) => {
                  await onToggleBookmark(id);
                  const updated = await api.library.getBookmarks();
                  setBookmarks(updated || []);
                }}
                isBookmarked={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
