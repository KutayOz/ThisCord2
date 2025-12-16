import { useEffect, useMemo, useState } from 'react';
import { Check, UserPlus, X, MessageCircle, RefreshCcw, UserMinus } from 'lucide-react';
import { friendsApi } from '../../api/friends';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';
import { useDmStore } from '../../stores/dmStore';
import type { FriendRequest, User } from '../../types';
import { requestDMSession } from '../../services/dmService';

export function FriendsArea() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const selectServer = useAppStore((s) => s.selectServer);

  const dmSessions = useDmStore((s) => s.sessions);
  const upsertSession = useDmStore((s) => s.upsertSession);
  const selectPeer = useDmStore((s) => s.selectPeer);
  const setSessionStatus = useDmStore((s) => s.setSessionStatus);

  const [friends, setFriends] = useState<User[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [error, setError] = useState<string>('');
  const [info, setInfo] = useState<string>('');

  const friendCountLabel = useMemo(() => {
    if (friends.length === 1) return '1 friend';
    return `${friends.length} friends`;
  }, [friends.length]);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [friendsData, incomingData, outgoingData] = await Promise.all([
        friendsApi.getFriends(),
        friendsApi.getIncomingRequests(),
        friendsApi.getOutgoingRequests(),
      ]);
      setFriends(friendsData);
      setIncoming(incomingData);
      setOutgoing(outgoingData);
    } catch {
      setError('Failed to load friends.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll().catch(() => {
    });
  }, []);

  const startDm = async (peer: User) => {
    if (!peer.id) return;
    if (currentUserId && peer.id === currentUserId) return;

    selectServer(null);
    selectPeer(peer.id);

    const existing = dmSessions[peer.id];
    if (!existing) {
      upsertSession(peer, { status: 'requesting', isOfferer: true });
    } else if (existing.status === 'idle' || existing.status === 'ended' || existing.status === 'failed') {
      setSessionStatus(peer.id, 'requesting');
    } else {
      return;
    }

    try {
      await requestDMSession(peer.id);
    } catch {
      setSessionStatus(peer.id, 'failed');
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = usernameOrEmail.trim();
    if (!value) return;

    setAdding(true);
    setError('');
    setInfo('');

    try {
      await friendsApi.sendRequest(value);
      setUsernameOrEmail('');
      setInfo('Friend request sent.');
      await loadAll();
    } catch {
      setError('Could not send friend request.');
    } finally {
      setAdding(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    setError('');
    setInfo('');
    try {
      await friendsApi.accept(requestId);
      await loadAll();
    } catch {
      setError('Could not accept request.');
    }
  };

  const handleDecline = async (requestId: string) => {
    setError('');
    setInfo('');
    try {
      await friendsApi.decline(requestId);
      await loadAll();
    } catch {
      setError('Could not decline request.');
    }
  };

  const handleCancel = async (requestId: string) => {
    setError('');
    setInfo('');
    try {
      await friendsApi.cancel(requestId);
      await loadAll();
    } catch {
      setError('Could not cancel request.');
    }
  };

  const handleRemove = async (friendUserId: string) => {
    setError('');
    setInfo('');
    try {
      await friendsApi.removeFriend(friendUserId);
      await loadAll();
    } catch {
      setError('Could not remove friend.');
    }
  };

  return (
    <div className="flex-1 bg-discord-bg-primary flex flex-col">
      <div className="h-12 px-4 flex items-center justify-between shadow-md border-b border-discord-bg-tertiary">
        <div className="min-w-0">
          <div className="font-semibold text-white truncate">Friends</div>
          <div className="text-xs text-discord-text-muted">{friendCountLabel}</div>
        </div>

        <button
          type="button"
          onClick={() => loadAll()}
          className="p-2 rounded hover:bg-discord-bg-modifier-hover text-discord-interactive-normal hover:text-white"
          title="Refresh"
          disabled={loading}
        >
          <RefreshCcw className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <form onSubmit={handleSendRequest} className="bg-discord-bg-secondary rounded p-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-discord-text-muted" />
            <input
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="Add friend by username or email"
              className="flex-1 bg-discord-bg-tertiary text-discord-text-normal text-sm rounded px-3 py-2 outline-none focus:ring-2 focus:ring-discord-blurple"
            />
            <button
              type="submit"
              disabled={adding || !usernameOrEmail.trim()}
              className="bg-discord-blurple hover:bg-discord-blurple-hover text-white text-sm font-medium px-3 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? 'Sending...' : 'Send'}
            </button>
          </div>
          {error && <div className="mt-2 text-sm text-discord-red">{error}</div>}
          {info && <div className="mt-2 text-sm text-discord-green">{info}</div>}
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-discord-bg-secondary rounded p-3">
            <div className="text-xs font-semibold uppercase text-discord-channel-default mb-2">
              Incoming Requests
            </div>
            {incoming.length === 0 ? (
              <div className="text-sm text-discord-text-muted">No incoming requests</div>
            ) : (
              <div className="space-y-2">
                {incoming.map((r) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{r.requester.displayName || r.requester.username}</div>
                      <div className="text-xs text-discord-text-muted truncate">@{r.requester.username}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAccept(r.id)}
                      className="p-2 rounded hover:bg-discord-bg-modifier-hover text-discord-green"
                      title="Accept"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecline(r.id)}
                      className="p-2 rounded hover:bg-discord-bg-modifier-hover text-discord-red"
                      title="Decline"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-discord-bg-secondary rounded p-3">
            <div className="text-xs font-semibold uppercase text-discord-channel-default mb-2">
              Outgoing Requests
            </div>
            {outgoing.length === 0 ? (
              <div className="text-sm text-discord-text-muted">No outgoing requests</div>
            ) : (
              <div className="space-y-2">
                {outgoing.map((r) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{r.addressee.displayName || r.addressee.username}</div>
                      <div className="text-xs text-discord-text-muted truncate">@{r.addressee.username}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancel(r.id)}
                      className="p-2 rounded hover:bg-discord-bg-modifier-hover text-discord-text-muted hover:text-white"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-discord-bg-secondary rounded p-3">
          <div className="text-xs font-semibold uppercase text-discord-channel-default mb-2">
            Friends
          </div>

          {friends.length === 0 ? (
            <div className="text-sm text-discord-text-muted">
              No friends yet. Add someone by username/email.
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-2 px-2 py-2 rounded hover:bg-discord-bg-modifier-hover"
                >
                  <button
                    type="button"
                    onClick={() => startDm(f)}
                    className="flex-1 min-w-0 text-left"
                    title="Message"
                  >
                    <div className="text-sm text-white truncate">{f.displayName || f.username}</div>
                    <div className="text-xs text-discord-text-muted truncate">@{f.username}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => startDm(f)}
                    className="p-2 rounded hover:bg-discord-bg-modifier-hover text-discord-interactive-normal hover:text-white"
                    title="Message"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemove(f.id)}
                    className="p-2 rounded hover:bg-discord-bg-modifier-hover text-discord-text-muted hover:text-discord-red"
                    title="Remove friend"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
