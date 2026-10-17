import React, { useState } from 'react';
import { BookOpen, Search, Mic, Bookmark, Eye, Layers } from 'lucide-react';

export default function HeroBanner({
  featuredBook,
  onReadBook,
  onToggleBookmark,
  isBookmarked,
  onUploadPdf,
  searchQuery = '',
  setSearchQuery,
  onSelectCategory,
  categories = [],
  t
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
      recognition.lang = 'en-US';
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
  };

  return (
    <section className="ndli-hero-section">
      <div className="container ndli-hero-inner">
        {/* Tagline Badge (NO AI SIGN) */}
        <div className="ndli-hero-tagline">
          <BookOpen size={14} color="var(--color-purple, #a855f7)" />
          <span>{t?.heroTagline || "Open Access • Free Forever • Digital Repository"}</span>
        </div>

        {/* Headline */}
        <h1 className="ndli-hero-title">
          {t?.heroTitlePrefix || "Discover. Learn."}{' '}
          <span className="ndli-hero-title-highlight">{t?.heroTitleHighlight || "Grow."}</span>
        </h1>
        <p className="ndli-hero-desc">
          {t?.heroDesc || "Your premier digital library — access textbooks, research papers, lecture notes, and curated video courses. Free and open access."}
        </p>

        {/* Sharp, Crisp Search Box (Fixed blur & sizing) */}
        <form onSubmit={handleSearchSubmit} className="ndli-search-box">
          <select
            className="ndli-search-category-select"
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            title="Filter by category"
            aria-label="Filter by category"
          >
            <option value="all">{t?.all || 'All Categories'}</option>
            <option value="books">Textbooks</option>
            <option value="research">Research Papers</option>
            <option value="videos">Video Lectures</option>
            <option value="notes">Lecture Notes</option>
          </select>

          <div className="ndli-search-input-wrap">
            <input
              type="text"
              className="ndli-search-input-field"
              placeholder={t?.heroSearchPlaceholder || "Search by title, author, subject..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
              aria-label="Search library"
            />
            {searchQuery && (
              <button
                type="button"
                className="ndli-search-clear-btn"
                onClick={() => setSearchQuery && setSearchQuery('')}
                title="Clear"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            className="ndli-search-mic-btn"
            onClick={handleVoiceSearch}
            title={isListening ? 'Listening...' : 'Voice search'}
            style={{ color: isListening ? '#f43f5e' : undefined }}
          >
            <Mic size={18} className={isListening ? 'animate-pulse' : ''} />
          </button>

          <button
            type="submit"
            className="ndli-search-submit-btn"
            title="Search"
          >
            <Search size={17} />
            <span>{t?.heroSearchBtn || 'Search'}</span>
          </button>
        </form>

        {/* Quick Category Chips */}
        <div className="ndli-domain-chips">
          <span className="ndli-domain-label">{t?.browseBy || 'Browse:'}</span>
          <button
            type="button"
            className="ndli-domain-chip"
            onClick={() => onSelectCategory && onSelectCategory(null)}
          >
            <Layers size={13} /> {t?.all || 'All'}
          </button>
          <button
            type="button"
            className="ndli-domain-chip"
            onClick={() => {
              const compSci = categories.find((c) => c.name.toLowerCase().includes('computer') || c.name.toLowerCase().includes('tech'));
              if (compSci && onSelectCategory) onSelectCategory(compSci.id);
            }}
          >
            Technology & Code
          </button>
          <button
            type="button"
            className="ndli-domain-chip"
            onClick={() => {
              const science = categories.find((c) => c.name.toLowerCase().includes('science') || c.name.toLowerCase().includes('physics'));
              if (science && onSelectCategory) onSelectCategory(science.id);
            }}
          >
            Science & Engineering
          </button>
          <button
            type="button"
            className="ndli-domain-chip"
            onClick={() => {
              const bus = categories.find((c) => c.name.toLowerCase().includes('business') || c.name.toLowerCase().includes('career'));
              if (bus && onSelectCategory) onSelectCategory(bus.id);
            }}
          >
            Business & Growth
          </button>
        </div>

      </div>
    </section>
  );
}
