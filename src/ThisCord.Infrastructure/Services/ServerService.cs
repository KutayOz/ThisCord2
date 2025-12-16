using Microsoft.EntityFrameworkCore;
using ThisCord.Application.Common;
using ThisCord.Application.DTOs;
using ThisCord.Application.Interfaces;
using ThisCord.Domain.Entities;
using ThisCord.Domain.Enums;
using ThisCord.Infrastructure.Persistence;

namespace ThisCord.Infrastructure.Services;

public class ServerService : IServerService
{
    private readonly ThisCordDbContext _context;

    public ServerService(ThisCordDbContext context)
    {
        _context = context;
    }

    public async Task<ServerDto> CreateAsync(Guid userId, CreateServerRequest request)
    {
        var server = new Server
        {
            Name = request.Name,
            Description = request.Description,
            IconUrl = request.IconUrl,
            OwnerId = userId
        };

        // Create default role
        var defaultRole = new Role
        {
            Name = "@everyone",
            IsDefault = true,
            Position = 0,
            Permissions = PermissionType.Default,
            Server = server
        };

        // Create default channel
        var generalChannel = new Channel
        {
            Name = "general",
            Topic = "General discussion",
            Position = 0,
            Server = server
        };

        // Add owner as member
        var membership = new Membership
        {
            UserId = userId,
            Server = server
        };

        var memberRole = new MemberRole
        {
            Membership = membership,
            Role = defaultRole
        };

        server.Roles.Add(defaultRole);
        server.Channels.Add(generalChannel);
        server.Memberships.Add(membership);

        _context.Servers.Add(server);
        _context.MemberRoles.Add(memberRole);
        
        await _context.SaveChangesAsync();

        return server.ToDto();
    }

    public async Task<ServerDetailDto?> GetByIdAsync(Guid serverId, Guid userId)
    {
        var isMember = await IsMemberAsync(serverId, userId);
        if (!isMember) throw new ForbiddenException();

        var server = await _context.Servers
            .Include(s => s.Owner)
            .Include(s => s.Channels.Where(c => !c.IsDeleted).OrderBy(c => c.Position))
            .Include(s => s.Roles.OrderByDescending(r => r.Position))
            .Include(s => s.Memberships)
            .FirstOrDefaultAsync(s => s.Id == serverId);

        return server?.ToDetailDto();
    }

    public async Task<List<ServerDto>> GetUserServersAsync(Guid userId)
    {
        var servers = await _context.Memberships
            .Where(m => m.UserId == userId)
            .Include(m => m.Server)
                .ThenInclude(s => s.Memberships)
            .Select(m => m.Server)
            .ToListAsync();

        return servers.Select(s => s.ToDto()).ToList();
    }

    public async Task<ServerDto?> UpdateAsync(Guid serverId, Guid userId, UpdateServerRequest request)
    {
        var server = await _context.Servers
            .Include(s => s.Memberships)
            .FirstOrDefaultAsync(s => s.Id == serverId);

        if (server == null) throw new NotFoundException("Server", serverId);
        if (server.OwnerId != userId) throw new ForbiddenException();

        if (request.Name != null) server.Name = request.Name;
        if (request.Description != null) server.Description = request.Description;
        if (request.IconUrl != null) server.IconUrl = request.IconUrl;

        await _context.SaveChangesAsync();

        return server.ToDto();
    }

    public async Task<bool> DeleteAsync(Guid serverId, Guid userId)
    {
        var server = await _context.Servers.FindAsync(serverId);

        if (server == null) throw new NotFoundException("Server", serverId);
        if (server.OwnerId != userId) throw new ForbiddenException();

        _context.Servers.Remove(server); // Soft delete via SaveChangesAsync
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<ServerDto?> JoinByInviteCodeAsync(Guid userId, string inviteCode)
    {
        var server = await _context.Servers
            .Include(s => s.Memberships)
            .Include(s => s.Roles.Where(r => r.IsDefault))
            .FirstOrDefaultAsync(s => s.InviteCode == inviteCode);

        if (server == null) throw new NotFoundException("Server with invite code", inviteCode);

        // Check if already a member
        if (server.Memberships.Any(m => m.UserId == userId))
            throw new ConflictException("You are already a member of this server.");

        var membership = new Membership
        {
            UserId = userId,
            ServerId = server.Id
        };

        // Assign default role
        var defaultRole = server.Roles.FirstOrDefault(r => r.IsDefault);
        if (defaultRole != null)
        {
            var memberRole = new MemberRole
            {
                Membership = membership,
                RoleId = defaultRole.Id
            };
            _context.MemberRoles.Add(memberRole);
        }

        _context.Memberships.Add(membership);
        await _context.SaveChangesAsync();

        return server.ToDto();
    }

    public async Task<bool> LeaveAsync(Guid serverId, Guid userId)
    {
        var server = await _context.Servers.FindAsync(serverId);
        if (server == null) throw new NotFoundException("Server", serverId);

        if (server.OwnerId == userId)
            throw new BadRequestException("Server owner cannot leave. Transfer ownership or delete the server.");

        var membership = await _context.Memberships
            .FirstOrDefaultAsync(m => m.ServerId == serverId && m.UserId == userId);

        if (membership == null)
            throw new NotFoundException("Membership", $"{serverId}/{userId}");

        _context.Memberships.Remove(membership);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<List<MemberDto>> GetMembersAsync(Guid serverId, Guid userId)
    {
        var isMember = await IsMemberAsync(serverId, userId);
        if (!isMember) throw new ForbiddenException();

        var members = await _context.Memberships
            .Where(m => m.ServerId == serverId)
            .Include(m => m.User)
            .Include(m => m.MemberRoles)
                .ThenInclude(mr => mr.Role)
            .ToListAsync();

        return members.Select(m => m.ToDto()).ToList();
    }

    public async Task<bool> IsMemberAsync(Guid serverId, Guid userId)
    {
        return await _context.Memberships
            .AnyAsync(m => m.ServerId == serverId && m.UserId == userId);
    }
}
