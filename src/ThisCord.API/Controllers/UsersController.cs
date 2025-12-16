using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ThisCord.Application.DTOs;
using ThisCord.Application.Interfaces;

namespace ThisCord.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IServerService _serverService;

    public UsersController(IUserService userService, IServerService serverService)
    {
        _userService = userService;
        _serverService = serverService;
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UserDto>> GetById(Guid id)
    {
        var user = await _userService.GetPublicProfileAsync(id);
        if (user == null) return NotFound();
        return Ok(user);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<UserDto>> UpdateProfile(Guid id, [FromBody] UpdateProfileRequest request)
    {
        var userId = GetCurrentUserId();
        if (id != userId) return Forbid();

        var user = await _userService.UpdateProfileAsync(id, request);
        return Ok(user);
    }

    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusRequest request)
    {
        var userId = GetCurrentUserId();
        if (id != userId) return Forbid();

        await _userService.UpdateStatusAsync(id, request.Status);
        return NoContent();
    }

    [HttpGet("{id:guid}/servers")]
    public async Task<ActionResult<List<ServerDto>>> GetUserServers(Guid id)
    {
        var userId = GetCurrentUserId();
        if (id != userId) return Forbid();

        var servers = await _serverService.GetUserServersAsync(id);
        return Ok(servers);
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("sub")?.Value;
        return Guid.Parse(userIdClaim!);
    }
}
