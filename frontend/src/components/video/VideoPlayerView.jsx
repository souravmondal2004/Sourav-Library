import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ThumbsUp,
  Share2,
  BookmarkPlus,
  Check,
  ListVideo,
  Play,
  CheckCircle2,
  Tv,
  Eye,
  Calendar,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { videoService } from '../../services/videoService';

export default function VideoPlayerView({
  video,
  onBack,
  onSelectVideo,
  allVideos = []
}) {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(video?.likes || 0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [activePlaylistItem, setActivePlaylistItem] = useState(null);

  useEffect(() => {
    if (video) {
      setIsLiked(videoService.isLiked(video.id));
      setLikeCount(video.likes || 0);
      videoService.incrementViews(video.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Set initial playlist item if playlist
      if (video.playlistItems && video.playlistItems.length > 0) {
        setActivePlaylistItem(video.playlistItems[0]);
      } else {
        setActivePlaylistItem(null);
      }
    }
  }, [video?.id]);

  if (!video) return null;

  const handleLikeToggle = () => {
    const res = videoService.toggleLike(video.id);
    setIsLiked(res.isLiked);
    setLikeCount((prev) => (res.isLiked ? prev + 1 : Math.max(0, prev - 1)));
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2500);
    }
  };

  // Recommended up-next videos (excluding current)
  const upNextVideos = allVideos.filter((v) => v.id !== video.id).slice(0, 8);

  // Determine iframe source
  const getEmbedSource = () => {
    if (video.type === 'direct_upload') return null;

    if (activePlaylistItem?.youtubeId) {
      return `https://www.youtube-nocookie.com/embed/${activePlaylistItem.youtubeId}?autoplay=1&rel=0`;
    }

    if (video.playlistId) {
      if (video.youtubeId && video.youtubeId !== 'playlist') {
        return `https://www.youtube-nocookie.com/embed/${video.youtubeId}?list=${video.playlistId}&autoplay=1&rel=0`;
      }
      return `https://www.youtube-nocookie.com/embed/videoseries?list=${video.playlistId}&autoplay=1&rel=0`;
    }

    if (video.youtubeId) {
      return `https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`;
    }

    return null;
  };

  const embedSrc = getEmbedSource();

  return (
    <div className="video-player-page container">
      {/* Top Back Navigation */}
      <div className="video-player-topbar">
        <button className="btn btn-outline video-back-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to Video Hub</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="video-category-tag">{video.category}</span>
          {video.isPlaylist && (
            <span className="video-playlist-pill">
              <ListVideo size={14} /> Playlist Mode
            </span>
          )}
        </div>
      </div>

      <div className="video-player-layout">
        {/* Main Player Left Column */}
        <div className="video-main-column">
          {/* Responsive 16:9 Video Canvas */}
          <div className="video-canvas-container">
            {video.type === 'direct_upload' ? (
              <video
                src={video.videoFileUrl}
                controls
                autoPlay
                className="video-native-element"
                poster={video.thumbnailUrl}
              >
                Your browser does not support HTML5 video streaming.
              </video>
            ) : embedSrc ? (
              <iframe
                src={embedSrc}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="video-iframe-element"
              />
            ) : (
              <div className="video-placeholder-fallback">
                <Tv size={48} color="var(--text-muted)" />
                <p>Video streaming link unavailable.</p>
              </div>
            )}
          </div>

          {/* Video Metadata & Controls */}
          <div className="video-meta-section">
            <h1 className="video-watch-title">{video.title}</h1>

            <div className="video-watch-subbar">
              {/* Creator Info */}
              <div className="video-creator-box">
                <img
                  src={video.creatorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
                  alt={video.creator}
                  className="creator-avatar-img"
                />
                <div>
                  <div className="creator-name-row">
                    <span className="creator-name">{video.creator}</span>
                    <CheckCircle2 size={14} color="#10b981" />
                  </div>
                  <span className="creator-subs">124K subscribers</span>
                </div>

                <button
                  className={`btn ${isSubscribed ? 'btn-outline subscribed' : 'btn-primary subscribe-btn'}`}
                  onClick={() => setIsSubscribed(!isSubscribed)}
                >
                  {isSubscribed ? (
                    <>
                      <Check size={14} /> Subscribed
                    </>
                  ) : (
                    'Subscribe'
                  )}
                </button>
              </div>

              {/* Action Buttons: Like, Share, YouTube Link */}
              <div className="video-actions-cluster">
                <button
                  className={`video-action-pill ${isLiked ? 'liked' : ''}`}
                  onClick={handleLikeToggle}
                  title="Like this video"
                >
                  <ThumbsUp size={16} />
                  <span>{likeCount.toLocaleString()}</span>
                </button>

                <button
                  className="video-action-pill"
                  onClick={handleShare}
                  title="Share video"
                >
                  <Share2 size={16} />
                  <span>Share</span>
                </button>

                {video.youtubeUrl && (
                  <a
                    href={video.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="video-action-pill external"
                    title="Open on YouTube"
                  >
                    <ExternalLink size={15} />
                    <span>YouTube</span>
                  </a>
                )}
              </div>
            </div>

            {/* Share Toast */}
            {showShareToast && (
              <div className="share-toast-banner">
                <Check size={14} /> Link copied to clipboard!
              </div>
            )}

            {/* Expandable Description Card */}
            <div className="video-desc-box">
              <div className="video-views-date-row">
                <span className="meta-stat">
                  <Eye size={14} /> {(video.views || 0).toLocaleString()} views
                </span>
                <span className="meta-dot">•</span>
                <span className="meta-stat">
                  <Calendar size={14} /> {video.uploadedAt || 'Recently uploaded'}
                </span>
                <span className="meta-dot">•</span>
                <span className="meta-tag">#{video.category.replace(/\s+/g, '')}</span>
              </div>

              <div className={`video-desc-text ${isDescExpanded ? 'expanded' : 'clamped'}`}>
                {video.description ? (
                  video.description.split('\n').map((line, idx) => (
                    <p key={idx} style={{ margin: '0 0 6px 0' }}>
                      {line}
                    </p>
                  ))
                ) : (
                  <p>Comprehensive video lesson provided by {video.creator}.</p>
                )}
              </div>

              <button
                className="btn-show-more"
                onClick={() => setIsDescExpanded(!isDescExpanded)}
              >
                {isDescExpanded ? 'Show less' : '...Show more'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Playlist Queue & Recommended Videos */}
        <div className="video-sidebar-column">
          {/* Playlist Queue Box if playlist */}
          {video.isPlaylist && video.playlistItems && video.playlistItems.length > 0 && (
            <div className="playlist-queue-card">
              <div className="playlist-queue-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ListVideo size={18} color="#10b981" />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                      Playlist Tracks
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {video.playlistItems.length} videos • Auto-advancing
                    </div>
                  </div>
                </div>
              </div>

              <div className="playlist-queue-list">
                {video.playlistItems.map((item, index) => {
                  const isCurrent = activePlaylistItem?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`playlist-item-row ${isCurrent ? 'active' : ''}`}
                      onClick={() => setActivePlaylistItem(item)}
                    >
                      <span className="playlist-index">
                        {isCurrent ? <Play size={12} color="#10b981" fill="#10b981" /> : index + 1}
                      </span>
                      <div className="playlist-item-info">
                        <div className="playlist-item-title">{item.title}</div>
                        <span className="playlist-item-dur">{item.duration}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Up Next / Recommendations */}
          <div className="up-next-section">
            <h3 className="up-next-heading">Recommended Videos</h3>
            <div className="up-next-list">
              {upNextVideos.map((item) => (
                <div
                  key={item.id}
                  className="up-next-card"
                  onClick={() => onSelectVideo(item)}
                >
                  <div className="up-next-thumb-box">
                    <img src={item.thumbnailUrl} alt={item.title} />
                    <span className="thumb-duration-pill">{item.duration}</span>
                    {item.isPlaylist && (
                      <span className="thumb-playlist-badge">
                        <ListVideo size={11} />
                      </span>
                    )}
                  </div>
                  <div className="up-next-meta">
                    <div className="up-next-title">{item.title}</div>
                    <div className="up-next-channel">{item.creator}</div>
                    <div className="up-next-stats">
                      {(item.views || 0).toLocaleString()} views • {item.uploadedAt}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
