using ThisCord.Application.DTOs;

namespace ThisCord.Application.Interfaces;

public interface IMessageService
{
    Task<MessageDto> SendAsync(Guid channelId, Guid userId, SendMessageRequest request);
    Task<MessageDto> SendWithAttachmentsAsync(Guid channelId, Guid userId, SendMessageWithAttachmentsRequest request);
    Task<MessagePagedResult> GetChannelMessagesAsync(Guid channelId, Guid userId, Guid? before, int limit = 50);
    Task<MessageDto?> UpdateAsync(Guid messageId, Guid userId, UpdateMessageRequest request);
    Task<Guid> DeleteAsync(Guid messageId, Guid userId);
}
