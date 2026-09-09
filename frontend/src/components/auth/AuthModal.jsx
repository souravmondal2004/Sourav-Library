import React, { useState } from 'react';
import { X, Shield, User, Lock, Mail, CheckCircle } from 'lucide-react';
import { api } from '../../services/api';

export default function AuthModal({ onClose, onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let data;
      if (isRegister) {
        data = await api.auth.register(username, email, password, fullName);
      } else {
        data = await api.auth.login(username, password);
      }
      onLoginSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (user, pass) => {
    setError(null);
    setLoading(true);
    try {
      const data = await api.auth.login(user, pass);
      onLoginSuccess(data);
      onClose();
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.3rem', color: 'var(--color-primary)' }}>
            {isRegister ? 'Join Scribd' : 'Sign in to Scribd'}
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          {isRegister
            ? 'Create your free reader account to open and read full PDF publications.'
            : 'Sign in to your account to read publications and access your personal library.'}
        </p>

        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: '0.65rem 0.9rem',
            borderRadius: 6,
            fontSize: '0.85rem',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="form-input"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              required
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-accent"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', fontSize: '0.95rem' }}
          >
            {loading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                style={{ color: 'var(--color-accent)', fontWeight: 700 }}
                onClick={() => setIsRegister(false)}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              New to Scribd?{' '}
              <button
                type="button"
                style={{ color: 'var(--color-accent)', fontWeight: 700 }}
                onClick={() => setIsRegister(true)}
              >
                Create an account
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
