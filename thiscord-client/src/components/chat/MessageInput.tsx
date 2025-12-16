import { useRef, useState } from 'react';
import { PlusCircle, Smile, Gift, Sticker } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { channelsApi } from '../../api/channels';
import { uploadsApi } from '../../api/uploads';

interface MessageInputProps {
  channelName: string;
}

export function MessageInput({ channelName }: MessageInputProps) {
  const { selectedChannelId, addMessage } = useAppStore();
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFilesChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = Array.from(e.target.files || []);
    setFiles(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && files.length === 0) || !selectedChannelId || sending) return;

    setSending(true);
    try {
      if (files.length > 0) {
        const attachments = await uploadsApi.upload(files);
        const message = await channelsApi.sendMessageWithAttachments(selectedChannelId, {
          content: content.trim() || undefined,
          attachments,
        });
        addMessage(message);
      } else {
        const message = await channelsApi.sendMessage(selectedChannelId, {
          content: content.trim(),
        });
        addMessage(message);
      }
      setContent('');
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 pb-6">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFilesChanged}
      />
      <div className="bg-discord-bg-tertiary rounded-lg flex items-center px-4">
        <button
          type="button"
          onClick={handleSelectFiles}
          className="p-2 text-discord-interactive-normal hover:text-discord-interactive-hover"
        >
          <PlusCircle className="w-6 h-6" />
        </button>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName}`}
          className="flex-1 bg-transparent text-discord-text-normal py-3 px-2 outline-none placeholder:text-discord-text-muted"
          disabled={sending}
        />
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-2 text-discord-interactive-normal hover:text-discord-interactive-hover"
          >
            <Gift className="w-6 h-6" />
          </button>
          <button
            type="button"
            className="p-2 text-discord-interactive-normal hover:text-discord-interactive-hover"
          >
            <Sticker className="w-6 h-6" />
          </button>
          <button
            type="button"
            className="p-2 text-discord-interactive-normal hover:text-discord-interactive-hover"
          >
            <Smile className="w-6 h-6" />
          </button>
        </div>
      </div>
    </form>
  );
}
