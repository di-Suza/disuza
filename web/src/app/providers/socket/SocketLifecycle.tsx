import { useEffect } from 'react';

import { useAppSelector } from '@/app/store/hooks';
import { connectSocket, disconnectSocket } from '@/shared/services/socket';

const SOCKET_HEARTBEAT_MS = 25_000;

const SocketLifecycle = () => {
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const isAuthenticated = useAppSelector((state) => state.auth.status === 'authenticated');

  useEffect(() => {
    if (!accessToken || !isAuthenticated) {
      disconnectSocket();
      return undefined;
    }

    const socket = connectSocket(accessToken);
    const intervalId = window.setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat');
      }
    }, SOCKET_HEARTBEAT_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [accessToken, isAuthenticated]);

  useEffect(() => () => disconnectSocket(), []);

  return null;
};

export default SocketLifecycle;
