using ThisCord.Domain.Enums;

namespace ThisCord.Application.DTOs;

public record ChannelDto(
    Guid Id,
    Guid ServerId,
    string Name,
    string? Topic,
    ChannelType Type,
    int Position
);

public record CreateChannelRequest(
    string Name,
    string? Topic,
    ChannelType Type = ChannelType.Text
);

public record UpdateChannelRequest(
    string? Name,
    string? Topic,
    int? Position
);
