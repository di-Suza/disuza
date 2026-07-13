import type { Socket } from 'socket.io';

type RealtimeUser = {
  id: string;
  userName: string;
  email: string;
  role: string;
  active: boolean;
  profilePicture?: {
    url: string;
    fileId: string;
  };
};

type AuthenticatedSocket = Socket & {
  user: RealtimeUser;
  data: Socket['data'] & {
    collabRooms?: Set<string>;
  };
};

type PresenceUser = {
  _id: string;
  userName: string;
  profilePicture?: RealtimeUser['profilePicture'];
  socketId: string;
};

export { type AuthenticatedSocket, type PresenceUser, type RealtimeUser };
