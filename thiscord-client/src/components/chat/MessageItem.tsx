import type { Message } from '../../types';

interface MessageItemProps {
  message: Message;
  showHeader: boolean;
}

export function MessageItem({ message, showHeader }: MessageItemProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday =
      new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    if (isToday) {
      return `Today at ${timeStr}`;
    } else if (isYesterday) {
      return `Yesterday at ${timeStr}`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      }) + ` ${timeStr}`;
    }
  };

  return (
    <div
      className={`group hover:bg-discord-bg-modifier-hover px-2 py-0.5 rounded ${
        showHeader ? 'mt-4' : ''
      }`}
    >
      {showHeader ? (
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-discord-blurple flex-shrink-0 flex items-center justify-center text-white font-medium">
            {message.author.avatarUrl ? (
              <img
                src={message.author.avatarUrl}
                alt={message.author.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              message.author.username.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-white hover:underline cursor-pointer">
                {message.author.displayName || message.author.username}
              </span>
              <span className="text-xs text-discord-text-muted">
                {formatTime(message.createdAt)}
              </span>
              {message.editedAt && (
                <span className="text-xs text-discord-text-muted">(edited)</span>
              )}
            </div>
            <p className="text-discord-text-normal break-words">{message.content}</p>
            {message.attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {message.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-discord-text-link hover:underline text-sm"
                  >
                    {attachment.fileName}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-4">
          <span className="w-10 text-[10px] text-discord-text-muted opacity-0 group-hover:opacity-100 text-right flex-shrink-0 leading-[22px]">
            {new Date(message.createdAt).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
          <p className="text-discord-text-normal break-words flex-1">{message.content}</p>
        </div>
      )}
    </div>
  );
}
