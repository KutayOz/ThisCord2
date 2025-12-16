import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';
import { serversApi } from '../../api/servers';
import { PresenceStatus, type User } from '../../types';
import { useDmStore } from '../../stores/dmStore';
import { requestDMSession } from '../../services/dmService';

export function MemberSidebar() {
  const navigate = useNavigate();
  const { selectedServerId, members, setMembers } = useAppStore();
  const selectServer = useAppStore((s) => s.selectServer);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const dmSessions = useDmStore((s) => s.sessions);
  const upsertSession = useDmStore((s) => s.upsertSession);
  const selectPeer = useDmStore((s) => s.selectPeer);
  const setSessionStatus = useDmStore((s) => s.setSessionStatus);

  useEffect(() => {
    const loadMembers = async () => {
      if (!selectedServerId) {
        setMembers([]);
        return;
      }
      try {
        const data = await serversApi.getMembers(selectedServerId);
        setMembers(data);
      } catch (error) {
        console.error('Failed to load members:', error);
      }
    };
    loadMembers();
  }, [selectedServerId, setMembers]);

  const onlineMembers = members.filter(
    (m) => m.user.status === PresenceStatus.Online || m.user.status === PresenceStatus.Away
  );
  const offlineMembers = members.filter(
    (m) => m.user.status === PresenceStatus.Offline || m.user.status === PresenceStatus.Invisible
  );

  const getStatusColor = (status: PresenceStatus) => {
    switch (status) {
      case PresenceStatus.Online:
        return 'bg-discord-green';
      case PresenceStatus.Away:
        return 'bg-discord-yellow';
      case PresenceStatus.DoNotDisturb:
        return 'bg-discord-red';
      default:
        return 'bg-gray-500';
    }
  };

  const startDm = async (peer: User) => {
    if (!peer.id) return;
    if (currentUserId && peer.id === currentUserId) return;

    selectPeer(peer.id);
    selectServer(null);
    navigate('/channels/@me');

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

  if (!selectedServerId) return null;

  return (
    <div className="w-60 bg-discord-bg-secondary overflow-y-auto">
      <div className="p-4">
        {/* Online Members */}
        {onlineMembers.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold uppercase text-discord-channel-default mb-2">
              Online — {onlineMembers.length}
            </h3>
            {onlineMembers.map((member) => (
              <div
                key={member.user.id}
                onClick={() => startDm(member.user)}
                className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-discord-bg-modifier-hover cursor-pointer"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center text-white text-sm">
                    {member.user.avatarUrl ? (
                      <img
                        src={member.user.avatarUrl}
                        alt={member.user.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      member.user.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-discord-bg-secondary ${getStatusColor(
                      member.user.status
                    )}`}
                  />
                </div>
                <span className="text-discord-channel-default text-sm truncate">
                  {member.nickname || member.user.displayName || member.user.username}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Offline Members */}
        {offlineMembers.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase text-discord-channel-default mb-2">
              Offline — {offlineMembers.length}
            </h3>
            {offlineMembers.map((member) => (
              <div
                key={member.user.id}
                onClick={() => startDm(member.user)}
                className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-discord-bg-modifier-hover cursor-pointer opacity-50"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-discord-bg-tertiary flex items-center justify-center text-discord-text-muted text-sm">
                    {member.user.avatarUrl ? (
                      <img
                        src={member.user.avatarUrl}
                        alt={member.user.username}
                        className="w-8 h-8 rounded-full object-cover grayscale"
                      />
                    ) : (
                      member.user.username.charAt(0).toUpperCase()
                    )}
                  </div>
                </div>
                <span className="text-discord-text-muted text-sm truncate">
                  {member.nickname || member.user.displayName || member.user.username}
                </span>
              </div>
            ))}
          </div>
        )}

        {members.length === 0 && (
          <p className="text-discord-text-muted text-sm text-center py-4">No members</p>
        )}
      </div>
    </div>
  );
}
