import { useEffect, useMemo, useRef } from 'react';
import { Phone, Video, PhoneOff, Link2Off, Link2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useDmStore } from '../../stores/dmStore';
import { endDMSession, requestDMSession, startDmCall, stopDmCall } from '../../services/dmService';
import { DmMessageInput } from './DmMessageInput';
import { DmMessageItem } from './DmMessageItem';
import { FriendsArea } from './FriendsArea';

export function DmArea() {
  const userId = useAuthStore((s) => s.user?.id || '');
  const selectedPeerId = useDmStore((s) => s.selectedPeerId);
  const session = useDmStore((s) => (selectedPeerId ? s.sessions[selectedPeerId] : undefined));
  const setSessionStatus = useDmStore((s) => s.setSessionStatus);
  const selectPeer = useDmStore((s) => s.selectPeer);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const title = useMemo(() => {
    if (!session) return 'Direct Messages';
    return session.peer.displayName || session.peer.username;
  }, [session]);

  const status = session?.status ?? 'idle';

  const localStream = session?.localStream ?? null;
  const remoteStream = session?.remoteStream ?? null;

  const localHasVideo = (localStream?.getVideoTracks().length ?? 0) > 0;
  const remoteHasVideo = (remoteStream?.getVideoTracks().length ?? 0) > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages.length]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleRequestSession = async () => {
    if (!session || !selectedPeerId) return;
    setSessionStatus(selectedPeerId, 'requesting');
    try {
      await requestDMSession(selectedPeerId);
    } catch {
      setSessionStatus(selectedPeerId, 'failed');
    }
  };

  const handleEndSession = async () => {
    if (!selectedPeerId) return;
    await endDMSession(selectedPeerId);
  };

  const handleStartVoice = async () => {
    if (!selectedPeerId) return;
    try {
      await startDmCall(selectedPeerId, false);
    } catch (err) {
      console.error('[DM] Voice call error:', err);
    }
  };

  const handleStartVideo = async () => {
    if (!selectedPeerId) return;
    try {
      await startDmCall(selectedPeerId, true);
    } catch (err) {
      console.error('[DM] Video call error:', err);
    }
  };

  const handleStopCall = async () => {
    if (!selectedPeerId) return;
    try {
      await stopDmCall(selectedPeerId);
    } catch (err) {
      console.error('[DM] Stop call error:', err);
    }
  };

  if (!session || !selectedPeerId) {
    return <FriendsArea />;
  }

  const canRequest = status === 'idle' || status === 'ended' || status === 'failed';
  const canCall = status === 'active';

  return (
    <div className="flex-1 bg-discord-bg-primary flex flex-col">
      <div className="h-12 px-4 flex items-center justify-between shadow-md border-b border-discord-bg-tertiary">
        <div className="min-w-0">
          <div className="font-semibold text-white truncate">{title}</div>
          <div className="text-xs text-discord-text-muted">{status}</div>
        </div>

        <div className="flex items-center gap-2">
          {canRequest && (
            <button
              onClick={handleRequestSession}
              className="p-2 rounded hover:bg-discord-bg-modifier-hover text-discord-interactive-normal hover:text-white"
              title="Connect"
            >
              <Link2 className="w-5 h-5" />
            </button>
          )}

          {canCall && (
            <>
              <button
                onClick={handleStartVoice}
                className="p-2 rounded hover:bg-discord-bg-modifier-hover text-discord-interactive-normal hover:text-white"
                title="Start voice call"
              >
                <Phone className="w-5 h-5" />
              </button>
              <button
                onClick={handleStartVideo}
                className="p-2 rounded hover:bg-discord-bg-modifier-hover text-discord-interactive-normal hover:text-white"
                title="Start video call"
              >
                <Video className="w-5 h-5" />
              </button>
              <button
                onClick={handleStopCall}
                className="p-2 rounded hover:bg-discord-bg-modifier-hover text-discord-interactive-normal hover:text-white"
                title="Stop call"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
              <button
                onClick={handleEndSession}
                className="p-2 rounded hover:bg-discord-bg-modifier-hover text-discord-interactive-normal hover:text-white"
                title="End session"
              >
                <Link2Off className="w-5 h-5" />
              </button>
            </>
          )}

          <button
            onClick={() => selectPeer(null)}
            className="p-2 rounded hover:bg-discord-bg-modifier-hover text-discord-interactive-normal hover:text-white"
            title="Close"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
      </div>

      {(localStream || remoteStream) && (
        <div className="px-4 py-3 border-b border-discord-bg-tertiary">
          <audio ref={remoteAudioRef} autoPlay />
          {(localHasVideo || remoteHasVideo) ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black rounded overflow-hidden aspect-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="bg-black rounded overflow-hidden aspect-video">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-discord-text-muted">Voice call active</div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-0.5">
          {session.messages.map((m) => (
            <DmMessageItem key={m.id} message={m} isOwn={m.senderId === userId} />
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>

      <DmMessageInput peerId={selectedPeerId} disabled={status !== 'active'} />
    </div>
  );
}
