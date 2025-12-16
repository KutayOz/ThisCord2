import { useEffect, useMemo } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useVoiceStore } from '../../stores/voiceStore';
import { joinVoiceChannel, leaveVoiceChannel, setVoiceMuted, setVoiceVideoEnabled } from '../../services/voiceService';
import { VoiceParticipantTile } from './VoiceParticipantTile';

interface VoiceChannelAreaProps {
  channelId: string;
  channelName: string;
}

export function VoiceChannelArea({ channelId, channelName }: VoiceChannelAreaProps) {
  const currentUser = useAuthStore((s) => s.user);

  const status = useVoiceStore((s) => s.status);
  const localStream = useVoiceStore((s) => s.localStream);
  const isMuted = useVoiceStore((s) => s.isMuted);
  const isVideoEnabled = useVoiceStore((s) => s.isVideoEnabled);
  const participants = useVoiceStore((s) => s.participants);

  useEffect(() => {
    joinVoiceChannel(channelId).catch(() => {
    });

    return () => {
      leaveVoiceChannel(channelId).catch(() => {
      });
    };
  }, [channelId]);

  const remoteParticipants = useMemo(() => {
    if (!currentUser) return Object.values(participants);
    return Object.values(participants).filter((p) => p.user.id !== currentUser.id);
  }, [participants, currentUser]);

  const toggleMute = () => {
    setVoiceMuted(!isMuted);
  };

  const toggleVideo = () => {
    setVoiceVideoEnabled(!isVideoEnabled);
  };

  const handleLeave = async () => {
    await leaveVoiceChannel(channelId);
  };

  return (
    <div className="flex-1 bg-discord-bg-primary flex flex-col">
      <div className="h-12 px-4 flex items-center justify-between shadow-md border-b border-discord-bg-tertiary">
        <div className="flex items-center gap-2 min-w-0">
          <Volume2 className="w-5 h-5 text-discord-channel-default" />
          <div className="min-w-0">
            <div className="font-semibold text-white truncate">{channelName}</div>
            <div className="text-xs text-discord-text-muted">{status}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            disabled={status !== 'active'}
            className="p-2 rounded hover:bg-discord-bg-modifier-hover text-discord-interactive-normal hover:text-white disabled:opacity-50"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleVideo}
            disabled={status !== 'active'}
            className="p-2 rounded hover:bg-discord-bg-modifier-hover text-discord-interactive-normal hover:text-white disabled:opacity-50"
            title={isVideoEnabled ? 'Disable video' : 'Enable video'}
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          <button
            onClick={handleLeave}
            className="p-2 rounded hover:bg-discord-bg-modifier-hover text-discord-red"
            title="Leave"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {currentUser && (
            <VoiceParticipantTile
              user={currentUser}
              stream={localStream}
              isLocal
              showVideo={isVideoEnabled}
              muted={isMuted}
            />
          )}

          {remoteParticipants.map((p) => (
            <VoiceParticipantTile
              key={p.user.id}
              user={p.user}
              stream={p.stream}
              showVideo
            />
          ))}
        </div>

        {status !== 'active' && (
          <div className="mt-4 text-sm text-discord-text-muted">Connecting to voice channel...</div>
        )}
      </div>
    </div>
  );
}
