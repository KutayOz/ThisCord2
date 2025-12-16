import { useState } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { serversApi } from '../../api/servers';

export function JoinServerModal() {
  const { showJoinServer, setShowJoinServer, addServer, selectServer } = useAppStore();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!showJoinServer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setLoading(true);
    setError('');

    try {
      const server = await serversApi.join(inviteCode.trim());
      addServer(server);
      selectServer(server.id);
      handleClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Invalid invite code');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowJoinServer(false);
    setInviteCode('');
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={handleClose}>
      <div
        className="bg-discord-bg-primary rounded-lg w-full max-w-md p-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-discord-interactive-normal hover:text-discord-interactive-hover"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-white">Join a Server</h2>
          <p className="text-discord-text-muted text-sm mt-2">
            Enter an invite code to join an existing server.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-discord-red/10 border border-discord-red rounded p-3 text-discord-red text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-discord-text-muted mb-2">
              Invite Code <span className="text-discord-red">*</span>
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code"
              className="w-full bg-discord-bg-tertiary text-discord-text-normal rounded px-3 py-2 outline-none focus:ring-2 focus:ring-discord-blurple"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 text-discord-text-normal hover:underline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !inviteCode.trim()}
              className="flex-1 bg-discord-blurple hover:bg-discord-blurple-hover text-white font-medium py-2.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Joining...' : 'Join Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
