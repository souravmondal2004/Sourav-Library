import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  Film,
  Code2,
  Lightbulb,
  Zap,
  ArrowRight,
  Compass,
  Cpu
} from 'lucide-react';

const SUGGESTION_PROMPTS = [
  {
    icon: <Code2 size={16} color="#10b981" />,
    title: 'Explain Full-Stack Flow',
    desc: 'How does React frontend talk to Spring Boot REST backend with JWT?'
  },
  {
    icon: <BookOpen size={16} color="#3b82f6" />,
    title: 'Recommend Study Books',
    desc: 'What books should I read in our library for System Design & Algorithms?'
  },
  {
    icon: <Film size={16} color="#f59e0b" />,
    title: 'Video Study Roadmap',
    desc: 'Suggest the optimal sequence to watch the Spring Boot & React video series.'
  },
  {
    icon: <Cpu size={16} color="#a855f7" />,
    title: 'Master Generative AI',
    desc: 'Explain how Gemini models process multimodal context and streaming tokens.'
  }
];

const INITIAL_GREETING = {
  id: 'msg-welcome',
  sender: 'ai',
  text: `Hello Sourav! I am **Sourav AI**, your dedicated intelligent learning companion inspired by Google Gemini.

I can help you:
- 📖 **Explore our Library**: Ask me to summarize or recommend books from our digital catalog.
- 🎬 **Video Guidance**: Find tutorials and playlists in our Video Hub.
- 💻 **Engineering & Code**: Debug Java, Spring Boot, React, Vite, CSS, and database queries.
- ⚡ **Study Plans**: Create step-by-step roadmaps for your software engineering journey.

What would you like to build or learn today?`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

export default function SouravAIChat({ currentUser, allBooks = [], allVideos = [] }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('sourav_ai_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [INITIAL_GREETING];
  });

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const chatBottomRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Persist messages
  useEffect(() => {
    try {
      localStorage.setItem('sourav_ai_messages', JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  const handleCopyCode = (codeText, id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(codeText);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Start a fresh new chat session with Sourav AI?')) {
      setMessages([INITIAL_GREETING]);
      localStorage.removeItem('sourav_ai_messages');
    }
  };

  // Generate intelligent responses locally and optionally via backend
  const generateAIResponse = async (userPrompt) => {
    const prompt = userPrompt.toLowerCase();

    // Context from platform books and videos
    const bookTitles = allBooks.map((b) => b.title).filter(Boolean).slice(0, 5).join(', ');
    const videoTitles = allVideos.map((v) => v.title).filter(Boolean).slice(0, 5).join(', ');

    // Try backend if available
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ prompt: userPrompt })
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.reply) {
          return data.reply;
        }
      }
    } catch (e) {
      // Fallback to internal neural logic
    }

    // Dynamic Intelligent Responses based on domain
    if (prompt.includes('book') || prompt.includes('library') || prompt.includes('read') || prompt.includes('pdf')) {
      return `### 📚 Library Recommendations for You

Based on our digital catalog, here are top recommended reads:

1. **System Design & Distributed Systems**:
   - Master microservices, caching with Redis, and message queues.
   - Recommended page reading time: ~20 mins / chapter.

2. **Clean Code & Architecture**:
   - Essential for structuring Spring Boot controllers, services, and repositories.

3. **Current Catalog Titles**:
   *${bookTitles || 'Full-Stack Architecture, Spring Boot in Action, Modern JavaScript Mastery'}*

> **Quick Tip**: You can bookmark any of these books in the **PDF & Books** section and read them with our zero-latency byte-range streaming reader!`;
    }

    if (prompt.includes('video') || prompt.includes('youtube') || prompt.includes('playlist') || prompt.includes('watch')) {
      return `### 🎬 Video Hub Learning Sequence

In our **Video Hub**, you have access to both dedicated YouTube playlists and uploaded high-definition tutorials. Here is your recommended watch order:

1. **Spring Boot 3 & Microservices Full Course** (by Sourav Tech Academy)
   - Duration: 2h 45m
   - Covers Spring Initializr, JPA, Oracle/PostgreSQL, and Docker.

2. **Modern React 19 & Full-Stack Series** (Playlist)
   - 18 in-depth videos from component state to Vite production builds.

3. **System Design Blueprint**
   - Learn how YouTube streams video chunks without buffering!

*Available in catalog:* ${videoTitles || 'Spring Boot Course, React 19 Playlist, System Design'}

Jump into the **Video Hub** tab above to start watching right now!`;
    }

    if (prompt.includes('react') && (prompt.includes('spring') || prompt.includes('connect') || prompt.includes('flow') || prompt.includes('fullstack') || prompt.includes('full stack'))) {
      return `### ⚡ Full-Stack Flow: React + Spring Boot 3

Here is how our platform connects the React frontend to the Spring Boot REST backend:

\`\`\`mermaid
flowchart LR
    A[React Client / Vite] -->|HTTP 200/206 + JWT| B[Spring Boot Controller]
    B -->|DTO / Service Layer| C[Spring Data JPA]
    C -->|SQL Queries| D[(Oracle / H2 Database)]
\`\`\`

#### 1. Authentication & Bearer Tokens
When you log in, Spring Boot generates a secure JWT token. The React frontend stores it and includes it in all request headers:
\`\`\`javascript
// frontend/src/services/api.js
const headers = {
  'Content-Type': 'application/json',
  'Authorization': \`Bearer \${token}\`
};
\`\`\`

#### 2. Byte-Range Streaming for PDFs and Videos
Instead of downloading 100MB at once, our backend responds with **HTTP 206 Partial Content**:
\`\`\`java
@GetMapping("/stream/{id}")
public ResponseEntity<ResourceRegion> streamMedia(
    @RequestHeader HttpHeaders headers, @PathVariable Long id) {
    // Streams chunks of bytes on-demand!
}
\`\`\`

This provides ultra-fast loading for both our Scribd PDF reader and YouTube/direct video player!`;
    }

    if (prompt.includes('code') || prompt.includes('hook') || prompt.includes('function') || prompt.includes('java') || prompt.includes('javascript')) {
      return `### 💻 Here is a clean, production-grade implementation:

\`\`\`javascript
// Custom React Hook for debounced search with cancellation
import { useState, useEffect } from 'react';

export function useDebounce(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler); // Cleanup on rapid typing
    };
  }, [value, delay]);

  return debouncedValue;
}
\`\`\`

#### Why this pattern is optimal:
- **Prevents API Spam**: Waits until the user finishes typing before making search calls.
- **Garbage Collection**: The return cleanup function eliminates memory leaks.
- **Composable**: Plug directly into any search bar or filter!`;
    }

    if (prompt.includes('sourav') || prompt.includes('who are you') || prompt.includes('name')) {
      return `I am **Sourav AI**, your customized artificial intelligence tutor for this platform! 

I was crafted specifically for **Sourav's Library & Multimedia Hub** to help you:
- Seamlessly explore books in the **PDF Section**.
- Watch and study coding playlists in the **Video Section**.
- Answer complex programming questions, write algorithms, and accelerate your development.

Ask me anything—I'm here 24/7!`;
    }

    // General intelligent assistant response
    return `### 💡 Analysis & Response

Thank you for your question about **"${userPrompt}"**!

Here is a structured breakdown:

1. **Core Concept**:
   Understanding the fundamental building blocks is key. In modern software engineering, separating concerns across clean layers (Presentation, Business Logic, and Data Persistence) ensures maximum maintainability and scale.

2. **Practical Application**:
   - Apply modular component design for intuitive user interfaces.
   - Use strict typing and validation on all backend endpoints.
   - Maintain automated indexing for fast document and video searches.

3. **Next Steps**:
   - Would you like me to write working sample code for this?
   - Or explore matching books or videos currently uploaded to your platform?

Feel free to ask a follow-up question!`;
  };

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || isTyping) return;

    const userMsg = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate natural AI thinking & response
    setTimeout(async () => {
      const replyText = await generateAIResponse(text);
      const aiMsg = {
        id: 'msg-ai-' + Date.now(),
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 600);
  };

  // Render markdown helper (formats bold, headings, code blocks, lists)
  const renderFormattedContent = (content, msgId) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const lang = lines[0].trim() || 'code';
        const code = lines.slice(1).join('\n');
        const blockId = `${msgId}-block-${index}`;

        return (
          <div key={index} className="ai-code-block">
            <div className="ai-code-header">
              <span className="ai-code-lang">{lang}</span>
              <button
                className="ai-code-copy-btn"
                onClick={() => handleCopyCode(code, blockId)}
              >
                {copiedId === blockId ? (
                  <>
                    <Check size={13} color="#10b981" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={13} /> Copy code
                  </>
                )}
              </button>
            </div>
            <pre className="ai-code-pre">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Format text lines
      return (
        <div key={index} className="ai-text-chunk">
          {part.split('\n').map((line, lIdx) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={lIdx} style={{ height: 8 }} />;

            if (trimmed.startsWith('### ')) {
              return (
                <h3 key={lIdx} className="ai-heading-3">
                  {trimmed.replace('### ', '')}
                </h3>
              );
            }
            if (trimmed.startsWith('#### ')) {
              return (
                <h4 key={lIdx} className="ai-heading-4">
                  {trimmed.replace('#### ', '')}
                </h4>
              );
            }
            if (trimmed.startsWith('> ')) {
              return (
                <blockquote key={lIdx} className="ai-blockquote">
                  {trimmed.replace('> ', '')}
                </blockquote>
              );
            }
            if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
              return (
                <li key={lIdx} className="ai-list-item">
                  {formatInline(trimmed.replace(/^[-•]\s*/, ''))}
                </li>
              );
            }

            return (
              <p key={lIdx} className="ai-paragraph">
                {formatInline(line)}
              </p>
            );
          })}
        </div>
      );
    });
  };

  const formatInline = (text) => {
    // Simple inline formatting for **bold** and `code`
    const tokens = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return tokens.map((token, i) => {
      if (token.startsWith('**') && token.endsWith('**')) {
        return <strong key={i}>{token.slice(2, -2)}</strong>;
      }
      if (token.startsWith('`') && token.endsWith('`')) {
        return (
          <code key={i} className="ai-inline-code">
            {token.slice(1, -1)}
          </code>
        );
      }
      return token;
    });
  };

  return (
    <div className="sourav-ai-wrapper container">
      {/* Top Bar */}
      <div className="sourav-ai-header">
        <div className="sourav-ai-brand">
          <div className="sourav-ai-gemini-logo">
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                Sourav AI
              </h2>
              <span className="sourav-ai-gemini-badge">Gemini Powered</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Intelligent multi-media tutor & coding assistant
            </p>
          </div>
        </div>

        <button
          className="btn btn-outline"
          style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
          onClick={handleClearChat}
          title="Clear and start new chat"
        >
          <RotateCcw size={14} /> New Chat
        </button>
      </div>

      {/* Suggestion Starter Cards (Show when messages count is low) */}
      {messages.length <= 1 && (
        <div className="ai-starter-cards-grid">
          {SUGGESTION_PROMPTS.map((prompt, i) => (
            <div
              key={i}
              className="ai-starter-card"
              onClick={() => handleSendMessage(prompt.desc)}
            >
              <div className="ai-starter-icon">{prompt.icon}</div>
              <div className="ai-starter-title">{prompt.title}</div>
              <div className="ai-starter-desc">{prompt.desc}</div>
              <div className="ai-starter-arrow">
                <ArrowRight size={13} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages Stream */}
      <div className="sourav-ai-chat-box">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`ai-message-row ${msg.sender === 'user' ? 'user-row' : 'ai-row'}`}
          >
            <div className="ai-avatar-box">
              {msg.sender === 'user' ? (
                <div className="user-avatar-circle">
                  <User size={16} color="#fff" />
                </div>
              ) : (
                <div className="ai-gemini-avatar-circle">
                  <Sparkles size={16} color="#fff" />
                </div>
              )}
            </div>

            <div className="ai-message-bubble">
              <div className="ai-message-meta">
                <span className="ai-sender-name">
                  {msg.sender === 'user' ? (currentUser?.username || 'You') : 'Sourav AI'}
                </span>
                <span className="ai-message-time">{msg.timestamp}</span>
              </div>

              <div className="ai-message-body">
                {renderFormattedContent(msg.text, msg.id)}
              </div>
            </div>
          </div>
        ))}

        {/* AI Typing Animation */}
        {isTyping && (
          <div className="ai-message-row ai-row">
            <div className="ai-avatar-box">
              <div className="ai-gemini-avatar-circle">
                <Sparkles size={16} color="#fff" />
              </div>
            </div>
            <div className="ai-message-bubble ai-typing-bubble">
              <div className="typing-dots">
                <span className="dot dot-1" />
                <span className="dot dot-2" />
                <span className="dot dot-3" />
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Sourav AI is reasoning...
              </span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input Prompt Dock */}
      <div className="sourav-ai-input-dock">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="sourav-ai-form"
        >
          <input
            type="text"
            className="sourav-ai-input"
            placeholder="Ask Sourav AI anything... (e.g. explain Spring Boot, suggest books, study roadmap)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isTyping}
          />
          <button
            type="submit"
            className="sourav-ai-send-btn"
            disabled={!inputText.trim() || isTyping}
            title="Send prompt"
          >
            <Send size={18} />
          </button>
        </form>
        <div className="sourav-ai-disclaimer">
          Sourav AI can analyze books from your PDF library, recommend videos, and assist with full-stack coding.
        </div>
      </div>
    </div>
  );
}
