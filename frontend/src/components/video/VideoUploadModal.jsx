import React, { useState } from 'react';
import { X, Upload, Film, ListVideo, Sparkles, Check, AlertCircle, Link2, Video } from 'lucide-react';
import YoutubeIcon from '../common/YoutubeIcon';
import { parseYouTubeUrl } from '../../services/videoService';

export default function VideoUploadModal({ isOpen, onClose, onVideoAdded }) {
  const [activeTab, setActiveTab] = useState('youtube'); // 'youtube' | 'direct'
  
  // YouTube tab state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [creator, setCreator] = useState('');
  const [category, setCategory] = useState('Programming');
  const [description, setDescription] = useState('');
  const [parsedPreview, setParsedPreview] = useState(null);
  const [urlError, setUrlError] = useState('');

  // Direct upload tab state
  const [videoFile, setVideoFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleUrlChange = (url) => {
    setYoutubeUrl(url);
    setUrlError('');
    if (!url.trim()) {
      setParsedPreview(null);
      return;
    }

    const parsed = parseYouTubeUrl(url);
    if (parsed && parsed.isYouTube) {
      setParsedPreview(parsed);
      // Auto-populate title suggestion if empty
      if (!title) {
        setTitle(parsed.playlistId ? 'Custom YouTube Study Playlist' : 'YouTube Video Tutorial');
      }
      if (!creator) {
        setCreator('YouTube Creator');
      }
    } else {
      setParsedPreview(null);
      setUrlError('Please enter a valid YouTube video or playlist URL (e.g. youtube.com/watch?v=... or playlist?list=...)');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        alert('Please select a valid video file (MP4, WebM, etc.)');
        return;
      }
      setVideoFile(file);
      setFileName(file.name);
      const objectUrl = URL.createObjectURL(file);
      setFilePreviewUrl(objectUrl);
      if (!title) {
        // Strip extension
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(cleanName);
      }
      if (!creator) {
        setCreator('Admin Upload');
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please provide a video title');
      return;
    }

    setIsSubmitting(true);

    if (activeTab === 'youtube') {
      if (!parsedPreview) {
        alert('Please enter a valid YouTube video or playlist link');
        setIsSubmitting(false);
        return;
      }

      const newVideo = {
        title: title.trim(),
        creator: creator.trim() || 'Featured Creator',
        creatorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        type: parsedPreview.playlistId ? 'youtube_playlist' : 'youtube',
        youtubeUrl: youtubeUrl.trim(),
        youtubeId: parsedPreview.videoId || 'playlist',
        playlistId: parsedPreview.playlistId || null,
        thumbnailUrl: parsedPreview.thumbnailUrl,
        category,
        duration: parsedPreview.playlistId ? 'Playlist Collection' : 'Video Tutorial',
        description: description.trim() || 'Uploaded video lesson.'
      };

      onVideoAdded(newVideo);
      setIsSubmitting(false);
      onClose();
    } else {
      if (!videoFile && !filePreviewUrl) {
        alert('Please select a video file to upload');
        setIsSubmitting(false);
        return;
      }

      const newVideo = {
        title: title.trim(),
        creator: creator.trim() || 'Admin Upload',
        creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
        type: 'direct_upload',
        videoFileUrl: filePreviewUrl,
        thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
        category,
        duration: 'Uploaded Video',
        description: description.trim() || 'Directly uploaded media file.'
      };

      onVideoAdded(newVideo);
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content video-upload-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '92%' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="video-icon-pill">
              <Film size={20} color="#10b981" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Add Video to Studio</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Publish YouTube videos, playlists, or direct video files
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs: YouTube vs Direct File */}
        <div className="video-modal-tabs">
          <button
            type="button"
            className={`video-modal-tab ${activeTab === 'youtube' ? 'active' : ''}`}
            onClick={() => setActiveTab('youtube')}
          >
            <YoutubeIcon size={18} color={activeTab === 'youtube' ? '#ff0000' : 'currentColor'} />
            <span>YouTube Video / Playlist</span>
          </button>
          <button
            type="button"
            className={`video-modal-tab ${activeTab === 'direct' ? 'active' : ''}`}
            onClick={() => setActiveTab('direct')}
          >
            <Upload size={17} color={activeTab === 'direct' ? '#10b981' : 'currentColor'} />
            <span>Upload Video File (MP4)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem' }}>
          {activeTab === 'youtube' ? (
            <div className="form-group" style={{ marginBottom: '1.2rem' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>YouTube Video or Playlist URL *</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-emerald-light)' }}>
                  Supports playlists & videos
                </span>
              </label>
              <div style={{ position: 'relative' }}>
                <Link2 size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="url"
                  className="form-input"
                  style={{ paddingLeft: '2.2rem' }}
                  placeholder="https://www.youtube.com/watch?v=... or playlist?list=..."
                  value={youtubeUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  required
                />
              </div>

              {urlError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: '0.78rem', marginTop: 6 }}>
                  <AlertCircle size={14} />
                  <span>{urlError}</span>
                </div>
              )}

              {parsedPreview && (
                <div className="youtube-detect-preview">
                  <div className="detect-thumb-box">
                    <img src={parsedPreview.thumbnailUrl} alt="Thumbnail preview" />
                    {parsedPreview.playlistId && (
                      <span className="playlist-badge-small">
                        <ListVideo size={12} /> Playlist
                      </span>
                    )}
                  </div>
                  <div className="detect-info">
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                      {parsedPreview.playlistId ? 'YouTube Playlist Detected' : 'YouTube Video Detected'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-emerald-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Check size={12} /> Verified playable embed ready
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="form-group" style={{ marginBottom: '1.2rem' }}>
              <label className="form-label">Select Video File (MP4, WebM) *</label>
              <div className="video-dropzone">
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/ogg"
                  onChange={handleFileChange}
                  id="direct-video-input"
                  style={{ display: 'none' }}
                />
                <label htmlFor="direct-video-input" style={{ cursor: 'pointer', textAlign: 'center', width: '100%', display: 'block' }}>
                  <Upload size={32} color="var(--color-emerald-light)" style={{ margin: '0 auto 8px', opacity: 0.85 }} />
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                    {fileName ? fileName : 'Click or Drag & Drop Video File'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Supports MP4, WebM, and MKV
                  </div>
                </label>
              </div>

              {filePreviewUrl && (
                <div style={{ marginTop: 10, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-card)' }}>
                  <video src={filePreviewUrl} controls style={{ width: '100%', maxHeight: 180, display: 'block', background: '#000' }} />
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Master Full Stack Java & React Development"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Creator & Category Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Creator / Channel Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Sourav Coding"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Programming">Programming & Code</option>
                <option value="Artificial Intelligence">Artificial Intelligence</option>
                <option value="Backend & Cloud">Backend & Cloud</option>
                <option value="Frontend & UI">Frontend & UI</option>
                <option value="System Design">System Design</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Tutorials">Tutorials</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Description & Topics</label>
            <textarea
              className="form-input"
              rows="3"
              placeholder="Brief summary of what this video or playlist covers..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Publishing...' : 'Publish Video to Catalog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
