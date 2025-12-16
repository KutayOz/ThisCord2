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
public class ChannelsController : ControllerBase
{
    private readonly IChannelService _channelService;
    private readonly IMessageService _messageService;
    private readonly IHubContext<CommunityHub> _communityHubContext;

    public ChannelsController(
        IChannelService channelService,
        IMessageService messageService,
        IHubContext<CommunityHub> communityHubContext)
    {
        _channelService = channelService;
        _messageService = messageService;
        _communityHubContext = communityHubContext;
    }

    [HttpPost("servers/{serverId:guid}")]
    public async Task<ActionResult<ChannelDto>> Create(Guid serverId, [FromBody] CreateChannelRequest request)
    {
        var userId = GetCurrentUserId();
        var channel = await _channelService.CreateAsync(serverId, userId, request);
        return CreatedAtAction(nameof(GetById), new { id = channel.Id }, channel);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ChannelDto>> GetById(Guid id)
    {
        var userId = GetCurrentUserId();
        var channel = await _channelService.GetByIdAsync(id, userId);
        if (channel == null) return NotFound();
        return Ok(channel);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ChannelDto>> Update(Guid id, [FromBody] UpdateChannelRequest request)
    {
        var userId = GetCurrentUserId();
        var channel = await _channelService.UpdateAsync(id, userId, request);
        return Ok(channel);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetCurrentUserId();
        await _channelService.DeleteAsync(id, userId);
        return NoContent();
    }

    [HttpGet("{id:guid}/messages")]
    public async Task<ActionResult<MessagePagedResult>> GetMessages(
        Guid id,
        [FromQuery] Guid? before = null,
        [FromQuery] int limit = 50)
    {
        var userId = GetCurrentUserId();
        var result = await _messageService.GetChannelMessagesAsync(id, userId, before, limit);
        return Ok(result);
    }

    [HttpPost("{id:guid}/messages")]
    public async Task<ActionResult<MessageDto>> SendMessage(Guid id, [FromBody] SendMessageRequest request)
    {
        var userId = GetCurrentUserId();
        var message = await _messageService.SendAsync(id, userId, request);

        await CommunityHub.BroadcastNewMessage(_communityHubContext, id, message);
        return CreatedAtAction(nameof(GetMessages), new { id }, message);
    }

    [HttpPost("{id:guid}/messages/with-attachments")]
    public async Task<ActionResult<MessageDto>> SendMessageWithAttachments(Guid id, [FromBody] SendMessageWithAttachmentsRequest request)
    {
        var userId = GetCurrentUserId();
        var message = await _messageService.SendWithAttachmentsAsync(id, userId, request);

        await CommunityHub.BroadcastNewMessage(_communityHubContext, id, message);
        return CreatedAtAction(nameof(GetMessages), new { id }, message);
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("sub")?.Value;
        return Guid.Parse(userIdClaim!);
    }
}
