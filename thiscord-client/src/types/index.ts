export enum PresenceStatus {
  Online = 0,
  Away = 1,
  DoNotDisturb = 2,
  Offline = 3,
  Invisible = 4,
}

export enum ChannelType {
  Text = 0,
  Announcement = 1,
  Voice = 2,
}

export interface User {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  status: PresenceStatus;
}

export interface UserDetail extends User {
  email: string;
  createdAt: string;
  lastSeenAt?: string;
}

export interface Server {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  ownerId: string;
  inviteCode: string;
  memberCount: number;
  createdAt: string;
}

export interface ServerDetail extends Server {
  owner: User;
  channels: Channel[];
  roles: Role[];
}

export enum FriendRequestStatus {
  Pending = 0,
  Accepted = 1,
  Declined = 2,
  Cancelled = 3,
}

export interface FriendRequest {
  id: string;
  requester: User;
  addressee: User;
  status: FriendRequestStatus;
  createdAt: string;
  respondedAt?: string;
}

export interface CreateFriendRequestRequest {
  usernameOrEmail: string;
}

export interface Channel {
  id: string;
  serverId: string;
  name: string;
  topic?: string;
  type: ChannelType;
  position: number;
}

export interface Role {
  id: string;
  name: string;
  color?: string;
  permissions: number;
  position: number;
}

export interface Member {
  id: string;
  user: User;
  nickname?: string;
  roles: Role[];
  joinedAt: string;
}

export interface Message {
  id: string;
  channelId: string;
  author: User;
  content?: string;
  createdAt: string;
  editedAt?: string;
  replyToId?: string;
  attachments: Attachment[];
}

export interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  contentType: string;
}

export interface MessagePagedResult {
  messages: Message[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface AttachmentCreateRequest {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  contentType: string;
}

export interface SendMessageWithAttachmentsRequest {
  content?: string;
  replyToId?: string;
  attachments: AttachmentCreateRequest[];
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// Create/Update types
export interface CreateServerRequest {
  name: string;
  description?: string;
  iconUrl?: string;
}

export interface CreateChannelRequest {
  name: string;
  topic?: string;
  type?: ChannelType;
}

export interface SendMessageRequest {
  content: string;
  replyToId?: string;
}
