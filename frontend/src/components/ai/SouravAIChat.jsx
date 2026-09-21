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
  Cpu,
  ChevronDown,
  Key,
  Settings,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import {
  AI_MODELS,
  getSelectedModel,
  setSelectedModel,
  getGeminiApiKey,
  setGeminiApiKey,
  generateAiReply
} from '../../services/aiService';

const SUGGESTION_PROMPTS = [
  {
    icon: <Code2 size={16} color="#10b981" />,
    title: 'Explain Full-Stack Flow',
    desc: 'How does React talk to Spring Boot with JWT authentication and HTTP 206 streaming?'
  },
  {
    icon: <Cpu size={16} color="#a855f7" />,
    title: 'Master Generative AI',
    desc: 'How do Gemini 2.0 and Transformer attention layers process multimodal context?'
  },
  {
    icon: <BookOpen size={16} color="#3b82f6" />,
    title: 'Recommend Study Books',
    desc: 'What books should I read in our library for System Design, Microservices, and Algorithms?'
  },
  {
    icon: <Film size={16} color="#f59e0b" />,
    title: 'Video Study Roadmap',
    desc: 'Suggest the optimal sequence to watch the Spring Boot & React 19 video series.'
  }
];

const INITIAL_GREETING = {
  id: 'msg-welcome',
  sender: 'ai',
  text: `Hello Sourav! I am **Sourav AI**, your intelligent learning and engineering companion inspired by **Google Gemini**.

I can help you with anything you need:
- 💡 **Any Question**: Ask me about coding (Java, Spring Boot, React, Python, SQL, Docker), science, math, or history.
- 📖 **Sourav's Library**: Discover and summarize books from our digital catalog.
- 🎬 **Video Hub**: Plan playlists and study pathways.
- ⚡ **Real Reasoning**: Step-by-step problem solving, code writing, and architecture blueprints.

What would you like to explore or build today?`,
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
  const [currentModel, setCurrentModel] = useState(getSelectedModel);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getGeminiApiKey);
  const [showKeyPlain, setShowKeyPlain] = useState(false);
  const [savedKeySuccess, setSavedKeySuccess] = useState(false);

  const chatBottomRef = useRef(null);
  const textareaRef = useRef(null);
  const modelMenuRef = useRef(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target)) {
        setShowModelMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyText = (text, id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
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

  const handleSelectModel = (modelId) => {
    setCurrentModel(modelId);
    setSelectedModel(modelId);
    setShowModelMenu(false);
  };

  const handleSaveApiKey = () => {
    setGeminiApiKey(apiKeyInput);
    setSavedKeySuccess(true);
    setTimeout(() => {
      setSavedKeySuccess(false);
      setShowKeyModal(false);
    }, 1200);
  };

  const handleClearApiKey = () => {
    setApiKeyInput('');
    setGeminiApiKey('');
    setCurrentModel('cloud-instant');
    setSelectedModel('cloud-instant');
  };

  // Auto resize prompt textarea
  const handleTextareaChange = (e) => {
    setInputText(e.target.value);
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 140)}px`;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async (textToSend) => {
    const prompt = (textToSend || inputText).trim();
    if (!prompt || isTyping) return;

    const userMsg = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsTyping(true);

    try {
      const replyText = await generateAiReply({
        prompt,
        conversationHistory: messages,
        allBooks,
        allVideos,
        model: currentModel
      });

      const aiMsg = {
        id: 'msg-ai-' + Date.now(),
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg = {
        id: 'msg-ai-err-' + Date.now(),
        sender: 'ai',
        text: `### ⚠️ AI Processing Notice\n\nI encountered an issue generating a response: **${err.message || 'Unknown network error'}**\n\n- If you are using a custom Google Gemini API Key, verify it in **AI Settings** above.\n- You can also switch to **Instant Cloud AI (Free)** which works without an API key.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleRegenerate = async (lastAiMsgId) => {
    if (isTyping) return;
    // Find the last user message before or up to this AI message
    let lastUserPrompt = '';
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'user') {
        lastUserPrompt = messages[i].text;
        break;
      }
    }
    if (!lastUserPrompt) return;

    // Remove the last AI message
    setMessages((prev) => prev.filter((m) => m.id !== lastAiMsgId));
    setIsTyping(true);

    try {
      const replyText = await generateAiReply({
        prompt: lastUserPrompt,
        conversationHistory: messages.filter((m) => m.id !== lastAiMsgId && m.sender !== 'ai'),
        allBooks,
        allVideos,
        model: currentModel
      });

      const aiMsg = {
        id: 'msg-ai-regen-' + Date.now(),
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      // Re-add error
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg-ai-err-' + Date.now(),
          sender: 'ai',
          text: `⚠️ Regeneration failed: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Helper for Markdown rendering
  const renderFormattedContent = (content, msgId) => {
    if (!content) return null;

    // Split code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const lang = lines[0].trim() || 'code';
        const code = lines.slice(1).join('\n');
        const blockId = `${msgId}-code-${index}`;

        return (
          <div key={index} className="ai-code-block">
            <div className="ai-code-header">
              <span className="ai-code-lang">{lang}</span>
              <button
                className="ai-code-copy-btn"
                onClick={() => handleCopyText(code, blockId)}
                title="Copy code to clipboard"
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

      // Check for Markdown table
      const lines = part.split('\n');
      const tableLines = [];
      const nonTableElements = [];
      let inTable = false;

      const flushTable = (tLines, keyPrefix) => {
        if (tLines.length < 2) return null;
        const parseRow = (line) =>
          line
            .split('|')
            .map((c) => c.trim())
            .filter((c, i, arr) => (i === 0 && c === '' ? false : i === arr.length - 1 && c === '' ? false : true));

        const headerCols = parseRow(tLines[0]);
        const bodyRows = tLines.slice(2).map(parseRow);

        return (
          <div key={`${keyPrefix}-table`} className="ai-table-container">
            <table className="ai-markdown-table">
              <thead>
                <tr>
                  {headerCols.map((col, cIdx) => (
                    <th key={cIdx}>{formatInline(col)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx}>{formatInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      };

      const renderedBlocks = [];
      let pendingTableLines = [];

      lines.forEach((line, lIdx) => {
        const trimmed = line.trim();
        const isTableLine = trimmed.startsWith('|') && trimmed.endsWith('|');

        if (isTableLine) {
          pendingTableLines.push(trimmed);
        } else {
          if (pendingTableLines.length > 0) {
            renderedBlocks.push(flushTable(pendingTableLines, `${index}-${lIdx}`));
            pendingTableLines = [];
          }

          if (!trimmed) {
            renderedBlocks.push(<div key={`sp-${lIdx}`} style={{ height: 8 }} />);
            return;
          }

          if (trimmed.startsWith('### ')) {
            renderedBlocks.push(
              <h3 key={lIdx} className="ai-heading-3">
                {trimmed.replace('### ', '')}
              </h3>
            );
          } else if (trimmed.startsWith('#### ')) {
            renderedBlocks.push(
              <h4 key={lIdx} className="ai-heading-4">
                {trimmed.replace('#### ', '')}
              </h4>
            );
          } else if (trimmed.startsWith('> ')) {
            renderedBlocks.push(
              <blockquote key={lIdx} className="ai-blockquote">
                {formatInline(trimmed.replace(/^>\s*/, ''))}
              </blockquote>
            );
          } else if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
            renderedBlocks.push(
              <li key={lIdx} className="ai-list-item">
                {formatInline(trimmed.replace(/^[-•*]\s*/, ''))}
              </li>
            );
          } else if (/^\d+\.\s/.test(trimmed)) {
            renderedBlocks.push(
              <div key={lIdx} className="ai-list-item" style={{ listStyleType: 'decimal', display: 'list-item' }}>
                {formatInline(trimmed.replace(/^\d+\.\s*/, ''))}
              </div>
            );
          } else {
            renderedBlocks.push(
              <p key={lIdx} className="ai-paragraph">
                {formatInline(line)}
              </p>
            );
          }
        }
      });

      if (pendingTableLines.length > 0) {
        renderedBlocks.push(flushTable(pendingTableLines, `${index}-end`));
      }

      return (
        <div key={index} className="ai-text-chunk">
          {renderedBlocks}
        </div>
      );
    });
  };

  const formatInline = (text) => {
    if (!text) return text;
    // Format bold **text** and inline `code`
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

  const activeModelObj = AI_MODELS.find((m) => m.id === currentModel) || AI_MODELS[0];
  const hasGeminiKey = !!getGeminiApiKey();

  return (
    <div className="sourav-ai-wrapper container">
      {/* Top Header Bar */}
      <div className="sourav-ai-header">
        <div className="sourav-ai-brand">
          <div className="sourav-ai-gemini-logo">
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                Sourav AI
              </h2>
              <span className="sourav-ai-gemini-badge">Gemini Powered</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              World-class intelligence for coding, library books & research
            </p>
          </div>
        </div>

        {/* Header Controls: Model Selector & Settings */}
        <div className="ai-header-controls">
          {/* Model Switcher Pill */}
          <div className="ai-model-selector-container" ref={modelMenuRef}>
            <button
              className="ai-model-pill-btn"
              onClick={() => setShowModelMenu((prev) => !prev)}
              title="Select AI Model"
            >
              <Sparkles size={14} color="#c084fc" />
              <span>{activeModelObj.name}</span>
              <ChevronDown size={14} style={{ opacity: 0.7 }} />
            </button>

            {showModelMenu && (
              <div className="ai-model-dropdown-menu">
                <div style={{ padding: '6px 8px 4px 8px', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                  Choose AI Engine
                </div>
                {AI_MODELS.map((m) => (
                  <div
                    key={m.id}
                    className={`ai-model-option ${m.id === currentModel ? 'active' : ''}`}
                    onClick={() => handleSelectModel(m.id)}
                  >
                    <div className="ai-model-option-header">
                      <span className="ai-model-option-name">{m.name}</span>
                      <span className="ai-model-option-badge">{m.badge}</span>
                    </div>
                    <div className="ai-model-option-desc">{m.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gemini API Key Button */}
          <button
            className={`ai-control-btn ${hasGeminiKey ? 'has-key' : ''}`}
            onClick={() => {
              setApiKeyInput(getGeminiApiKey());
              setShowKeyModal(true);
            }}
            title="Configure Google Gemini API Key"
          >
            <Key size={14} />
            <span>{hasGeminiKey ? 'Gemini Key Active' : 'API Key'}</span>
          </button>

          {/* New Chat Button */}
          <button
            className="ai-control-btn"
            onClick={handleClearChat}
            title="Clear conversation and start new session"
          >
            <RotateCcw size={14} />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Starter Suggestions (Shown on first entry) */}
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

      {/* Chat Messages Stream */}
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

              {/* Action buttons on AI messages */}
              {msg.sender === 'ai' && (
                <div className="ai-response-actions">
                  <button
                    className={`ai-action-btn ${copiedId === msg.id ? 'copied' : ''}`}
                    onClick={() => handleCopyText(msg.text, msg.id)}
                    title="Copy full answer"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check size={12} color="#10b981" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> Copy
                      </>
                    )}
                  </button>

                  {msg.id !== 'msg-welcome' && (
                    <button
                      className="ai-action-btn"
                      onClick={() => handleRegenerate(msg.id)}
                      disabled={isTyping}
                      title="Regenerate response"
                    >
                      <RefreshCw size={12} /> Regenerate
                    </button>
                  )}
                </div>
              )}
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
              <span style={{ fontSize: '0.82rem', color: '#c084fc', fontWeight: 600 }}>
                Sourav AI is reasoning with Gemini...
              </span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Floating Prompt Input Dock */}
      <div className="sourav-ai-input-dock">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="sourav-ai-form"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            className="sourav-ai-textarea"
            placeholder="Ask Sourav AI anything... (code, math, essays, library books, system design)"
            value={inputText}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
          />
          <button
            type="submit"
            className="sourav-ai-send-btn"
            disabled={!inputText.trim() || isTyping}
            title="Send prompt (or press Enter)"
          >
            <Send size={16} />
          </button>
        </form>
        <div className="sourav-ai-disclaimer">
          Sourav AI answers any question with real-time reasoning. Powered by Google Gemini & Instant Cloud AI.
        </div>
      </div>

      {/* Google Gemini API Key Settings Modal */}
      {showKeyModal && (
        <div className="ai-modal-backdrop" onClick={() => setShowKeyModal(false)}>
          <div className="ai-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ai-modal-header">
              <h3 className="ai-modal-title">
                <Sparkles size={20} color="#8b5cf6" />
                Google Gemini Settings
              </h3>
              <button
                className="ai-modal-close-btn"
                onClick={() => setShowKeyModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="ai-modal-body">
              <div className="ai-modal-info-box">
                💡 <strong>Optional Native Gemini Access</strong>: You can connect your free Google Gemini API Key to use <strong>Gemini 2.0 Flash</strong> and <strong>Gemini 1.5 Pro</strong> directly!
                <br />
                Get your free key in 30 seconds with no credit card at{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                >
                  Google AI Studio ↗
                </a>.
              </div>

              <div className="ai-modal-field">
                <label className="ai-modal-label">Google Gemini API Key</label>
                <div className="ai-modal-input-wrapper">
                  <input
                    type={showKeyPlain ? 'text' : 'password'}
                    className="ai-modal-input"
                    placeholder="AIzaSy..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="ai-modal-toggle-vis"
                    onClick={() => setShowKeyPlain((prev) => !prev)}
                    title={showKeyPlain ? 'Hide key' : 'Show key'}
                  >
                    {showKeyPlain ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Stored securely in your browser's local storage. Never transmitted to third-party databases.
                </span>
              </div>
            </div>

            <div className="ai-modal-footer">
              {apiKeyInput && (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '0.82rem', padding: '0.5rem 0.9rem' }}
                  onClick={handleClearApiKey}
                >
                  Clear Key
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', padding: '0.5rem 1.2rem' }}
                onClick={handleSaveApiKey}
              >
                {savedKeySuccess ? 'Saved! ✓' : 'Save & Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
