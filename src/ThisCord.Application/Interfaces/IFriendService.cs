using ThisCord.Application.DTOs;

namespace ThisCord.Application.Interfaces;

public interface IFriendService
{
    Task<List<UserDto>> GetFriendsAsync(Guid userId);
    Task<List<FriendRequestDto>> GetIncomingRequestsAsync(Guid userId);
    Task<List<FriendRequestDto>> GetOutgoingRequestsAsync(Guid userId);
    Task<FriendRequestDto> SendFriendRequestAsync(Guid userId, CreateFriendRequestRequest request);
    Task<FriendRequestDto> AcceptAsync(Guid userId, Guid requestId);
    Task<FriendRequestDto> DeclineAsync(Guid userId, Guid requestId);
    Task<bool> CancelAsync(Guid userId, Guid requestId);
    Task<bool> RemoveFriendAsync(Guid userId, Guid friendUserId);
}
