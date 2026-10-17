import React from 'react';
import { Layers, BookOpen, GraduationCap, Microscope, Code, Landmark, Briefcase, FileText } from 'lucide-react';

export default function CategoryTabs({ categories, selectedCategory, onSelectCategory, t }) {
  const getCategoryIcon = (name = '') => {
    const lower = name.toLowerCase();
    if (lower.includes('tech') || lower.includes('computer') || lower.includes('code')) return <Code size={13} style={{ marginRight: 5 }} />;
    if (lower.includes('science') || lower.includes('physics') || lower.includes('chem')) return <Microscope size={13} style={{ marginRight: 5 }} />;
    if (lower.includes('history') || lower.includes('culture') || lower.includes('art')) return <Landmark size={13} style={{ marginRight: 5 }} />;
    if (lower.includes('business') || lower.includes('career') || lower.includes('finance')) return <Briefcase size={13} style={{ marginRight: 5 }} />;
    if (lower.includes('education') || lower.includes('academic') || lower.includes('exam')) return <GraduationCap size={13} style={{ marginRight: 5 }} />;
    return <BookOpen size={13} style={{ marginRight: 5 }} />;
  };

  return (
    <div className="container" style={{ marginTop: '0.5rem' }}>
      <div className="category-chips-bar" role="tablist" aria-label="Browse by discipline">
        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === null}
          className={`category-chip ${selectedCategory === null ? 'active' : ''}`}
          onClick={() => onSelectCategory(null)}
        >
          <Layers size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
          {t?.allBooks || 'All Books'}
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={selectedCategory === cat.id}
            className={`category-chip ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => onSelectCategory(cat.id)}
          >
            {getCategoryIcon(cat.name)}
            <span>{cat.name}</span>
            {cat.documentCount > 0 && (
              <span style={{
                marginLeft: 6,
                fontSize: '0.72rem',
                opacity: 0.8,
                background: selectedCategory === cat.id ? 'rgba(255,255,255,0.2)' : 'rgba(0,33,71,0.08)',
                padding: '1px 5px',
                borderRadius: 4
              }}>
                {cat.documentCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
