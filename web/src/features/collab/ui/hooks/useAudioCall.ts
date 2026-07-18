import Peer, { type MediaConnection } from 'peerjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CollabParticipant } from '@/features/collab/model/collab.types';
import { useToast } from '@/shared/hooks/useToast';
import { getSocket } from '@/shared/services/socket';

type AudioCallStatus = 'idle' | 'connecting' | 'in_call';

type VoiceParticipant = CollabParticipant & {
  peerId?: string;
  micEnabled?: boolean;
};

type VoiceStatePayload = {
  roomId?: string;
  users?: VoiceParticipant[];
};

type VoiceUserPayload = {
  roomId?: string;
  user?: VoiceParticipant;
  userId?: string;
};

const PEER_OPEN_TIMEOUT_MS = 10_000;

const getIceServers = (): RTCIceServer[] => {
  const iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
  const turnUrls = import.meta.env.VITE_TURN_URLS;

  if (turnUrls) {
    iceServers.push({
      urls: turnUrls.split(',').map((url: string) => url.trim()).filter(Boolean),
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_CREDENTIAL,
    });
  }

  return iceServers;
};

const createPeer = () => new Promise<{ peer: Peer; peerId: string }>((resolve, reject) => {
  const host = import.meta.env.VITE_PEER_HOST;
  const peer = new Peer({
    config: { iceServers: getIceServers() },
    ...(host
      ? {
        host,
        port: Number(import.meta.env.VITE_PEER_PORT || 443),
        path: import.meta.env.VITE_PEER_PATH || '/',
        secure: import.meta.env.VITE_PEER_SECURE !== 'false',
      }
      : {}),
  });
  let settled = false;
  const timeoutId = window.setTimeout(() => {
    if (settled) return;
    settled = true;
    peer.destroy();
    reject(new Error('Peer connection timed out'));
  }, PEER_OPEN_TIMEOUT_MS);

  peer.on('open', (peerId) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timeoutId);
    resolve({ peer, peerId });
  });

  peer.on('error', (error) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timeoutId);
    reject(error);
  });
});

const getMediaErrorMessage = (error: unknown) => {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError') return 'Mic permission denied. Please allow microphone access in your browser.';
  if (name === 'NotFoundError') return 'No microphone device was found.';
  if (!navigator.mediaDevices?.getUserMedia) return 'This browser does not support audio calling.';
  return 'Mic permission or call setup failed.';
};

type UseAudioCallArgs = {
  roomId?: string | null;
  usersData: CollabParticipant[];
  currentUserId?: string;
};

