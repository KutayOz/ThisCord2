using Microsoft.EntityFrameworkCore;
using ThisCord.Application.Common;
using ThisCord.Application.DTOs;
using ThisCord.Application.Interfaces;
using ThisCord.Domain.Entities;
using ThisCord.Domain.Enums;
using ThisCord.Infrastructure.Persistence;

namespace ThisCord.Infrastructure.Services;

public class FriendService : IFriendService
{
    private readonly ThisCordDbContext _context;

    public FriendService(ThisCordDbContext context)
    {
        _context = context;
    }

    public async Task<List<UserDto>> GetFriendsAsync(Guid userId)
    {
        var requests = await _context.FriendRequests
            .Where(fr => fr.Status == FriendRequestStatus.Accepted &&
                         (fr.RequesterId == userId || fr.AddresseeId == userId))
            .Include(fr => fr.Requester)
            .Include(fr => fr.Addressee)
            .ToListAsync();

        var friends = requests
            .Select(fr => fr.RequesterId == userId ? fr.Addressee : fr.Requester)
            .GroupBy(u => u.Id)
            .Select(g => g.First())
            .Select(u => u.ToDto())
            .ToList();

        return friends;
    }

    public async Task<List<FriendRequestDto>> GetIncomingRequestsAsync(Guid userId)
    {
        var requests = await _context.FriendRequests
            .Where(fr => fr.AddresseeId == userId && fr.Status == FriendRequestStatus.Pending)
            .Include(fr => fr.Requester)
            .Include(fr => fr.Addressee)
            .OrderByDescending(fr => fr.CreatedAt)
            .ToListAsync();

        return requests.Select(fr => fr.ToDto()).ToList();
    }

    public async Task<List<FriendRequestDto>> GetOutgoingRequestsAsync(Guid userId)
    {
        var requests = await _context.FriendRequests
            .Where(fr => fr.RequesterId == userId && fr.Status == FriendRequestStatus.Pending)
            .Include(fr => fr.Requester)
            .Include(fr => fr.Addressee)
            .OrderByDescending(fr => fr.CreatedAt)
            .ToListAsync();

        return requests.Select(fr => fr.ToDto()).ToList();
    }

    public async Task<FriendRequestDto> SendFriendRequestAsync(Guid userId, CreateFriendRequestRequest request)
    {
        var query = request.UsernameOrEmail?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(query)) throw new BadRequestException("Username or email is required.");

        var queryLower = query.ToLowerInvariant();

        var target = await _context.Users
            .FirstOrDefaultAsync(u => u.Username.ToLower() == queryLower || u.Email.ToLower() == queryLower);

        if (target == null) throw new NotFoundException("User", query);
        if (target.Id == userId) throw new BadRequestException("You cannot add yourself.");

        var existingBetweenUsers = await _context.FriendRequests
            .Include(fr => fr.Requester)
            .Include(fr => fr.Addressee)
            .FirstOrDefaultAsync(fr =>
                (fr.RequesterId == userId && fr.AddresseeId == target.Id) ||
                (fr.RequesterId == target.Id && fr.AddresseeId == userId));

        if (existingBetweenUsers != null)
        {
            if (existingBetweenUsers.Status == FriendRequestStatus.Accepted)
                throw new ConflictException("You are already friends.");

            if (existingBetweenUsers.Status == FriendRequestStatus.Pending)
            {
                if (existingBetweenUsers.AddresseeId == userId)
                {
                    existingBetweenUsers.Status = FriendRequestStatus.Accepted;
                    existingBetweenUsers.RespondedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    return existingBetweenUsers.ToDto();
                }

                throw new ConflictException("Friend request already sent.");
            }

            existingBetweenUsers.RequesterId = userId;
            existingBetweenUsers.AddresseeId = target.Id;
            existingBetweenUsers.Status = FriendRequestStatus.Pending;
            existingBetweenUsers.RespondedAt = null;

            await _context.SaveChangesAsync();

            await _context.Entry(existingBetweenUsers).Reference(fr => fr.Requester).LoadAsync();
            await _context.Entry(existingBetweenUsers).Reference(fr => fr.Addressee).LoadAsync();

            return existingBetweenUsers.ToDto();
        }

        var friendRequest = new FriendRequest
        {
            RequesterId = userId,
            AddresseeId = target.Id,
            Status = FriendRequestStatus.Pending
        };

        _context.FriendRequests.Add(friendRequest);
        await _context.SaveChangesAsync();

        await _context.Entry(friendRequest).Reference(fr => fr.Requester).LoadAsync();
        await _context.Entry(friendRequest).Reference(fr => fr.Addressee).LoadAsync();

        return friendRequest.ToDto();
    }

    public async Task<FriendRequestDto> AcceptAsync(Guid userId, Guid requestId)
    {
        var request = await _context.FriendRequests
            .Include(fr => fr.Requester)
            .Include(fr => fr.Addressee)
            .FirstOrDefaultAsync(fr => fr.Id == requestId);

        if (request == null) throw new NotFoundException("FriendRequest", requestId);
        if (request.AddresseeId != userId) throw new ForbiddenException();
        if (request.Status != FriendRequestStatus.Pending) throw new ConflictException("Friend request is not pending.");

        request.Status = FriendRequestStatus.Accepted;
        request.RespondedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return request.ToDto();
    }

    public async Task<FriendRequestDto> DeclineAsync(Guid userId, Guid requestId)
    {
        var request = await _context.FriendRequests
            .Include(fr => fr.Requester)
            .Include(fr => fr.Addressee)
            .FirstOrDefaultAsync(fr => fr.Id == requestId);

        if (request == null) throw new NotFoundException("FriendRequest", requestId);
        if (request.AddresseeId != userId) throw new ForbiddenException();
        if (request.Status != FriendRequestStatus.Pending) throw new ConflictException("Friend request is not pending.");

        request.Status = FriendRequestStatus.Declined;
        request.RespondedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return request.ToDto();
    }

    public async Task<bool> CancelAsync(Guid userId, Guid requestId)
    {
        var request = await _context.FriendRequests
            .FirstOrDefaultAsync(fr => fr.Id == requestId);

        if (request == null) throw new NotFoundException("FriendRequest", requestId);
        if (request.RequesterId != userId) throw new ForbiddenException();
        if (request.Status != FriendRequestStatus.Pending) throw new ConflictException("Friend request is not pending.");

        request.Status = FriendRequestStatus.Cancelled;
        request.RespondedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> RemoveFriendAsync(Guid userId, Guid friendUserId)
    {
        var request = await _context.FriendRequests
            .FirstOrDefaultAsync(fr => fr.Status == FriendRequestStatus.Accepted &&
                                      ((fr.RequesterId == userId && fr.AddresseeId == friendUserId) ||
                                       (fr.RequesterId == friendUserId && fr.AddresseeId == userId)));

        if (request == null) throw new NotFoundException("Friendship", $"{userId}/{friendUserId}");

        _context.FriendRequests.Remove(request);
        await _context.SaveChangesAsync();

        return true;
    }
}
