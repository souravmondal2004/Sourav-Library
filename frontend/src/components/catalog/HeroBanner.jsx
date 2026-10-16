import React, { useState } from 'react';
import { BookOpen, Search, Mic, Bookmark, Eye, Layers, Sparkles, GraduationCap, School, Microscope, Briefcase, Award } from 'lucide-react';

export default function HeroBanner({
  featuredBook,
  onReadBook,
  onToggleBookmark,
  isBookmarked,
  onUploadPdf,
  searchQuery = '',
  setSearchQuery,
  onSelectCategory,
  categories = []
}) {
  const [selectedFormat, setSelectedFormat] = useState('all');
  const [isListening, setIsListening] = useState(false);

  // Voice Search integration using Web Speech API
  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice search is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (setSearchQuery) {
          setSearchQuery(transcript);
        }
      };
      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsListening(false);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    // Search is reactive through searchQuery state
  };

  return (
    <section className="ndli-hero-section">
      <div className="container ndli-hero-inner">
        {/* Institutional Tagline Badge */}
        <div className="ndli-hero-tagline">
          <Sparkles size={14} color="#ff9933" />
          <span>National Mission on Education • Open Access Knowledge Repository</span>
        </div>

        {/* Flagship Headline: "One Library • All of Knowledge" */}
        <h1 className="ndli-hero-title">
          One Library <span className="ndli-hero-title-highlight">• All of Knowledge</span>
        </h1>
        <p className="ndli-hero-desc">
          A single-source digital repository empowering learners across India and the globe. Discover textbooks, research papers, lecture series, and technical publications.
        </p>

        {/* NDLI Iconic Single-Window Federated Search Box */}
        <form onSubmit={handleSearchSubmit} className="ndli-search-box">
          <select
            className="ndli-search-category-select"
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            title="Filter by resource type"
            aria-label="Filter by resource format"
          >
            <option value="all">All Disciplines</option>
            <option value="books">Textbooks & Books</option>
            <option value="research">Research & Papers</option>
            <option value="videos">Video Lectures</option>
            <option value="notes">Lecture Notes</option>
            <option value="theses">Theses & Dissertations</option>
          </select>

          <div className="ndli-search-input-wrap">
            <input
              type="text"
              className="ndli-search-input-field"
              placeholder="Search by title, author, subject, or ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
              aria-label="Search repository"
            />
            {searchQuery && (
              <button
                type="button"
                className="ndli-search-clear-btn"
                onClick={() => setSearchQuery && setSearchQuery('')}
                title="Clear search query"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            className="ndli-search-mic-btn"
            onClick={handleVoiceSearch}
            title={isListening ? 'Listening for speech...' : 'Search by Voice'}
            style={{ color: isListening ? '#dc2626' : undefined }}
          >
            <Mic size={19} className={isListening ? 'animate-pulse' : ''} />
          </button>

          <button
            type="submit"
            className="ndli-search-submit-btn"
            title="Search the repository"
          >
            <Search size={18} />
            <span>Search</span>
          </button>
        </form>

        {/* NDLI Domain Facet Chips */}
        <div className="ndli-domain-chips">
          <span className="ndli-domain-label">Quick Domains:</span>
          <button
            type="button"
            className="ndli-domain-chip"
            onClick={() => onSelectCategory && onSelectCategory(null)}
          >
            <Layers size={13} /> All Collections
          </button>
          <button
            type="button"
            className="ndli-domain-chip"
            onClick={() => {
              const compSci = categories.find((c) => c.name.toLowerCase().includes('computer') || c.name.toLowerCase().includes('tech'));
              if (compSci && onSelectCategory) onSelectCategory(compSci.id);
            }}
          >
            <Microscope size={13} /> Engineering & Tech
          </button>
          <button
            type="button"
            className="ndli-domain-chip"
            onClick={() => {
              const science = categories.find((c) => c.name.toLowerCase().includes('science'));
              if (science && onSelectCategory) onSelectCategory(science.id);
            }}
          >
            <GraduationCap size={13} /> Higher Education
          </button>
          <button
            type="button"
            className="ndli-domain-chip"
            onClick={() => {
              const literature = categories.find((c) => c.name.toLowerCase().includes('fiction') || c.name.toLowerCase().includes('history') || c.name.toLowerCase().includes('literature'));
              if (literature && onSelectCategory) onSelectCategory(literature.id);
            }}
          >
            <School size={13} /> School Education
          </button>
          <button
            type="button"
            className="ndli-domain-chip"
            onClick={() => {
              const business = categories.find((c) => c.name.toLowerCase().includes('business') || c.name.toLowerCase().includes('career'));
              if (business && onSelectCategory) onSelectCategory(business.id);
            }}
          >
            <Briefcase size={13} /> Career & Industry
          </button>
        </div>

        {/* Spotlight Publication Card (NDLI Featured Recommendation) */}
        {featuredBook && (
          <div style={{
            marginTop: '2.5rem',
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#0f172a',
            borderRadius: '12px',
            padding: '1.25rem 1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
            textAlign: 'left',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            border: '1px solid #cbd5e1',
            flexWrap: 'wrap'
          }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  background: '#0d7751',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: 4,
                  textTransform: 'uppercase'
                }}>
                  Open Access Spotlight
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {featuredBook.categoryName} • Year {featuredBook.publishedYear || 2026}
                </span>
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#002147', fontWeight: 800, margin: '2px 0 4px 0' }}>
                {featuredBook.title}
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#475569', margin: 0, fontStyle: 'italic' }}>
                Author: {featuredBook.author} • {featuredBook.pageCount || 1} Pages • {featuredBook.viewCount || 0} Readers
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => onReadBook && onReadBook(featuredBook)}
                style={{ padding: '0.55rem 1.25rem' }}
              >
                <BookOpen size={15} />
                <span>Read Full Text</span>
              </button>

              <button
                className="btn btn-outline"
                style={{
                  color: '#002147',
                  borderColor: '#cbd5e1',
                  background: '#f8fafc',
                  padding: '0.55rem 0.85rem'
                }}
                onClick={() => onToggleBookmark && onToggleBookmark(featuredBook.id)}
                title={isBookmarked ? 'Remove Bookmark' : 'Save to Bookshelf'}
              >
                <Bookmark
                  size={16}
                  fill={isBookmarked ? '#d97706' : 'none'}
                  color={isBookmarked ? '#d97706' : 'currentColor'}
                />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
