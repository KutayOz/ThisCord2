using ThisCord.Application.DTOs;

namespace ThisCord.Application.Interfaces;

public interface IServerService
{
    Task<ServerDto> CreateAsync(Guid userId, CreateServerRequest request);
    Task<ServerDetailDto?> GetByIdAsync(Guid serverId, Guid userId);
    Task<List<ServerDto>> GetUserServersAsync(Guid userId);
    Task<ServerDto?> UpdateAsync(Guid serverId, Guid userId, UpdateServerRequest request);
    Task<bool> DeleteAsync(Guid serverId, Guid userId);
    Task<ServerDto?> JoinByInviteCodeAsync(Guid userId, string inviteCode);
    Task<bool> LeaveAsync(Guid serverId, Guid userId);
    Task<List<MemberDto>> GetMembersAsync(Guid serverId, Guid userId);
    Task<bool> IsMemberAsync(Guid serverId, Guid userId);
}
