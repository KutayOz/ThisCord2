import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.register({ username, email, password });
      setAuth(response.user, response.accessToken, response.refreshToken);
      navigate('/channels/@me');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-discord-bg-tertiary flex items-center justify-center p-4">
      <div className="bg-discord-bg-primary rounded-md p-8 w-full max-w-md shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Create an account</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-discord-red/10 border border-discord-red rounded p-3 text-discord-red text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-discord-text-muted mb-2">
              Username <span className="text-discord-red">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-discord-bg-tertiary text-discord-text-normal rounded px-3 py-2 outline-none focus:ring-2 focus:ring-discord-blurple"
              required
            />
          </div>

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
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-discord-blurple hover:bg-discord-blurple-hover text-white font-medium py-2.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Continue'}
          </button>

          <p className="text-sm text-discord-text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-discord-text-link hover:underline">
              Log In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
