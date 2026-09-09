import React from 'react';
import { Layers } from 'lucide-react';

export default function CategoryTabs({ categories, selectedCategory, onSelectCategory }) {
  return (
    <div className="container">
      <div className="category-chips-bar">
        <button
          className={`category-chip ${selectedCategory === null ? 'active' : ''}`}
          onClick={() => onSelectCategory(null)}
        >
          <Layers size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          All Documents
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`category-chip ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => onSelectCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
