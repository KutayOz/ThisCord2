using Microsoft.EntityFrameworkCore;
using ThisCord.Application.Common;
using ThisCord.Application.DTOs;
using ThisCord.Application.Interfaces;
using ThisCord.Domain.Entities;
using ThisCord.Infrastructure.Persistence;

namespace ThisCord.Infrastructure.Services;

public class MessageService : IMessageService
{
    private readonly ThisCordDbContext _context;
    private readonly IServerService _serverService;

    public MessageService(ThisCordDbContext context, IServerService serverService)
    {
        _context = context;
        _serverService = serverService;
    }

    public async Task<MessageDto> SendAsync(Guid channelId, Guid userId, SendMessageRequest request)
    {
        var channel = await _context.Channels
            .FirstOrDefaultAsync(c => c.Id == channelId);

        if (channel == null) throw new NotFoundException("Channel", channelId);

        var isMember = await _serverService.IsMemberAsync(channel.ServerId, userId);
        if (!isMember) throw new ForbiddenException();

        var message = new Message
        {
            ChannelId = channelId,
            AuthorId = userId,
            Content = request.Content,
            ReplyToId = request.ReplyToId
        };

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        // Load author for DTO
        await _context.Entry(message).Reference(m => m.Author).LoadAsync();

        return message.ToDto();
    }

    public async Task<MessageDto> SendWithAttachmentsAsync(Guid channelId, Guid userId, SendMessageWithAttachmentsRequest request)
    {
        var channel = await _context.Channels
            .FirstOrDefaultAsync(c => c.Id == channelId);

        if (channel == null) throw new NotFoundException("Channel", channelId);

        var isMember = await _serverService.IsMemberAsync(channel.ServerId, userId);
        if (!isMember) throw new ForbiddenException();

        var message = new Message
        {
            ChannelId = channelId,
            AuthorId = userId,
            Content = request.Content,
            ReplyToId = request.ReplyToId
        };

        foreach (var attachment in request.Attachments)
        {
            message.Attachments.Add(new Attachment
            {
                FileName = attachment.FileName,
                FileUrl = attachment.FileUrl,
                FileSize = attachment.FileSize,
                ContentType = attachment.ContentType
            });
        }

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        await _context.Entry(message).Reference(m => m.Author).LoadAsync();
        await _context.Entry(message).Collection(m => m.Attachments).LoadAsync();

        return message.ToDto();
    }

    public async Task<MessagePagedResult> GetChannelMessagesAsync(
        Guid channelId, 
        Guid userId, 
        Guid? before, 
        int limit = 50)
    {
        var channel = await _context.Channels
            .FirstOrDefaultAsync(c => c.Id == channelId);

        if (channel == null) throw new NotFoundException("Channel", channelId);

        var isMember = await _serverService.IsMemberAsync(channel.ServerId, userId);
        if (!isMember) throw new ForbiddenException();

        limit = Math.Clamp(limit, 1, 100);

        var query = _context.Messages
            .Where(m => m.ChannelId == channelId)
            .OrderByDescending(m => m.CreatedAt)
            .ThenByDescending(m => m.Id);

        if (before.HasValue)
        {
            var cursorMessage = await _context.Messages.FindAsync(before.Value);
            if (cursorMessage != null)
            {
                query = (IOrderedQueryable<Message>)query
                    .Where(m => m.CreatedAt < cursorMessage.CreatedAt ||
                               (m.CreatedAt == cursorMessage.CreatedAt && m.Id.CompareTo(cursorMessage.Id) < 0));
            }
        }

        var messages = await query
            .Take(limit + 1) // Fetch one extra to check if there are more
            .Include(m => m.Author)
            .Include(m => m.Attachments)
            .ToListAsync();

        var hasMore = messages.Count > limit;
        if (hasMore)
        {
            messages = messages.Take(limit).ToList();
        }

        var nextCursor = messages.LastOrDefault()?.Id;

        return new MessagePagedResult(
            messages.Select(m => m.ToDto()).ToList(),
            hasMore,
            nextCursor
        );
    }

    public async Task<MessageDto?> UpdateAsync(Guid messageId, Guid userId, UpdateMessageRequest request)
    {
        var message = await _context.Messages
            .Include(m => m.Author)
            .Include(m => m.Attachments)
            .FirstOrDefaultAsync(m => m.Id == messageId);

        if (message == null) throw new NotFoundException("Message", messageId);
        if (message.AuthorId != userId) throw new ForbiddenException();

        message.Content = request.Content;
        message.EditedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return message.ToDto();
    }

    public async Task<Guid> DeleteAsync(Guid messageId, Guid userId)
    {
        var message = await _context.Messages
            .Include(m => m.Channel)
                .ThenInclude(c => c.Server)
            .FirstOrDefaultAsync(m => m.Id == messageId);

        if (message == null) throw new NotFoundException("Message", messageId);

        // Allow author or server owner to delete
        var isAuthor = message.AuthorId == userId;
        var isServerOwner = message.Channel.Server.OwnerId == userId;

        if (!isAuthor && !isServerOwner) throw new ForbiddenException();

        _context.Messages.Remove(message);
        await _context.SaveChangesAsync();

        return message.ChannelId;
    }
}
