namespace ThisCord.Application.DTOs;

public record MessageDto(
    Guid Id,
    Guid ChannelId,
    UserDto Author,
    string? Content,
    DateTime CreatedAt,
    DateTime? EditedAt,
    Guid? ReplyToId,
    List<AttachmentDto> Attachments
);

public record AttachmentDto(
    Guid Id,
    string FileName,
    string FileUrl,
    long FileSize,
    string ContentType
);

public record SendMessageRequest(
    string Content,
    Guid? ReplyToId
);

public record UpdateMessageRequest(string Content);

public record MessagePagedResult(
    List<MessageDto> Messages,
    bool HasMore,
    Guid? NextCursor
);

public record AttachmentCreateRequest(
    string FileName,
    string FileUrl,
    long FileSize,
    string ContentType
);

public record SendMessageWithAttachmentsRequest(
    string? Content,
    Guid? ReplyToId,
    List<AttachmentCreateRequest> Attachments
);
