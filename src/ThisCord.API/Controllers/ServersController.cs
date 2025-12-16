using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ThisCord.Application.DTOs;
using ThisCord.Application.Interfaces;

namespace ThisCord.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ServersController : ControllerBase
{
    private readonly IServerService _serverService;

    public ServersController(IServerService serverService)
    {
        _serverService = serverService;
    }

    [HttpPost]
    public async Task<ActionResult<ServerDto>> Create([FromBody] CreateServerRequest request)
    {
        var userId = GetCurrentUserId();
        var server = await _serverService.CreateAsync(userId, request);
        return CreatedAtAction(nameof(GetById), new { id = server.Id }, server);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ServerDetailDto>> GetById(Guid id)
    {
        var userId = GetCurrentUserId();
        var server = await _serverService.GetByIdAsync(id, userId);
        if (server == null) return NotFound();
        return Ok(server);
    }

    [HttpGet]
    public async Task<ActionResult<List<ServerDto>>> GetMyServers()
    {
        var userId = GetCurrentUserId();
        var servers = await _serverService.GetUserServersAsync(userId);
        return Ok(servers);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ServerDto>> Update(Guid id, [FromBody] UpdateServerRequest request)
    {
        var userId = GetCurrentUserId();
        var server = await _serverService.UpdateAsync(id, userId, request);
        return Ok(server);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetCurrentUserId();
        await _serverService.DeleteAsync(id, userId);
        return NoContent();
    }

    [HttpPost("join/{inviteCode}")]
    public async Task<ActionResult<ServerDto>> Join(string inviteCode)
    {
        var userId = GetCurrentUserId();
        var server = await _serverService.JoinByInviteCodeAsync(userId, inviteCode);
        return Ok(server);
    }

    [HttpDelete("{id:guid}/leave")]
    public async Task<IActionResult> Leave(Guid id)
    {
        var userId = GetCurrentUserId();
        await _serverService.LeaveAsync(id, userId);
        return NoContent();
    }

    [HttpGet("{id:guid}/members")]
    public async Task<ActionResult<List<MemberDto>>> GetMembers(Guid id)
    {
        var userId = GetCurrentUserId();
        var members = await _serverService.GetMembersAsync(id, userId);
        return Ok(members);
    }

    [HttpGet("{id:guid}/channels")]
    public async Task<ActionResult<List<ChannelDto>>> GetChannels(Guid id, [FromServices] IChannelService channelService)
    {
        var userId = GetCurrentUserId();
        var channels = await channelService.GetServerChannelsAsync(id, userId);
        return Ok(channels);
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("sub")?.Value;
        return Guid.Parse(userIdClaim!);
    }
}
