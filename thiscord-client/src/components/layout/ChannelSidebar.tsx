import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, Volume2, ChevronDown, Plus, Settings, LogOut } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';
import { useDmStore } from '../../stores/dmStore';
import { serversApi } from '../../api/servers';
import { ChannelType } from '../../types';
import { SettingsModal } from '../modals/SettingsModal';

export function ChannelSidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const dmSessions = useDmStore((s) => s.sessions);
  const selectedPeerId = useDmStore((s) => s.selectedPeerId);
  const selectPeer = useDmStore((s) => s.selectPeer);
  const {
    selectedServerId,
    channels,
    selectedChannelId,
    setChannels,
    selectChannel,
    servers,
  } = useAppStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const selectedServer = servers.find((s) => s.id === selectedServerId);

  useEffect(() => {
    const loadChannels = async () => {
      if (!selectedServerId) {
        setChannels([]);
        return;
      }
      try {
        const data = await serversApi.getChannels(selectedServerId);
        setChannels(data);
        // Auto-select first text channel
        const firstTextChannel = data.find((c) => c.type === ChannelType.Text);
        if (firstTextChannel && !selectedChannelId) {
          selectChannel(firstTextChannel.id);
          navigate(`/channels/${selectedServerId}/${firstTextChannel.id}`);
        }
      } catch (error) {
        console.error('Failed to load channels:', error);
      }
    };
    loadChannels();
  }, [selectedServerId, setChannels, selectChannel, navigate, selectedChannelId]);

  const handleChannelClick = (channelId: string) => {
    selectChannel(channelId);
    navigate(`/channels/${selectedServerId}/${channelId}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const textChannels = channels.filter((c) => c.type === ChannelType.Text);
  const voiceChannels = channels.filter((c) => c.type === ChannelType.Voice);

  const dmList = Object.values(dmSessions).sort((a, b) => {
    const an = a.peer.displayName || a.peer.username;
    const bn = b.peer.displayName || b.peer.username;
    return an.localeCompare(bn);
  });

  const getDmStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-discord-green';
      case 'connecting':
      case 'requesting':
      case 'incoming':
        return 'bg-discord-yellow';
      case 'failed':
        return 'bg-discord-red';
      default:
        return 'bg-gray-500';
    }
  };

  const handleDmClick = (peerId: string) => {
    selectPeer(peerId);
    navigate('/channels/@me');
  };

  return (
    <div className="w-60 bg-discord-bg-secondary flex flex-col">
      {/* Server Header */}
      {selectedServer ? (
        <div className="h-12 px-4 flex items-center justify-between shadow-md border-b border-discord-bg-tertiary cursor-pointer hover:bg-discord-bg-modifier-hover">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-white truncate">{selectedServer.name}</span>
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await navigator.clipboard.writeText(selectedServer.inviteCode);
                  } catch {
                  }
                }}
                className="text-xs text-discord-text-muted font-mono hover:text-discord-text-normal"
                title="Copy invite code"
              >
                {selectedServer.inviteCode}
              </button>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-discord-text-normal" />
        </div>
      ) : (
        <div className="h-12 px-4 flex items-center shadow-md border-b border-discord-bg-tertiary">
          <input
            type="text"
            placeholder="Find or start a conversation"
            className="w-full bg-discord-bg-tertiary text-discord-text-normal text-sm rounded px-2 py-1 outline-none"
          />
        </div>
      )}

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {selectedServerId ? (
          <>
            {/* Text Channels */}
            <div className="mb-4">
              <div className="flex items-center justify-between px-1 mb-1 group cursor-pointer">
                <span className="text-xs font-semibold uppercase text-discord-channel-default hover:text-discord-channel-hover">
                  Text Channels
                </span>
                <Plus className="w-4 h-4 text-discord-channel-default opacity-0 group-hover:opacity-100 hover:text-discord-channel-hover" />
              </div>
              {textChannels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => handleChannelClick(channel.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded group ${
                    selectedChannelId === channel.id
                      ? 'bg-discord-bg-modifier-active text-white'
                      : 'text-discord-channel-default hover:bg-discord-bg-modifier-hover hover:text-discord-channel-hover'
                  }`}
                >
                  <Hash className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{channel.name}</span>
                </button>
              ))}
            </div>

            {/* Voice Channels */}
            {voiceChannels.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-1 mb-1 group cursor-pointer">
                  <span className="text-xs font-semibold uppercase text-discord-channel-default hover:text-discord-channel-hover">
                    Voice Channels
                  </span>
                  <Plus className="w-4 h-4 text-discord-channel-default opacity-0 group-hover:opacity-100 hover:text-discord-channel-hover" />
                </div>
                {voiceChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => handleChannelClick(channel.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-discord-channel-default hover:bg-discord-bg-modifier-hover hover:text-discord-channel-hover"
                  >
                    <Volume2 className="w-5 h-5 flex-shrink-0" />
                    <span className="truncate">{channel.name}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="px-2">
            <div className="text-xs font-semibold uppercase text-discord-channel-default px-1 mb-2">
              Direct Messages
            </div>
            {dmList.length === 0 ? (
              <div className="text-discord-text-muted text-sm px-1">
                <p>No DMs yet</p>
                <p className="mt-2 text-xs">Start one by clicking a member in a server.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {dmList.map((session) => (
                  <button
                    key={session.peer.id}
                    onClick={() => handleDmClick(session.peer.id)}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded group ${
                      selectedPeerId === session.peer.id
                        ? 'bg-discord-bg-modifier-active text-white'
                        : 'text-discord-channel-default hover:bg-discord-bg-modifier-hover hover:text-discord-channel-hover'
                    }`}
                  >
                    <div className="relative w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                      {session.peer.avatarUrl ? (
                        <img
                          src={session.peer.avatarUrl}
                          alt={session.peer.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        session.peer.username.charAt(0).toUpperCase()
                      )}
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-discord-bg-secondary ${getDmStatusColor(
                          session.status
                        )}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-sm truncate">
                        {session.peer.displayName || session.peer.username}
                      </div>
                      <div className="text-xs text-discord-text-muted truncate">{session.status}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Panel */}
      <div className="h-[52px] bg-discord-bg-tertiary/50 px-2 flex items-center relative">
        <div
          className="flex items-center gap-2 flex-1 px-1 py-1 rounded hover:bg-discord-bg-modifier-hover cursor-pointer"
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          <div className="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center text-white text-sm font-medium">
            {user?.username?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.username}</p>
            <p className="text-xs text-discord-text-muted">Online</p>
          </div>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="p-2 rounded hover:bg-discord-bg-modifier-hover"
        >
          <Settings className="w-4 h-4 text-discord-interactive-normal hover:text-discord-interactive-hover" />
        </button>

        {/* User Menu Dropdown */}
        {showUserMenu && (
          <div className="absolute bottom-full left-2 right-2 mb-2 bg-discord-bg-primary rounded-md shadow-lg border border-discord-bg-tertiary py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-discord-red hover:bg-discord-red/10"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Log Out</span>
            </button>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
