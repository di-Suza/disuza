import { useEffect, useMemo, useRef, useState } from 'react';

import { useAppSelector } from '@/app/store/hooks';
import type { CollabParticipant, RoomSyncPayload } from '@/features/collab/model/collab.types';
import { useToast } from '@/shared/hooks/useToast';
import { getSocket } from '@/shared/services/socket';

type PresenceStatePayload = {
  roomId: string;
  users?: Array<{ _id?: string; id?: string }>;
  activeUserIds?: string[];
};

type PresencePayload = {
  roomId: string;
  user?: { _id?: string; id?: string };
  userId?: string;
  status?: 'in_room' | 'not_in_room';
  type?: 'join' | 'leave';
};

type UseCollabRoomArgs = {
  roomId?: string;
  usersData: CollabParticipant[];
  currentUserId?: string;
};

const getPresenceUserId = (payload: PresencePayload) => payload.userId || payload.user?._id || payload.user?.id || '';

const useCollabRoom = ({ roomId, usersData, currentUserId }: UseCollabRoomArgs) => {
  const [presenceMap, setPresenceMap] = useState<Record<string, 'in_room' | 'not_in_room'>>({});
  const joinedRoomRef = useRef<string | null>(null);
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const { showInfo } = useToast();

  useEffect(() => {
    if (!roomId || !accessToken || usersData.length === 0) return undefined;

    const socket = getSocket(accessToken);
    const joinRoom = () => {
      socket.emit('join_collab_room', { roomId });
      joinedRoomRef.current = roomId;
    };

    const handlePresenceState = (payload: unknown) => {
      const data = payload as PresenceStatePayload;
      if (data.roomId !== roomId) return;

      const activeUserIds = data.activeUserIds || data.users?.map((user) => user._id || user.id || '').filter(Boolean) || [];
      setPresenceMap(activeUserIds.reduce<Record<string, 'in_room'>>((acc, userId) => {
        acc[userId] = 'in_room';
        return acc;
      }, {}));
    };

    const handlePresence = (payload: unknown) => {
      const data = payload as PresencePayload;
      if (data.roomId !== roomId) return;

      const userId = getPresenceUserId(data);
      if (!userId) return;

      setPresenceMap((previousMap) => ({
        ...previousMap,
        [userId]: data.status || (data.type === 'leave' ? 'not_in_room' : 'in_room'),
      }));
    };

    const handleRoomSyncToast = (payload: unknown) => {
      const data = payload as RoomSyncPayload;
      if (data.roomId !== roomId) return;

      if (data.type === 'SELECT_PROBLEM') {
        const selectedBy = data.data?.selectedBy as { _id?: string; userName?: string } | undefined;
        if (selectedBy?._id === currentUserId) return;

        const selectedProblem = data.data?.selectedProblem as { problemId?: { title?: string } } | undefined;
        showInfo(`${selectedBy?.userName || 'Your partner'} selected ${selectedProblem?.problemId?.title || 'a problem'}`);
      }

      if (data.type === 'UNSELECT_PROBLEM') {
        const unselectedBy = data.data?.unselectedBy as { _id?: string; userName?: string } | undefined;
        if (unselectedBy?._id === currentUserId) return;
        showInfo(`${unselectedBy?.userName || 'Your partner'} unselected the problem`);
      }
    };

    socket.on('connect', joinRoom);
    socket.io.on('reconnect', joinRoom);
    socket.on('presence_state', handlePresenceState);
    socket.on('presence', handlePresence);
    socket.on('room_sync', handleRoomSyncToast);

    if (socket.connected) {
      joinRoom();
    } else {
      socket.connect();
    }

    return () => {
      socket.off('connect', joinRoom);
      socket.io.off('reconnect', joinRoom);
      if (joinedRoomRef.current === roomId) {
        socket.emit('leave_collab_room', { roomId });
        joinedRoomRef.current = null;
      }
      socket.off('presence_state', handlePresenceState);
      socket.off('presence', handlePresence);
      socket.off('room_sync', handleRoomSyncToast);
    };
  }, [accessToken, currentUserId, roomId, showInfo, usersData.length]);

  const usersWithPresence = useMemo(() => usersData.map((user) => ({
    ...user,
    roomPresence: presenceMap[user._id] || 'not_in_room',
  })), [presenceMap, usersData]);

  return {
    presenceMap,
    usersWithPresence,
  };
};

export default useCollabRoom;
