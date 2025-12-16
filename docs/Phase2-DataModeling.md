# Phase 2 – Data Modeling and Database Design (Community Side)

## Summary

This phase defines the relational data model for community features. All entities are designed for PostgreSQL with EF Core. DM content is explicitly excluded from persistence.

---

## Entity Relationship Diagram (Conceptual)

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│    User     │──────<│   Membership    │>──────│   Server    │
└─────────────┘       └─────────────────┘       └─────────────┘
      │                      │                        │
      │                      │                        │
      ▼                      ▼                        ▼
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│   Profile   │       │  MemberRole     │       │   Channel   │
└─────────────┘       └─────────────────┘       └─────────────┘
                             │                        │
                             ▼                        ▼
                      ┌─────────────────┐       ┌─────────────┐
                      │      Role       │       │   Message   │
                      └─────────────────┘       └─────────────┘
                             │                        │
                             ▼                        ▼
                      ┌─────────────────┐       ┌─────────────┐
                      │ RolePermission  │       │  Attachment │
                      └─────────────────┘       └─────────────┘
```

---

## Entity Definitions

### 1. User

Core identity entity for authentication and profile.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `Id` | `Guid` | PK | Unique identifier |
| `Username` | `string(32)` | Unique, Required | Display name (unique across platform) |
| `Email` | `string(256)` | Unique, Required | Login email |
| `PasswordHash` | `string(512)` | Required | BCrypt/Argon2 hash |
| `CreatedAt` | `DateTime` | Required | UTC timestamp |
| `UpdatedAt` | `DateTime` | Required | UTC timestamp |
| `IsDeleted` | `bool` | Default: false | Soft delete flag |
| `LastSeenAt` | `DateTime?` | Nullable | Last activity timestamp |

**Indexes:**
- Unique index on `Username`
- Unique index on `Email`
- Index on `IsDeleted` for filtering

---

### 2. Profile

Extended user information (1:1 with User).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `Id` | `Guid` | PK, FK → User.Id | Same as User.Id |
| `DisplayName` | `string(64)` | Nullable | Optional display name |
| `AvatarUrl` | `string(512)` | Nullable | Avatar image URL |
| `Bio` | `string(500)` | Nullable | User bio/status |
| `Status` | `enum` | Default: Offline | Online, Away, DnD, Offline |

**Relationship:** One-to-One with User (shared primary key)

---

### 3. Server (CommunityServer)

Represents a community server (like Discord servers).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `Id` | `Guid` | PK | Unique identifier |
| `Name` | `string(100)` | Required | Server display name |
| `Description` | `string(1000)` | Nullable | Server description |
| `IconUrl` | `string(512)` | Nullable | Server icon |
| `OwnerId` | `Guid` | FK → User.Id, Required | Server owner |
| `CreatedAt` | `DateTime` | Required | UTC timestamp |
| `UpdatedAt` | `DateTime` | Required | UTC timestamp |
| `IsDeleted` | `bool` | Default: false | Soft delete flag |
| `InviteCode` | `string(16)` | Unique | Join invite code |

**Indexes:**
- Unique index on `InviteCode`
- Index on `OwnerId`
- Index on `IsDeleted`

---

### 4. Channel

Text channels within a server.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `Id` | `Guid` | PK | Unique identifier |
| `ServerId` | `Guid` | FK → Server.Id, Required | Parent server |
| `Name` | `string(100)` | Required | Channel name |
| `Topic` | `string(1024)` | Nullable | Channel topic |
| `Type` | `enum` | Default: Text | Text, Announcement, Voice (future) |
| `Position` | `int` | Required | Sort order within server |
| `CreatedAt` | `DateTime` | Required | UTC timestamp |
| `IsDeleted` | `bool` | Default: false | Soft delete flag |

**Indexes:**
- Composite index on `(ServerId, IsDeleted, Position)` for ordered channel listing
- Index on `ServerId`

---

### 5. Membership

Join table for User-Server relationship.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `Id` | `Guid` | PK | Unique identifier |
| `UserId` | `Guid` | FK → User.Id, Required | Member user |
| `ServerId` | `Guid` | FK → Server.Id, Required | Server joined |
| `JoinedAt` | `DateTime` | Required | When user joined |
| `Nickname` | `string(64)` | Nullable | Server-specific nickname |

**Indexes:**
- Unique composite index on `(UserId, ServerId)` – prevents duplicate memberships
- Index on `ServerId` for listing members
- Index on `UserId` for listing user's servers

---

### 6. Role

Permission roles within a server.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `Id` | `Guid` | PK | Unique identifier |
| `ServerId` | `Guid` | FK → Server.Id, Required | Parent server |
| `Name` | `string(64)` | Required | Role name |
| `Color` | `string(7)` | Nullable | Hex color code |
| `Position` | `int` | Required | Hierarchy position (higher = more power) |
| `IsDefault` | `bool` | Default: false | Auto-assigned to new members |
| `CreatedAt` | `DateTime` | Required | UTC timestamp |

**Indexes:**
- Composite index on `(ServerId, Position)` for role hierarchy
- Index on `(ServerId, IsDefault)` for finding default role

---

### 7. RolePermission

Permissions assigned to roles (bit flags or separate entries).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `Id` | `Guid` | PK | Unique identifier |
| `RoleId` | `Guid` | FK → Role.Id, Required | Parent role |
| `Permission` | `enum/string` | Required | Permission type |
| `IsAllowed` | `bool` | Default: true | Allow or deny |

**Permission Types (enum):**
```csharp
public enum PermissionType
{
    ViewChannels,
    SendMessages,
    ManageMessages,
    ManageChannels,
    ManageServer,
    ManageRoles,
    KickMembers,
    BanMembers,
    CreateInvites,
    AttachFiles,
    MentionEveryone
}
```

**Alternative:** Use a single `Permissions` bigint field with bit flags for performance.

---

### 8. MemberRole

Join table for Membership-Role relationship.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `MembershipId` | `Guid` | FK → Membership.Id, PK | Member |
| `RoleId` | `Guid` | FK → Role.Id, PK | Role assigned |
| `AssignedAt` | `DateTime` | Required | When role was assigned |

**Indexes:**
- Composite PK on `(MembershipId, RoleId)`
- Index on `RoleId` for finding all members with a role

---

### 9. Message

Community channel messages.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `Id` | `Guid` | PK | Unique identifier |
| `ChannelId` | `Guid` | FK → Channel.Id, Required | Parent channel |
| `AuthorId` | `Guid` | FK → User.Id, Required | Message author |
| `Content` | `string(4000)` | Nullable | Message text content |
| `CreatedAt` | `DateTime` | Required | UTC timestamp |
| `UpdatedAt` | `DateTime?` | Nullable | Edit timestamp |
| `IsDeleted` | `bool` | Default: false | Soft delete flag |
| `ReplyToId` | `Guid?` | FK → Message.Id, Nullable | Reply reference |

**Indexes (Critical for Performance):**
- Composite index on `(ChannelId, CreatedAt DESC, IsDeleted)` – Primary query pattern
- Index on `AuthorId` for user message history
- Index on `Id` (PK, clustered)

**Pagination Strategy:**
Use cursor-based pagination with `CreatedAt` + `Id` as cursor for infinite scroll:
```sql
SELECT * FROM Messages 
WHERE ChannelId = @channelId 
  AND IsDeleted = false
  AND (CreatedAt, Id) < (@cursorTime, @cursorId)
