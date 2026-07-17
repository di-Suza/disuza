import { useEffect, useRef } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { api } from '@/shared/api/api';
import { connectSocket, disconnectSocket } from '@/shared/services/socket';

const SOCKET_HEARTBEAT_MS = 25_000;

const SocketLifecycle = () => {
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const isAuthenticated = useAppSelector((state) => state.auth.status === 'authenticated');
  const hasConnectedRef = useRef(false);

  useEffect(() => {
    if (!accessToken || !isAuthenticated) {
      hasConnectedRef.current = false;
      disconnectSocket();
      return undefined;
    }

    const socket = connectSocket(accessToken);
    const syncRealtimeState = () => {
      dispatch(api.util.invalidateTags(['Conversations', 'Notifications']));
    };
    const syncAfterInitialConnect = () => {
      if (!hasConnectedRef.current) {
        hasConnectedRef.current = true;
        return;
      }

      syncRealtimeState();
    };
    const ensureConnected = () => {
      socket.auth = { accessToken };
      if (!socket.connected) {
        socket.connect();
      } else {
        socket.emit('heartbeat');
      }
    };
    const intervalId = window.setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat');
      } else {
        socket.connect();
      }
    }, SOCKET_HEARTBEAT_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') ensureConnected();
    };

    socket.on('connect', syncAfterInitialConnect);
    socket.io.on('reconnect', syncRealtimeState);
    window.addEventListener('focus', ensureConnected);
    window.addEventListener('online', ensureConnected);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      socket.off('connect', syncAfterInitialConnect);
      socket.io.off('reconnect', syncRealtimeState);
      window.removeEventListener('focus', ensureConnected);
      window.removeEventListener('online', ensureConnected);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [accessToken, dispatch, isAuthenticated]);

  useEffect(() => () => disconnectSocket(), []);

  return null;
};

export default SocketLifecycle;
