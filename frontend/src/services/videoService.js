// Video Service & YouTube link / uploaded video parser
const VIDEO_STORAGE_KEY = 'scribd_video_hub_catalog';
const LIKED_STORAGE_KEY = 'scribd_video_hub_liked';

/**
 * Extracts video ID, playlist ID, and embed parameters from a YouTube URL.
 */
export function parseYouTubeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  let videoId = null;
  let playlistId = null;

  try {
    // Check for playlist parameter in URL
    const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (listMatch) {
      playlistId = listMatch[1];
    }

    // Check for video ID
    // 1. Standard watch: youtube.com/watch?v=ID
    const watchMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (watchMatch) {
      videoId = watchMatch[1];
    }
  } catch (e) {
    console.error('Error parsing YouTube URL', e);
  }

  const isPlaylistOnly = !videoId && !!playlistId;
  const isYouTube = !!videoId || !!playlistId;

  let embedUrl = null;
  let thumbnailUrl = null;

  if (videoId) {
    thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    embedUrl = playlistId
      ? `https://www.youtube-nocookie.com/embed/${videoId}?list=${playlistId}&autoplay=1&rel=0`
      : `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
  } else if (playlistId) {
    thumbnailUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80';
    embedUrl = `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&autoplay=1&rel=0`;
  }

  return {
    isYouTube,
    videoId,
    playlistId,
    isPlaylistOnly,
    embedUrl,
    thumbnailUrl
  };
}

export const INITIAL_VIDEOS = [
  {
    id: 'vid-1',
    title: 'Spring Boot 3 & Microservices Full Course - From Scratch to Production',
    creator: 'Sourav Tech Academy',
    creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    type: 'youtube',
    youtubeUrl: 'https://www.youtube.com/watch?v=Gyk4s5hZz80',
    youtubeId: 'Gyk4s5hZz80',
    thumbnailUrl: 'https://img.youtube.com/vi/Gyk4s5hZz80/hqdefault.jpg',
    category: 'Backend & Cloud',
    duration: '2:45:10',
    views: 142800,
    likes: 8920,
    uploadedAt: '2 days ago',
    description: `Complete, production-ready masterclass on Spring Boot 3, REST APIs, JPA with Oracle/PostgreSQL, Spring Security JWT, and Docker containerization.

Topics Covered:
00:00 - Introduction & Project Architecture
15:30 - Spring Initializr & Dependency Setup
45:10 - Entity Mapping & JPA Repositories
1:20:00 - DTO Pattern & Service Layer
1:55:00 - JWT Authentication & Spring Security
2:25:00 - Dockerizing Spring Boot Application`,
    isPlaylist: false
  },
  {
    id: 'vid-2',
    title: 'Complete Modern React 19 & Full-Stack Web Development Playlist',
    creator: 'Sourav Coding Studio',
    creatorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    type: 'youtube_playlist',
    youtubeUrl: 'https://www.youtube.com/playlist?list=PL4cUxeGndAeAEhN4q7iW_2h_P3iXfX74x',
    playlistId: 'PL4cUxeGndAeAEhN4q7iW_2h_P3iXfX74x',
    youtubeId: 'j942wKiXFu8',
    thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=800&q=80',
    category: 'Frontend & UI',
    duration: '18 Videos • Complete Series',
    views: 318000,
    likes: 19400,
    uploadedAt: '1 week ago',
    description: `Full YouTube playlist series covering modern React development from component lifecycles to state management, hooks, suspense, and backend API integration.

Playlist Includes:
• React Fundamentals & Virtual DOM
• State & Props Architecture
• Custom Hooks & Context API
• Fast Vite Dev Server & Production Bundling
• Connecting with REST & GraphQL Backends`,
    isPlaylist: true,
    playlistCount: 18,
    playlistItems: [
      { id: 'p1-1', title: '01. React 19 Architecture & Setup', duration: '18:24', youtubeId: 'j942wKiXFu8' },
      { id: 'p1-2', title: '02. Components, JSX & Modern Props', duration: '22:15', youtubeId: 'G3e-cpL7ofc' },
      { id: 'p1-3', title: '03. useState, useEffect & Memory Management', duration: '29:40', youtubeId: '4pO-HcG2igk' },
      { id: 'p1-4', title: '04. Building Interactive UIs & State Handling', duration: '35:10', youtubeId: 'lawJczz0_aE' },
      { id: 'p1-5', title: '05. Asynchronous Data Fetching & Axios/Fetch', duration: '26:50', youtubeId: 'LDB4uaJ87e0' }
    ]
  },
  {
    id: 'vid-3',
    title: 'Generative AI & LLM Systems: Building Real-World AI Apps (Gemini & LangChain)',
    creator: 'Sourav AI Research',
    creatorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
    type: 'youtube',
    youtubeUrl: 'https://www.youtube.com/watch?v=kCc8FmEb1nY',
    youtubeId: 'kCc8FmEb1nY',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    category: 'Artificial Intelligence',
    duration: '1:54:20',
    views: 92400,
    likes: 6730,
    uploadedAt: '3 days ago',
    description: `Deep dive into architecting AI agents and chatbot systems using Gemini API, embeddings, vector databases, and retrieval augmented generation (RAG).

Features:
• Prompt Engineering & System Prompts
• Streaming Token Responses
• Memory & Multi-Turn Context Windows
• Code Generation & Tool Calling`,
    isPlaylist: false
  },
  {
    id: 'vid-4',
    title: 'System Design Interview Blueprint: Designing YouTube & Video Streaming Services',
    creator: 'High Scalability Lab',
    creatorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80',
    type: 'youtube',
    youtubeUrl: 'https://www.youtube.com/watch?v=jK328TQ6b-k',
    youtubeId: 'jK328TQ6b-k',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    category: 'System Design',
    duration: '1:12:45',
    views: 204500,
    likes: 15200,
    uploadedAt: '5 days ago',
    description: `How does YouTube store and stream billions of video minutes every day? Learn video chunking, MPEG-DASH/HLS protocols, CDNs, distributed transcoding, and database sharding.`,
    isPlaylist: false
  },
  {
    id: 'vid-5',
    title: 'Data Structures & Algorithms in Java: Master Graph Algorithms & Dynamic Programming',
    creator: 'Sourav DSA Club',
    creatorAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&q=80',
    type: 'youtube_playlist',
    youtubeUrl: 'https://www.youtube.com/playlist?list=PLgUwDviBIf0oF6QL8m22w1hIDC1vJ_BHz',
    playlistId: 'PLgUwDviBIf0oF6QL8m22w1hIDC1vJ_BHz',
    youtubeId: '0bHobWfHj8o',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    category: 'Computer Science',
    duration: '24 Videos • Complete DSA Track',
    views: 489000,
    likes: 31000,
    uploadedAt: '2 weeks ago',
    description: `Comprehensive playlist covering core graph algorithms (BFS, DFS, Dijkstra, Bellman Ford) and Dynamic Programming patterns with optimal time and space complexity.`,
    isPlaylist: true,
    playlistCount: 24,
    playlistItems: [
      { id: 'p2-1', title: 'Graph Representation & Adjacency Lists', duration: '14:30', youtubeId: '0bHobWfHj8o' },
      { id: 'p2-2', title: 'Breadth First Search (BFS) Traversal', duration: '20:10', youtubeId: '-tgVpUgsQ5A' },
      { id: 'p2-3', title: 'Depth First Search (DFS) Traversal', duration: '18:45', youtubeId: 'Qzf1aVqP658' },
      { id: 'p2-4', title: 'Dijkstra Shortest Path Algorithm', duration: '28:15', youtubeId: 'V6H1qAeB-l4' }
    ]
  },
  {
    id: 'vid-6',
    title: 'Sample Direct Video Upload: Cloud Native Microservices Architecture Demo',
    creator: 'Lumina Cloud Team',
    creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    type: 'direct_upload',
    videoFileUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    category: 'Backend & Cloud',
    duration: '09:56',
    views: 64200,
    likes: 4100,
    uploadedAt: 'Yesterday',
    description: `Demonstration of native uploaded video playback supporting HTML5 video streaming, custom controls, and direct media delivery.`,
    isPlaylist: false
  }
];

export const videoService = {
  getAllVideos() {
    try {
      const stored = localStorage.getItem(VIDEO_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read videos from local storage', e);
    }
    // Set seed if empty
    localStorage.setItem(VIDEO_STORAGE_KEY, JSON.stringify(INITIAL_VIDEOS));
    return INITIAL_VIDEOS;
  },

  getVideoById(id) {
    const all = this.getAllVideos();
    return all.find(v => v.id === id) || null;
  },

  addVideo(videoData) {
    const all = this.getAllVideos();
    const newVideo = {
      id: 'vid-' + Date.now(),
      views: 1,
      likes: 0,
      uploadedAt: 'Just now',
      isPlaylist: false,
      ...videoData
    };

    // If YouTube URL provided, enrich metadata
    if (newVideo.youtubeUrl) {
      const parsed = parseYouTubeUrl(newVideo.youtubeUrl);
      if (parsed) {
        if (parsed.playlistId && (!newVideo.type || newVideo.type === 'youtube_playlist')) {
          newVideo.type = 'youtube_playlist';
          newVideo.isPlaylist = true;
          newVideo.playlistId = parsed.playlistId;
          newVideo.youtubeId = parsed.videoId || 'playlist';
        } else {
          newVideo.type = 'youtube';
          newVideo.youtubeId = parsed.videoId;
        }
        if (!newVideo.thumbnailUrl && parsed.thumbnailUrl) {
          newVideo.thumbnailUrl = parsed.thumbnailUrl;
        }
      }
    }

    const updated = [newVideo, ...all];
    try {
      localStorage.setItem(VIDEO_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save new video', e);
    }
    return newVideo;
  },

  deleteVideo(id) {
    const all = this.getAllVideos();
    const filtered = all.filter(v => v.id !== id);
    localStorage.setItem(VIDEO_STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  },

  incrementViews(id) {
    const all = this.getAllVideos();
    const updated = all.map(v => {
      if (v.id === id) {
        return { ...v, views: (v.views || 0) + 1 };
      }
      return v;
    });
    localStorage.setItem(VIDEO_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },

  toggleLike(id) {
    let liked = new Set();
    try {
      const stored = localStorage.getItem(LIKED_STORAGE_KEY);
      if (stored) liked = new Set(JSON.parse(stored));
    } catch (e) {}

    const isLiked = liked.has(id);
    if (isLiked) {
      liked.delete(id);
    } else {
      liked.add(id);
    }
    localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(Array.from(liked)));

    const all = this.getAllVideos();
    const updated = all.map(v => {
      if (v.id === id) {
        const delta = isLiked ? -1 : 1;
        return { ...v, likes: Math.max(0, (v.likes || 0) + delta) };
      }
      return v;
    });
    localStorage.setItem(VIDEO_STORAGE_KEY, JSON.stringify(updated));
    return { isLiked: !isLiked, updatedList: updated };
  },

  isLiked(id) {
    try {
      const stored = localStorage.getItem(LIKED_STORAGE_KEY);
      if (stored) {
        const set = new Set(JSON.parse(stored));
        return set.has(id);
      }
    } catch (e) {}
    return false;
  }
};
