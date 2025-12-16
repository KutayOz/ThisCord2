using Microsoft.EntityFrameworkCore;
using ThisCord.Application.Common;
using ThisCord.Application.DTOs;
using ThisCord.Application.Interfaces;
using ThisCord.Domain.Entities;
using ThisCord.Infrastructure.Persistence;

namespace ThisCord.Infrastructure.Services;

public class ChannelService : IChannelService
{
    private readonly ThisCordDbContext _context;
    private readonly IServerService _serverService;

    public ChannelService(ThisCordDbContext context, IServerService serverService)
    {
        _context = context;
        _serverService = serverService;
    }

    public async Task<ChannelDto> CreateAsync(Guid serverId, Guid userId, CreateChannelRequest request)
    {
        var server = await _context.Servers
            .Include(s => s.Channels)
            .FirstOrDefaultAsync(s => s.Id == serverId);

        if (server == null) throw new NotFoundException("Server", serverId);
        if (server.OwnerId != userId) throw new ForbiddenException();

        var maxPosition = server.Channels.Any() ? server.Channels.Max(c => c.Position) : -1;

        var channel = new Channel
        {
            ServerId = serverId,
            Name = request.Name,
            Topic = request.Topic,
            Type = request.Type,
            Position = maxPosition + 1
        };

        _context.Channels.Add(channel);
        await _context.SaveChangesAsync();

        return channel.ToDto();
    }

    public async Task<ChannelDto?> GetByIdAsync(Guid channelId, Guid userId)
    {
        var channel = await _context.Channels
            .FirstOrDefaultAsync(c => c.Id == channelId);

        if (channel == null) throw new NotFoundException("Channel", channelId);

        var isMember = await _serverService.IsMemberAsync(channel.ServerId, userId);
        if (!isMember) throw new ForbiddenException();

        return channel.ToDto();
    }

    public async Task<List<ChannelDto>> GetServerChannelsAsync(Guid serverId, Guid userId)
    {
        var isMember = await _serverService.IsMemberAsync(serverId, userId);
        if (!isMember) throw new ForbiddenException();

        var channels = await _context.Channels
            .Where(c => c.ServerId == serverId)
            .OrderBy(c => c.Position)
            .ToListAsync();

        return channels.Select(c => c.ToDto()).ToList();
    }

    public async Task<ChannelDto?> UpdateAsync(Guid channelId, Guid userId, UpdateChannelRequest request)
    {
        var channel = await _context.Channels
            .Include(c => c.Server)
            .FirstOrDefaultAsync(c => c.Id == channelId);

        if (channel == null) throw new NotFoundException("Channel", channelId);
        if (channel.Server.OwnerId != userId) throw new ForbiddenException();

        if (request.Name != null) channel.Name = request.Name;
        if (request.Topic != null) channel.Topic = request.Topic;
        if (request.Position.HasValue) channel.Position = request.Position.Value;

        await _context.SaveChangesAsync();

        return channel.ToDto();
    }

    public async Task<bool> DeleteAsync(Guid channelId, Guid userId)
    {
        var channel = await _context.Channels
            .Include(c => c.Server)
            .FirstOrDefaultAsync(c => c.Id == channelId);

        if (channel == null) throw new NotFoundException("Channel", channelId);
        if (channel.Server.OwnerId != userId) throw new ForbiddenException();

        _context.Channels.Remove(channel);
        await _context.SaveChangesAsync();

        return true;
    }
}
