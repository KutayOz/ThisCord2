using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ThisCord.Application.DTOs;
using ThisCord.Application.Interfaces;

namespace ThisCord.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FriendsController : ControllerBase
{
    private readonly IFriendService _friendService;

    public FriendsController(IFriendService friendService)
    {
        _friendService = friendService;
    }

    [HttpGet]
    public async Task<ActionResult<List<UserDto>>> GetFriends()
    {
        var userId = GetCurrentUserId();
        var friends = await _friendService.GetFriendsAsync(userId);
        return Ok(friends);
    }

    [HttpGet("requests/incoming")]
    public async Task<ActionResult<List<FriendRequestDto>>> GetIncomingRequests()
    {
        var userId = GetCurrentUserId();
        var requests = await _friendService.GetIncomingRequestsAsync(userId);
        return Ok(requests);
    }

    [HttpGet("requests/outgoing")]
    public async Task<ActionResult<List<FriendRequestDto>>> GetOutgoingRequests()
    {
        var userId = GetCurrentUserId();
        var requests = await _friendService.GetOutgoingRequestsAsync(userId);
        return Ok(requests);
    }

    [HttpPost("requests")]
    public async Task<ActionResult<FriendRequestDto>> SendFriendRequest([FromBody] CreateFriendRequestRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _friendService.SendFriendRequestAsync(userId, request);
        return Ok(result);
    }

    [HttpPost("requests/{id:guid}/accept")]
    public async Task<ActionResult<FriendRequestDto>> Accept(Guid id)
    {
        var userId = GetCurrentUserId();
        var result = await _friendService.AcceptAsync(userId, id);
        return Ok(result);
    }

    [HttpPost("requests/{id:guid}/decline")]
    public async Task<ActionResult<FriendRequestDto>> Decline(Guid id)
    {
        var userId = GetCurrentUserId();
        var result = await _friendService.DeclineAsync(userId, id);
        return Ok(result);
    }

    [HttpPost("requests/{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var userId = GetCurrentUserId();
        await _friendService.CancelAsync(userId, id);
        return NoContent();
    }

    [HttpDelete("{friendUserId:guid}")]
    public async Task<IActionResult> RemoveFriend(Guid friendUserId)
    {
        var userId = GetCurrentUserId();
        await _friendService.RemoveFriendAsync(userId, friendUserId);
        return NoContent();
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("sub")?.Value;
        return Guid.Parse(userIdClaim!);
    }
}
