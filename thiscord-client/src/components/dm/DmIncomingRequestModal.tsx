import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { useDmStore } from '../../stores/dmStore';
import { acceptDMSession, rejectDMSession } from '../../services/dmService';

export function DmIncomingRequestModal() {
  const navigate = useNavigate();
  const selectServer = useAppStore((s) => s.selectServer);

  const incomingPeerId = useDmStore((s) => s.incomingRequestPeerId);
  const session = useDmStore((s) => (incomingPeerId ? s.sessions[incomingPeerId] : undefined));
  const setIncomingRequest = useDmStore((s) => s.setIncomingRequest);
  const setSessionStatus = useDmStore((s) => s.setSessionStatus);
  const selectPeer = useDmStore((s) => s.selectPeer);

  if (!incomingPeerId || !session) return null;

  const handleReject = async () => {
    try {
      await rejectDMSession(incomingPeerId);
    } catch {
    }

    setIncomingRequest(null);
    setSessionStatus(incomingPeerId, 'failed');
  };

  const handleAccept = async () => {
    setIncomingRequest(null);
    setSessionStatus(incomingPeerId, 'connecting');
    selectPeer(incomingPeerId);
    selectServer(null);
    navigate('/channels/@me');

    try {
      await acceptDMSession(incomingPeerId);
    } catch {
      setSessionStatus(incomingPeerId, 'failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-discord-bg-primary rounded-lg w-full max-w-md p-4 relative">
        <button
          onClick={handleReject}
          className="absolute top-4 right-4 text-discord-interactive-normal hover:text-discord-interactive-hover"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-white">Incoming DM</h2>
          <p className="text-discord-text-muted text-sm mt-2">
            {session.peer.displayName || session.peer.username} wants to start a direct message.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleReject}
            className="flex-1 py-2.5 text-discord-text-normal hover:underline"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="flex-1 bg-discord-blurple hover:bg-discord-blurple-hover text-white font-medium py-2.5 rounded transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
