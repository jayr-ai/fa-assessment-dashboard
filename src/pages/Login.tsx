import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banner } from '../components/Banner';
import { login } from '../api/client';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/my-assessment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <Banner variant="agent" title="FREEDOM ACADEMY ASSESSMENT" />
      <div className="login-shell">
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-title">Agent Login</div>
          <div className="login-subtitle">View your Freedom Academy assessment results.</div>
          {error && <div className="login-error">{error}</div>}
          <div className="form-field">
            <label htmlFor="username">Username (email)</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="login-submit" type="submit" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}
