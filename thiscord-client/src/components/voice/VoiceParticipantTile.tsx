import { useEffect, useMemo, useRef } from 'react';
import type { User } from '../../types';

interface VoiceParticipantTileProps {
  user: User;
  stream: MediaStream | null;
  isLocal?: boolean;
  showVideo?: boolean;
  muted?: boolean;
}

export function VoiceParticipantTile({
  user,
  stream,
  isLocal,
  showVideo = true,
  muted,
}: VoiceParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const hasVideoTrack = (stream?.getVideoTracks().length ?? 0) > 0;
  const shouldRenderVideo = showVideo && hasVideoTrack;

  const label = useMemo(() => user.displayName || user.username, [user.displayName, user.username]);

  useEffect(() => {
    if (shouldRenderVideo && videoRef.current) {
      videoRef.current.srcObject = stream;
    }

    if (!shouldRenderVideo && audioRef.current) {
      audioRef.current.srcObject = stream;
    }
  }, [shouldRenderVideo, stream]);

  return (
    <div className="bg-discord-bg-secondary rounded-lg overflow-hidden border border-discord-bg-tertiary">
      <div className="relative aspect-video bg-black">
        {shouldRenderVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className="w-full h-full object-cover"
          />
        ) : (
          <>
            {!isLocal && <audio ref={audioRef} autoPlay />}
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-discord-blurple flex items-center justify-center text-white text-2xl font-bold">
                {(label || '?').charAt(0).toUpperCase()}
              </div>
            </div>
          </>
        )}

        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="text-xs text-white bg-black/50 px-2 py-1 rounded truncate">
            {label}
          </div>
          {muted !== undefined && (
            <div className="text-[10px] text-white bg-black/50 px-2 py-1 rounded">
              {muted ? 'Muted' : 'Live'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
