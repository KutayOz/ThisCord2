using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ThisCord.Application.DTOs;

namespace ThisCord.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UploadsController : ControllerBase
{
    private readonly IWebHostEnvironment _environment;

    public UploadsController(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    [HttpPost]
    public async Task<ActionResult<List<AttachmentCreateRequest>>> Upload([FromForm] List<IFormFile> files)
    {
        if (files.Count == 0) return BadRequest(new { message = "No files uploaded" });

        var uploadsPath = Path.Combine(_environment.ContentRootPath, "uploads");
        Directory.CreateDirectory(uploadsPath);

        var results = new List<AttachmentCreateRequest>();

        foreach (var file in files)
        {
            if (file.Length <= 0) continue;

            var originalFileName = Path.GetFileName(file.FileName);
            var storedFileName = $"{Guid.NewGuid()}_{originalFileName}";
            var filePath = Path.Combine(uploadsPath, storedFileName);

            await using var stream = System.IO.File.Create(filePath);
            await file.CopyToAsync(stream);

            var fileUrl = $"{Request.Scheme}://{Request.Host}/uploads/{storedFileName}";
            results.Add(new AttachmentCreateRequest(
                originalFileName,
                fileUrl,
                file.Length,
                string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType));
        }

        return Ok(results);
    }
}
