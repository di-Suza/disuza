import { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { api } from '@/shared/api/api';
import { connectSocket, disconnectSocket } from '@/shared/services/socket';

const SOCKET_HEARTBEAT_MS = 25_000;

const SocketLifecycle = () => {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const isAuthenticated = useAppSelector((state) => state.auth.status === 'authenticated');

  useEffect(() => {
    if (!accessToken || !isAuthenticated) {
      disconnectSocket();
      return undefined;
    }

    const socket = connectSocket(accessToken);
    const syncRealtimeState = () => {
      dispatch(api.util.invalidateTags(['Conversations', 'Messages', 'Notifications']));
    };
    const ensureConnectedAndSynced = () => {
      socket.auth = { accessToken };
      if (!socket.connected) {
        socket.connect();
      } else {
        socket.emit('heartbeat');
      }
      syncRealtimeState();
    };
    const intervalId = window.setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat');
      } else {
        socket.connect();
      }
    }, SOCKET_HEARTBEAT_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') ensureConnectedAndSynced();
    };

    socket.on('connect', syncRealtimeState);
    socket.io.on('reconnect', syncRealtimeState);
    window.addEventListener('focus', ensureConnectedAndSynced);
    window.addEventListener('online', ensureConnectedAndSynced);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      socket.off('connect', syncRealtimeState);
      socket.io.off('reconnect', syncRealtimeState);
      window.removeEventListener('focus', ensureConnectedAndSynced);
      window.removeEventListener('online', ensureConnectedAndSynced);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [accessToken, dispatch, isAuthenticated]);

  useEffect(() => () => disconnectSocket(), []);

  return null;
};

export default SocketLifecycle;
