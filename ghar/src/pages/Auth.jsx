import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Auth({ onGuestMode }) {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (mode === 'forgot') {
      if (!email.trim()) { setError('Enter your email'); return; }
      setLoading(true);
      try {
        await resetPassword(email.trim());
        setMessage('Password reset email sent! Check your inbox.');
      } catch (err) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email.trim() || !password.trim()) { setError('Please fill in all fields'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (mode === 'signup' && !displayName.trim()) { setError('Please enter your name'); return; }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const data = await signUp(email.trim(), password, displayName.trim());
        if (data.user && !data.session) {
          setMessage('Check your email for a confirmation link, then come back and sign in.');
          setMode('signin');
        }
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">{'\uD83C\uDFE0'}</span>
          <h1 className="auth-title">Ghar</h1>
          <p className="auth-urdu">{'\u06AF\u06BE\u0631'}</p>
          <p className="auth-subtitle">Your personal homemaking companion</p>
        </div>

        {message && <div className="auth-message">{message}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Your name</label>
              <input className="form-input" type="text" placeholder="e.g. Saveez" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>

          {mode !== 'forgot' && (
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button className="btn btn-primary btn-block mt-12" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Send Reset Link' : 'Sign In'}
          </button>
        </form>

        {mode === 'signin' && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button className="auth-link" onClick={() => { setMode('forgot'); setError(''); setMessage(''); }}>
              Forgot password?
            </button>
          </div>
        )}

        <div className="auth-switch">
          {mode === 'signup' ? (
            <span>Already have an account? <button className="auth-link" onClick={() => { setMode('signin'); setError(''); setMessage(''); }}>Sign in</button></span>
          ) : mode === 'forgot' ? (
            <span>Remember your password? <button className="auth-link" onClick={() => { setMode('signin'); setError(''); setMessage(''); }}>Sign in</button></span>
          ) : (
            <span>New here? <button className="auth-link" onClick={() => { setMode('signup'); setError(''); setMessage(''); }}>Create an account</button></span>
          )}
        </div>

        {/* Guest mode */}
        <div className="auth-guest">
          <div className="auth-divider"><span>or</span></div>
          <button className="btn btn-ghost btn-block" onClick={onGuestMode}>
            Explore without an account
          </button>
          <p className="text-xs text-muted" style={{ textAlign: 'center', marginTop: 6 }}>
            Your data won't be saved across sessions
          </p>
        </div>

        {/* Footer */}
        <div className="auth-footer">
          Made for Love with Love by <strong>Skofi</strong>
        </div>
      </div>
    </div>
  );
}
