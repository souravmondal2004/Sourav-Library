import React, { useState, useEffect } from 'react';
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
  Radio,
  Cloud,
  RefreshCw
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
  'Algorithms',
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState(null);

  const isAdmin = currentUser && (currentUser.role === 'ROLE_ADMIN' || currentUser.role === 'ADMIN');

  // Auto-fetch latest videos from backend & Google Drive on mount
  useEffect(() => {
    videoService.fetchVideos().then((fresh) => {
      if (fresh && fresh.length > 0) {
        setVideos(fresh);
      }
    });
  }, []);

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

  const handleVideoAdded = async (newVideo) => {
    const created = await videoService.addVideo(newVideo);
    setVideos([created, ...videos.filter(v => v.id !== created.id)]);
    setSyncNotice('Saved & Auto-Synced with Google Drive ☁️');
    setTimeout(() => setSyncNotice(null), 4000);
  };

  const handleDeleteVideo = async (e, videoId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to remove this video? It will also be deleted from Google Drive.')) {
      const remaining = await videoService.deleteVideo(videoId);
      setVideos(remaining);
      setSyncNotice('Deleted & Synced with Google Drive ☁️');
      setTimeout(() => setSyncNotice(null), 3000);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncNotice('Syncing with Google Drive...');
    const res = await videoService.syncWithGoogleDrive();
    if (res.success) {
      setVideos(res.latest);
      setSyncNotice(`✅ Google Drive Synchronized (${res.latest.length} videos active)`);
    } else {
      setSyncNotice('Notice: Local catalog preserved');
    }
    setIsSyncing(false);
    setTimeout(() => setSyncNotice(null), 4000);
  };

  return (
    <div className="video-hub-container container">
      {/* Top Banner / Hero */}
      <div className="video-hub-hero">
        <div className="video-hero-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            <div className="video-hero-badge">
              <YoutubeIcon size={16} color="#ff0000" />
              <span>YouTube & Studio Video Streamer</span>
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '9999px',
              padding: '0.2rem 0.75rem',
              fontSize: '0.78rem',
              color: 'var(--color-emerald-light)',
              fontWeight: 600
            }}>
              <Cloud size={13} />
              <span>Google Drive Cloud Auto-Sync: Active</span>
            </div>
          </div>

          <h1 className="video-hero-title">
            Master Engineering, AI & Design Through High-Definition Video
          </h1>
          <p className="video-hero-subtitle">
            {isAdmin
              ? 'Admin Studio Mode: Upload courses, add curated YouTube playlists, and publish lessons permanently synced to Google Drive.'
              : 'Watch full courses, curated YouTube playlists, and system design deep-dives with zero buffering.'}
          </p>

          {syncNotice && (
            <div style={{
              marginTop: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '8px',
              padding: '0.35rem 0.85rem',
              color: '#38bdf8',
              fontSize: '0.82rem',
              fontWeight: 600
            }}>
              <CheckCircle2 size={14} />
              <span>{syncNotice}</span>
            </div>
          )}
        </div>

        <div className="video-hero-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={handleManualSync}
            disabled={isSyncing}
            title="Sync all playlists and videos with Google Drive folder 1ZwKXAE2dM9JmJIGl2HZap1RiW9CSeVPS"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} className={isSyncing ? 'spin-anim' : ''} />
            <span>{isSyncing ? 'Syncing Drive...' : 'Sync Google Drive'}</span>
          </button>

          {isAdmin && (
            <button
              className="btn btn-primary"
              onClick={() => setIsUploadOpen(true)}
            >
              <Plus size={16} />
              <span>Add Video / Playlist</span>
            </button>
          )}
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

      {/* Upload Modal (Only accessible and rendered for Admin) */}
      {isAdmin && (
        <VideoUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onVideoAdded={handleVideoAdded}
        />
      )}
    </div>
  );
}
