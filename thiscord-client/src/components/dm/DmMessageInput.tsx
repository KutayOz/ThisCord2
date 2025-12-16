import { useRef, useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { useDmStore } from '../../stores/dmStore';
import { sendDmText, sendDmFile } from '../../services/dmService';

interface DmMessageInputProps {
  peerId: string;
  disabled?: boolean;
}

export function DmMessageInput({ peerId, disabled }: DmMessageInputProps) {
  const sessionStatus = useDmStore((s) => s.sessions[peerId]?.status);
  const [content, setContent] = useState('');
  const [sendingFile, setSendingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = !disabled && sessionStatus === 'active' && !sendingFile;

  const handleSelectFiles = () => {
    if (!canSend) return;
    fileInputRef.current?.click();
  };

  const handleFilesChanged = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSendingFile(true);
    try {
      for (const f of files) {
        await sendDmFile(peerId, f);
      }
    } finally {
      setSendingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    const text = content.trim();
    if (!text) return;

    sendDmText(peerId, text);
    setContent('');
  };

  return (
    <div className="p-4">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSelectFiles}
          disabled={!canSend}
          className="text-discord-interactive-normal hover:text-discord-interactive-hover disabled:opacity-50"
          title="Send file"
        >
          <PlusCircle className="w-6 h-6" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFilesChanged}
        />

        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={sessionStatus === 'active' ? 'Message' : 'Connect to start messaging'}
          disabled={!canSend}
          className="flex-1 bg-discord-bg-tertiary text-discord-text-normal rounded-lg px-4 py-3 outline-none disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={!canSend || !content.trim()}
          className="bg-discord-blurple hover:bg-discord-blurple-hover text-white font-medium px-4 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}
