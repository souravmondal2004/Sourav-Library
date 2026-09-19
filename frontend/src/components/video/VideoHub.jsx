import React, { useState } from 'react';
import {
  Play,
  ListVideo,
  Search,
  Upload,
  Film,
  Plus,
  Tv,
  CheckCircle2,
  Trash2,
  Sparkles,
  Radio
} from 'lucide-react';
import YoutubeIcon from '../common/YoutubeIcon';
import { videoService } from '../../services/videoService';
import VideoUploadModal from './VideoUploadModal';

const CATEGORIES = [
  'All',
  'Playlists',
  'Programming',
  'Artificial Intelligence',
  'Backend & Cloud',
  'Frontend & UI',
  'System Design',
  'Computer Science',
  'Direct Uploads'
];

export default function VideoHub({
  onSelectVideo,
  currentUser,
  videos = [],
  setVideos
}) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const isAdmin = currentUser?.role === 'ROLE_ADMIN';

  // Category & search filtering
  const filteredVideos = videos.filter((video) => {
    // Category match
    let matchesCategory = true;
    if (selectedCategory === 'Playlists') {
      matchesCategory = !!video.isPlaylist;
    } else if (selectedCategory === 'Direct Uploads') {
      matchesCategory = video.type === 'direct_upload';
    } else if (selectedCategory !== 'All') {
      matchesCategory = video.category === selectedCategory;
    }

    // Search query match
    let matchesSearch = true;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      matchesSearch =
        (video.title && video.title.toLowerCase().includes(q)) ||
        (video.creator && video.creator.toLowerCase().includes(q)) ||
        (video.category && video.category.toLowerCase().includes(q)) ||
        (video.description && video.description.toLowerCase().includes(q));
    }

    return matchesCategory && matchesSearch;
  });

  const handleVideoAdded = (newVideo) => {
    const created = videoService.addVideo(newVideo);
    setVideos([created, ...videos]);
  };

  const handleDeleteVideo = (e, videoId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to remove this video?')) {
      const remaining = videoService.deleteVideo(videoId);
      setVideos(remaining);
    }
  };

  return (
    <div className="video-hub-container container">
      {/* Top Banner / Hero */}
      <div className="video-hub-hero">
        <div className="video-hero-content">
          <div className="video-hero-badge">
            <YoutubeIcon size={16} color="#ff0000" />
            <span>YouTube & Studio Video Streamer</span>
          </div>
          <h1 className="video-hero-title">
            Master Engineering, AI & Design Through High-Definition Video
          </h1>
          <p className="video-hero-subtitle">
            Watch full courses, curated YouTube playlists, system design deep-dives, and upload your own study videos with zero buffering.
          </p>
        </div>

        <div className="video-hero-actions">
          <button
            className="btn btn-primary"
            onClick={() => setIsUploadOpen(true)}
          >
            <Plus size={16} />
            <span>Add Video / Playlist</span>
          </button>
        </div>
      </div>

      {/* Video Filter & Search Bar */}
      <div className="video-controls-bar">
        {/* Category Pills */}
        <div className="video-category-pills">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`video-cat-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'Playlists' && <ListVideo size={13} style={{ marginRight: 4 }} />}
              {cat}
            </button>
          ))}
        </div>

        {/* Video Search */}
        <div className="video-search-wrapper">
          <Search size={16} className="video-search-icon" />
          <input
            type="text"
            className="video-search-input"
            placeholder="Search videos, playlists, topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="video-search-clear"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Video Cards Grid (YouTube App Layout) */}
      {filteredVideos.length === 0 ? (
        <div className="video-empty-state">
          <Tv size={48} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <h3>No videos found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 420, margin: '8px auto 16px' }}>
            {searchQuery
              ? `No videos matched "${searchQuery}". Try different keywords.`
              : `No videos available in category "${selectedCategory}".`}
          </p>
          <button className="btn btn-primary" onClick={() => setIsUploadOpen(true)}>
            <Plus size={16} /> Add First Video
          </button>
        </div>
      ) : (
        <div className="video-cards-grid">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="yt-video-card"
              onClick={() => onSelectVideo(video)}
            >
              {/* Thumbnail Box */}
              <div className="yt-thumb-wrapper">
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="yt-thumb-image"
                  loading="lazy"
                />

                {/* Duration / Playlist Pill */}
                <div className="yt-duration-pill">
                  {video.duration}
                </div>

                {/* Playlist Overlay Banner if playlist */}
                {video.isPlaylist && (
                  <div className="yt-playlist-overlay">
                    <ListVideo size={16} />
                    <span>{video.playlistCount ? `${video.playlistCount} VIDEOS` : 'PLAYLIST'}</span>
                  </div>
                )}

                {/* Hover Play Button */}
                <div className="yt-hover-play">
                  <div className="yt-hover-circle">
                    <Play size={20} fill="#fff" color="#fff" style={{ marginLeft: 2 }} />
                  </div>
                </div>
              </div>

              {/* Video Info Details */}
              <div className="yt-info-wrapper">
                <img
                  src={video.creatorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
                  alt={video.creator}
                  className="yt-channel-avatar"
                />
                <div className="yt-meta-details">
                  <h3 className="yt-title" title={video.title}>
                    {video.title}
                  </h3>
                  <div className="yt-channel-name">
                    <span>{video.creator}</span>
                    <CheckCircle2 size={13} color="var(--color-emerald-light)" />
                  </div>
                  <div className="yt-views-date">
                    <span>{(video.views || 0).toLocaleString()} views</span>
                    <span className="yt-dot">•</span>
                    <span>{video.uploadedAt || 'Recently uploaded'}</span>
                  </div>
                </div>

                {/* Admin delete button */}
                {isAdmin && (
                  <button
                    className="yt-delete-btn"
                    onClick={(e) => handleDeleteVideo(e, video.id)}
                    title="Remove Video"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <VideoUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onVideoAdded={handleVideoAdded}
      />
    </div>
  );
}
