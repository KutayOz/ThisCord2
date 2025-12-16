namespace ThisCord.Domain.Enums;

[Flags]
public enum PermissionType : long
{
    None = 0,
    ViewChannels = 1 << 0,
    SendMessages = 1 << 1,
    ManageMessages = 1 << 2,
    ManageChannels = 1 << 3,
    ManageServer = 1 << 4,
    ManageRoles = 1 << 5,
    KickMembers = 1 << 6,
    BanMembers = 1 << 7,
    CreateInvites = 1 << 8,
    AttachFiles = 1 << 9,
    MentionEveryone = 1 << 10,
    AddReactions = 1 << 11,
    Administrator = 1 << 12,  // Bypasses all permission checks
    
    // Common permission sets
    Default = ViewChannels | SendMessages | AddReactions | CreateInvites | AttachFiles,
    Moderator = Default | ManageMessages | KickMembers,
    Admin = Moderator | ManageChannels | ManageRoles | BanMembers | MentionEveryone,
    Owner = Administrator
}
