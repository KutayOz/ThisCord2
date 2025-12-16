import { useEffect, useRef, useState, useCallback } from 'react';
import { Hash, Users } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { channelsApi } from '../../api/channels';
import { getCommunityHub } from '../../services/hubs';
import { MessageInput } from './MessageInput';
import { MessageItem } from './MessageItem';
import type { Message } from '../../types';

interface ChatAreaProps {
  showMembers: boolean;
  onToggleMembers: () => void;
}

export function ChatArea({ showMembers, onToggleMembers }: ChatAreaProps) {
  const { selectedChannelId, channels, messages, setMessages, prependMessages, addMessage, updateMessage, deleteMessage } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const selectedChannelIdRef = useRef<string | null>(null);
  const joinedChannelIdRef = useRef<string | null>(null);

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);

  const loadMessages = useCallback(async (channelId: string, before?: string) => {
    setLoading(true);
    try {
      const result = await channelsApi.getMessages(channelId, before);
      if (before) {
        prependMessages(result.messages.reverse());
      } else {
        setMessages(result.messages.reverse());
      }
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }, [setMessages, prependMessages]);

  useEffect(() => {
    selectedChannelIdRef.current = selectedChannelId;
  }, [selectedChannelId]);

  useEffect(() => {
    let isMounted = true;
    let cleanup: (() => void) | null = null;

    const setupHub = async () => {
      const hub = await getCommunityHub();
      if (!isMounted) return;

      const handleReceiveMessage = (message: Message) => {
        if (message.channelId === selectedChannelIdRef.current) {
          addMessage(message);
        }
      };

      const handleMessageUpdated = (message: Message) => {
        if (message.channelId === selectedChannelIdRef.current) {
          updateMessage(message);
        }
      };

      const handleMessageDeleted = (payload: { messageId: string; channelId: string }) => {
        if (payload.channelId === selectedChannelIdRef.current) {
          deleteMessage(payload.messageId);
        }
      };

      hub.on('ReceiveMessage', handleReceiveMessage);
      hub.on('MessageUpdated', handleMessageUpdated);
      hub.on('MessageDeleted', handleMessageDeleted);

      cleanup = () => {
        hub.off('ReceiveMessage', handleReceiveMessage);
        hub.off('MessageUpdated', handleMessageUpdated);
        hub.off('MessageDeleted', handleMessageDeleted);
      };
    };

    setupHub();

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, [addMessage, updateMessage, deleteMessage]);

  useEffect(() => {
    let cancelled = false;

    const syncChannelSubscription = async () => {
      const hub = await getCommunityHub();
      if (cancelled) return;

      const prevChannelId = joinedChannelIdRef.current;
      if (prevChannelId && prevChannelId !== selectedChannelId) {
        try {
          await hub.invoke('LeaveChannel', prevChannelId);
        } catch {
        }
      }

      if (selectedChannelId) {
        try {
          await hub.invoke('JoinChannel', selectedChannelId);
          joinedChannelIdRef.current = selectedChannelId;
        } catch {
        }
      } else {
        joinedChannelIdRef.current = null;
      }
    };

    syncChannelSubscription();
    return () => {
      cancelled = true;
    };
  }, [selectedChannelId]);

  useEffect(() => {
    if (selectedChannelId) {
      loadMessages(selectedChannelId);
    }
  }, [selectedChannelId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleLoadMore = () => {
    if (selectedChannelId && hasMore && nextCursor && !loading) {
      loadMessages(selectedChannelId, nextCursor);
    }
  };

  if (!selectedChannel) {
    return (
      <div className="flex-1 bg-discord-bg-primary flex items-center justify-center">
        <div className="text-center">
          <Hash className="w-16 h-16 text-discord-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No channel selected</h2>
          <p className="text-discord-text-muted">Select a channel to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-discord-bg-primary flex flex-col">
      {/* Channel Header */}
      <div className="h-12 px-4 flex items-center justify-between shadow-md border-b border-discord-bg-tertiary">
        <div className="flex items-center gap-2">
          <Hash className="w-6 h-6 text-discord-channel-default" />
          <span className="font-semibold text-white">{selectedChannel.name}</span>
          {selectedChannel.topic && (
            <>
              <div className="w-px h-6 bg-discord-bg-modifier-active mx-2" />
              <span className="text-sm text-discord-text-muted truncate max-w-md">
                {selectedChannel.topic}
              </span>
            </>
          )}
        </div>
        <button
          onClick={onToggleMembers}
          className={`p-2 rounded hover:bg-discord-bg-modifier-hover ${
            showMembers ? 'text-white' : 'text-discord-interactive-normal'
          }`}
        >
          <Users className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {hasMore && (
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="w-full py-2 text-sm text-discord-text-link hover:underline disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load more messages'}
          </button>
        )}

        {messages.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-discord-bg-secondary flex items-center justify-center mb-4">
              <Hash className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Welcome to #{selectedChannel.name}!
            </h2>
            <p className="text-discord-text-muted">
              This is the start of the #{selectedChannel.name} channel.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {messages.map((message, index) => {
              const prevMessage = messages[index - 1];
              const showHeader =
                !prevMessage ||
                prevMessage.author.id !== message.author.id ||
                new Date(message.createdAt).getTime() -
                  new Date(prevMessage.createdAt).getTime() >
                  5 * 60 * 1000;
              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  showHeader={showHeader}
                />
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput channelName={selectedChannel.name} />
    </div>
  );
}