ORDER BY CreatedAt DESC, Id DESC
LIMIT 50;
```

---

### 10. Attachment

File attachments for community messages.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `Id` | `Guid` | PK | Unique identifier |
| `MessageId` | `Guid` | FK → Message.Id, Required | Parent message |
| `FileName` | `string(256)` | Required | Original filename |
| `FileUrl` | `string(1024)` | Required | Storage URL (S3/local) |
| `FileSize` | `long` | Required | Size in bytes |
| `ContentType` | `string(128)` | Required | MIME type |
| `CreatedAt` | `DateTime` | Required | UTC timestamp |

**Indexes:**
- Index on `MessageId` for fetching message attachments

---

## Soft Delete Strategy

All major entities use soft delete (`IsDeleted` flag) rather than physical deletion:

1. **Messages:** Set `IsDeleted = true`. Content may be cleared for GDPR compliance.
2. **Channels:** Set `IsDeleted = true`. Messages remain but are hidden with channel.
3. **Servers:** Set `IsDeleted = true`. All channels inherit deletion state.
4. **Users:** Set `IsDeleted = true`. Username may be anonymized.

**Cleanup Job:** A background job can physically delete records older than 30 days with `IsDeleted = true`.

---

## Query Patterns and Optimization

### Pattern 1: Load Channel Messages (Infinite Scroll)
```csharp
// Cursor-based pagination for optimal performance
var messages = await context.Messages
    .Where(m => m.ChannelId == channelId && !m.IsDeleted)
    .Where(m => m.CreatedAt < cursorTime || 
               (m.CreatedAt == cursorTime && m.Id.CompareTo(cursorId) < 0))
    .OrderByDescending(m => m.CreatedAt)
    .ThenByDescending(m => m.Id)
    .Take(50)
    .Include(m => m.Author)
    .Include(m => m.Attachments)
    .ToListAsync();
