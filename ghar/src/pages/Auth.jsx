import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (isSignUp && !displayName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const data = await signUp(email.trim(), password, displayName.trim());
        if (data.user && !data.session) {
          setSignUpSuccess(true);
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

  if (signUpSuccess) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <span className="auth-logo-icon">{'\uD83C\uDFE0'}</span>
            <h1 className="auth-title">Check your email</h1>
          </div>
          <p className="auth-subtitle">
            We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account, then come back and sign in.
          </p>
          <button className="btn btn-primary btn-block mt-16" onClick={() => { setSignUpSuccess(false); setIsSignUp(false); }}>
            Back to Sign In
          </button>
        </div>
      </div>
    );
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

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="form-group">
              <label className="form-label">Your name</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Saveez"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="btn btn-primary btn-block mt-12" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="auth-switch">
          {isSignUp ? (
            <span>Already have an account? <button className="auth-link" onClick={() => { setIsSignUp(false); setError(''); }}>Sign in</button></span>
          ) : (
            <span>New here? <button className="auth-link" onClick={() => { setIsSignUp(true); setError(''); }}>Create an account</button></span>
          )}
        </div>
      </div>
    </div>
  );
}
