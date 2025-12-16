using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using ThisCord.API.Hubs;
using ThisCord.Application.DTOs;
using ThisCord.Application.Interfaces;

namespace ThisCord.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly IMessageService _messageService;
    private readonly IHubContext<CommunityHub> _communityHubContext;

    public MessagesController(IMessageService messageService, IHubContext<CommunityHub> communityHubContext)
    {
        _messageService = messageService;
        _communityHubContext = communityHubContext;
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<MessageDto>> Update(Guid id, [FromBody] UpdateMessageRequest request)
    {
        var userId = GetCurrentUserId();
        var message = await _messageService.UpdateAsync(id, userId, request);

        await CommunityHub.BroadcastMessageUpdated(_communityHubContext, message!.ChannelId, message);
        return Ok(message);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetCurrentUserId();
        var channelId = await _messageService.DeleteAsync(id, userId);

        await CommunityHub.BroadcastMessageDeleted(_communityHubContext, channelId, id);
        return NoContent();
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("sub")?.Value;
        return Guid.Parse(userIdClaim!);
    }
}
