import { useMemo } from 'react';
import type { DMMessage } from '../../stores/dmStore';

interface DmMessageItemProps {
  message: DMMessage;
  isOwn: boolean;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function DmMessageItem({ message, isOwn }: DmMessageItemProps) {
  const time = useMemo(() => formatTime(message.timestamp), [message.timestamp]);

  if (message.type === 'system') {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-discord-text-muted">{message.content}</span>
      </div>
    );
  }

  const bubbleClass = isOwn
    ? 'bg-discord-blurple text-white'
    : 'bg-discord-bg-tertiary text-discord-text-normal';

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} py-1`}>
      <div className={`max-w-[70%] rounded-lg px-3 py-2 ${bubbleClass}`}>
        {message.type === 'text' && <p className="text-sm break-words">{message.content}</p>}
        {message.type === 'file' && message.file && (
          <a
            href={message.file.url}
            target="_blank"
            rel="noopener noreferrer"
            download={message.file.fileName}
            className="text-sm underline"
          >
            {message.file.fileName}
          </a>
        )}
        <div className="mt-1 text-[10px] opacity-70">{time}</div>
      </div>
    </div>
  );
}