```

### Pattern 2: Load User's Servers
```csharp
var servers = await context.Memberships
    .Where(m => m.UserId == userId)
    .Include(m => m.Server)
    .Where(m => !m.Server.IsDeleted)
    .Select(m => m.Server)
    .ToListAsync();
```

### Pattern 3: Check User Permission in Channel
```csharp
var hasPermission = await context.MemberRoles
    .Where(mr => mr.Membership.UserId == userId && 
                 mr.Membership.ServerId == serverId)
    .Join(context.RolePermissions,
          mr => mr.RoleId,
          rp => rp.RoleId,
          (mr, rp) => rp)
    .AnyAsync(rp => rp.Permission == PermissionType.SendMessages && rp.IsAllowed);
```

---

## EF Core Configuration Notes

```csharp
// Example: Message entity configuration
public class MessageConfiguration : IEntityTypeConfiguration<Message>
{
    public void Configure(EntityTypeBuilder<Message> builder)
    {
        builder.HasKey(m => m.Id);
        
        builder.Property(m => m.Content).HasMaxLength(4000);
        
        builder.HasOne(m => m.Channel)
            .WithMany(c => c.Messages)
            .HasForeignKey(m => m.ChannelId)
            .OnDelete(DeleteBehavior.Cascade);
            
        builder.HasOne(m => m.Author)
            .WithMany()
            .HasForeignKey(m => m.AuthorId)
            .OnDelete(DeleteBehavior.Restrict); // Don't cascade user deletion
            
        builder.HasOne(m => m.ReplyTo)
            .WithMany()
            .HasForeignKey(m => m.ReplyToId)
            .OnDelete(DeleteBehavior.SetNull);
            
        // Critical index for message pagination
        builder.HasIndex(m => new { m.ChannelId, m.CreatedAt, m.IsDeleted })
            .IsDescending(false, true, false);
    }
}
```

---

## What's NOT in the Database

Explicitly documenting what is **never** persisted:

| Data | Reason |
|------|--------|
| DM messages | Privacy: P2P only, RAM only |
| DM session keys | Security: ephemeral, RAM only |
| DM file attachments | Privacy: P2P transfer, RAM only |
| User passwords (plaintext) | Security: only hashes stored |
| WebRTC SDP/ICE data | Ephemeral: signaling only, not logged |

---

## Next Phase

Phase 3 will define the .NET 8 backend API structure, REST endpoints, SignalR hub design, and authentication approach.
