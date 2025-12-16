using ThisCord.Application.DTOs;

namespace ThisCord.Application.Interfaces;

public interface IChannelService
{
    Task<ChannelDto> CreateAsync(Guid serverId, Guid userId, CreateChannelRequest request);
    Task<ChannelDto?> GetByIdAsync(Guid channelId, Guid userId);
    Task<List<ChannelDto>> GetServerChannelsAsync(Guid serverId, Guid userId);
    Task<ChannelDto?> UpdateAsync(Guid channelId, Guid userId, UpdateChannelRequest request);
    Task<bool> DeleteAsync(Guid channelId, Guid userId);
}
