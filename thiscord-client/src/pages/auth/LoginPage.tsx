import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login({ email, password });
      setAuth(response.user, response.accessToken, response.refreshToken);
      navigate('/channels/@me');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-discord-bg-tertiary flex items-center justify-center p-4">
      <div className="bg-discord-bg-primary rounded-md p-8 w-full max-w-md shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome back!</h1>
          <p className="text-discord-text-muted">We're so excited to see you again!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-discord-red/10 border border-discord-red rounded p-3 text-discord-red text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-discord-text-muted mb-2">
              Email <span className="text-discord-red">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-discord-bg-tertiary text-discord-text-normal rounded px-3 py-2 outline-none focus:ring-2 focus:ring-discord-blurple"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-discord-text-muted mb-2">
              Password <span className="text-discord-red">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-discord-bg-tertiary text-discord-text-normal rounded px-3 py-2 outline-none focus:ring-2 focus:ring-discord-blurple"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-discord-blurple hover:bg-discord-blurple-hover text-white font-medium py-2.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>

          <p className="text-sm text-discord-text-muted">
            Need an account?{' '}
            <Link to="/register" className="text-discord-text-link hover:underline">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
