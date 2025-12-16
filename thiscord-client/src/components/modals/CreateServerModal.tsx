import { useState } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { serversApi } from '../../api/servers';

export function CreateServerModal() {
  const { showCreateServer, setShowCreateServer, addServer, selectServer } = useAppStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!showCreateServer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      const server = await serversApi.create({ name: name.trim(), description: description.trim() || undefined });
      addServer(server);
      selectServer(server.id);
      handleClose();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to create server');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowCreateServer(false);
    setName('');
    setDescription('');
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
          <h2 className="text-2xl font-bold text-white">Create a server</h2>
          <p className="text-discord-text-muted text-sm mt-2">
            Your server is where you and your friends hang out.
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
              Server Name <span className="text-discord-red">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Server"
              className="w-full bg-discord-bg-tertiary text-discord-text-normal rounded px-3 py-2 outline-none focus:ring-2 focus:ring-discord-blurple"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-discord-text-muted mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's your server about?"
              rows={3}
              className="w-full bg-discord-bg-tertiary text-discord-text-normal rounded px-3 py-2 outline-none focus:ring-2 focus:ring-discord-blurple resize-none"
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
              disabled={loading || !name.trim()}
              className="flex-1 bg-discord-blurple hover:bg-discord-blurple-hover text-white font-medium py-2.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