const useAudioCall = ({ roomId, usersData, currentUserId }: UseAudioCallArgs) => {
  const [status, setStatus] = useState<AudioCallStatus>('idle');
  const [micEnabled, setMicEnabled] = useState(true);
  const [voiceUsers, setVoiceUsers] = useState<VoiceParticipant[]>([]);
  const peerRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioContainerRef = useRef<HTMLDivElement | null>(null);
  const connectionsRef = useRef<Map<string, MediaConnection>>(new Map());
  const remoteAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const statusRef = useRef<AudioCallStatus>('idle');
  const voiceUsersRef = useRef<VoiceParticipant[]>([]);
  const { showError, showInfo } = useToast();
  const canStartAudioCall = Boolean(roomId);
  const audioParticipantCount = useMemo(() => voiceUsers.length, [voiceUsers.length]);

  const removeRemoteAudio = useCallback((userId: string) => {
    connectionsRef.current.get(userId)?.close();
    connectionsRef.current.delete(userId);
    const audio = remoteAudioElementsRef.current.get(userId);
    audio?.remove();
    remoteAudioElementsRef.current.delete(userId);
  }, []);

  const attachCallHandlers = useCallback((userId: string, call: MediaConnection) => {
    connectionsRef.current.set(userId, call);

    call.on('stream', (remoteStream) => {
      let audio = remoteAudioElementsRef.current.get(userId);

      if (!audio) {
        audio = document.createElement('audio');
        audio.autoplay = true;
        audio.setAttribute('playsinline', 'true');
        remoteAudioElementsRef.current.set(userId, audio);
        remoteAudioContainerRef.current?.appendChild(audio);
      }

      audio.srcObject = remoteStream;
      audio.play?.().catch(() => showInfo('Audio connected. If sound is blocked, click anywhere once.'));
    });

    call.on('close', () => removeRemoteAudio(userId));
    call.on('error', () => removeRemoteAudio(userId));
  }, [removeRemoteAudio, showInfo]);

  const connectToVoiceUser = useCallback((voiceUser: VoiceParticipant) => {
    if (!voiceUser._id || voiceUser._id === currentUserId || !voiceUser.peerId) return;
    if (!peerRef.current || !localStreamRef.current || connectionsRef.current.has(voiceUser._id)) return;

    const call = peerRef.current.call(voiceUser.peerId, localStreamRef.current, {
      metadata: { fromUserId: currentUserId },
    });
    attachCallHandlers(voiceUser._id, call);
  }, [attachCallHandlers, currentUserId]);

  const syncVoiceUsers = useCallback((nextUsers: VoiceParticipant[]) => {
    voiceUsersRef.current = nextUsers;
    setVoiceUsers(nextUsers);

    const activeUserIds = new Set(nextUsers.map((user) => user._id).filter(Boolean));
    Array.from(connectionsRef.current.keys()).forEach((userId) => {
      if (!activeUserIds.has(userId)) removeRemoteAudio(userId);
    });

    if (statusRef.current === 'in_call') {
      nextUsers.forEach(connectToVoiceUser);
    }
  }, [connectToVoiceUser, removeRemoteAudio]);

  const cleanupAudio = useCallback((emitLeave = true) => {
    if (emitLeave && roomId) {
      getSocket().emit('voice_leave_room', { roomId });
    }

    connectionsRef.current.forEach((call) => call.close());
    connectionsRef.current.clear();
    remoteAudioElementsRef.current.forEach((audio) => audio.remove());
    remoteAudioElementsRef.current.clear();
    peerRef.current?.destroy();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setMicEnabled(true);
    setStatus('idle');
    statusRef.current = 'idle';
  }, [roomId]);

  const startAudioCall = useCallback(async () => {
    if (!roomId || statusRef.current !== 'idle') return;

    try {
      setStatus('connecting');
      statusRef.current = 'connecting';
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const { peer, peerId } = await createPeer();
      localStreamRef.current = stream;
      peerRef.current = peer;

      peer.on('call', (call) => {
        const remoteUserId = (call.metadata as { fromUserId?: string } | undefined)?.fromUserId || call.peer;
        call.answer(stream);
        attachCallHandlers(remoteUserId, call);
      });

      peer.on('error', () => {
        showError('Audio connection failed.');
        cleanupAudio();
      });

      getSocket().emit('voice_join_room', {
        roomId,
        peerId,
        micEnabled: true,
      });
      setStatus('in_call');
      statusRef.current = 'in_call';
      voiceUsersRef.current.forEach(connectToVoiceUser);
    } catch (error) {
      showError(getMediaErrorMessage(error));
      cleanupAudio();
    }
  }, [attachCallHandlers, cleanupAudio, connectToVoiceUser, roomId, showError]);

  const endAudioCall = useCallback(() => {
    cleanupAudio();
  }, [cleanupAudio]);

  const toggleMic = useCallback(() => {
    if (!roomId || statusRef.current !== 'in_call') return;
    const nextMicEnabled = !micEnabled;

    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = nextMicEnabled;
    });
    setMicEnabled(nextMicEnabled);
    getSocket().emit('voice_media_state', {
      roomId,
      micEnabled: nextMicEnabled,
    });
  }, [micEnabled, roomId]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (!roomId || !currentUserId) return undefined;
    const socket = getSocket();

    const handleVoiceState = (payload: unknown) => {
      const data = payload as VoiceStatePayload;
      if (data.roomId !== roomId) return;
      syncVoiceUsers(data.users || []);
    };

    const handleVoiceJoined = (payload: unknown) => {
      const data = payload as VoiceUserPayload;
      if (data.roomId !== roomId || !data.user?._id) return;

      syncVoiceUsers([
        ...voiceUsersRef.current.filter((user) => user._id !== data.user!._id),
        data.user,
      ]);
    };

    const handleVoiceLeft = (payload: unknown) => {
      const data = payload as VoiceUserPayload;
      if (data.roomId !== roomId) return;
      const userId = data.userId || data.user?._id;
      if (!userId) return;

      removeRemoteAudio(userId);
      syncVoiceUsers(voiceUsersRef.current.filter((user) => user._id !== userId));
    };

    const handleVoiceMediaState = (payload: unknown) => {
      const data = payload as VoiceUserPayload;
      if (data.roomId !== roomId || !data.user?._id) return;

      syncVoiceUsers(voiceUsersRef.current.map((user) => (
        user._id === data.user!._id ? { ...user, micEnabled: data.user!.micEnabled } : user
      )));
    };

    const handleVoiceError = (payload: unknown) => {
      const data = payload as { roomId?: string; message?: string };
      if (data.roomId !== roomId) return;
      showError(data.message || 'Audio connection failed.');
      cleanupAudio(false);
    };

    socket.on('voice_state', handleVoiceState);
    socket.on('voice_user_joined', handleVoiceJoined);
    socket.on('voice_user_left', handleVoiceLeft);
    socket.on('voice_media_state', handleVoiceMediaState);
    socket.on('voice_error', handleVoiceError);

    return () => {
      socket.off('voice_state', handleVoiceState);
      socket.off('voice_user_joined', handleVoiceJoined);
      socket.off('voice_user_left', handleVoiceLeft);
      socket.off('voice_media_state', handleVoiceMediaState);
      socket.off('voice_error', handleVoiceError);
      cleanupAudio();
    };
  }, [cleanupAudio, currentUserId, removeRemoteAudio, roomId, showError, syncVoiceUsers]);

  const usersWithVoice = useMemo(() => {
    const voiceUserMap = new Map(voiceUsers.map((user) => [user._id, user]));

    return usersData.map((user) => ({
      ...user,
      micEnabled: voiceUserMap.get(user._id)?.micEnabled,
      isInAudio: voiceUserMap.has(user._id),
    }));
  }, [usersData, voiceUsers]);

  return {
    audioCallStatus: status,
    audioParticipantCount,
    canStartAudioCall,
    endAudioCall,
    micEnabled,
    remoteAudioContainerRef,
    startAudioCall,
    toggleMic,
    usersWithVoice,
  };
};

export default useAudioCall;
