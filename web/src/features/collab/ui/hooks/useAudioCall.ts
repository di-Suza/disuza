import Peer, { type MediaConnection } from 'peerjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import callingAudio from '@/shared/assets/audio/calling.mp3?url';
import type { CollabParticipant } from '@/features/collab/model/collab.types';
import { useToast } from '@/shared/hooks/useToast';
import { getSocket } from '@/shared/services/socket';

type AudioCallStatus = 'idle' | 'calling' | 'ringing' | 'connecting' | 'in_call';

type CallData = {
  callId?: string;
  peerId?: string;
  toUserId?: string;
  fromUserId?: string;
  fromUser?: CollabParticipant;
  micEnabled?: boolean;
  reason?: string;
};

type CallSignalPayload = {
  roomId?: string;
  type?: string;
  data?: CallData;
  from?: {
    id?: string;
    _id?: string;
    userName?: string;
    profilePicture?: CollabParticipant['profilePicture'];
  };
};

const CALL_RING_TIMEOUT_MS = 30_000;
const CALL_CONNECT_TIMEOUT_MS = 20_000;
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

const createCallId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
  if (name === 'NotAllowedError') return 'Mic permission denied. Browser me microphone allow karna padega.';
  if (name === 'NotFoundError') return 'Microphone device nahi mila.';
  if (!navigator.mediaDevices?.getUserMedia) return 'Ye browser audio calling support nahi kar raha.';
  return 'Mic permission ya call setup fail ho gaya.';
};

type UseAudioCallArgs = {
  roomId?: string | null;
  usersData: CollabParticipant[];
  currentUserId?: string;
};

const useAudioCall = ({ roomId, usersData, currentUserId }: UseAudioCallArgs) => {
  const [status, setStatus] = useState<AudioCallStatus>('idle');
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const [remoteUser, setRemoteUser] = useState<CollabParticipant | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [remoteMicEnabled, setRemoteMicEnabled] = useState(true);
  const peerRef = useRef<Peer | null>(null);
  const activeCallRef = useRef<MediaConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callToneRef = useRef<HTMLAudioElement | null>(null);
  const statusRef = useRef<AudioCallStatus>('idle');
  const canStartAudioCallRef = useRef(false);
  const remoteUserRef = useRef<CollabParticipant | null>(null);
  const incomingCallRef = useRef<CallData | null>(null);
  const callTimeoutRef = useRef<number | null>(null);
  const callIdRef = useRef<string | null>(null);
  const { showError, showInfo } = useToast();

  const otherUser = useMemo(() => usersData.find((user) => user._id !== currentUserId) || null, [currentUserId, usersData]);
  const canStartAudioCall = useMemo(() => Boolean(otherUser && usersData.length >= 2 && usersData.every((user) => user.roomPresence === 'in_room')), [otherUser, usersData]);

  const playCallTone = useCallback(() => {
    if (callToneRef.current) {
      callToneRef.current.currentTime = 0;
      callToneRef.current.play().catch(() => {});
      return;
    }

    const audio = new Audio(callingAudio);
    audio.loop = true;
    audio.volume = 0.45;
    callToneRef.current = audio;
    audio.play().catch(() => {
      // Browser can block sound until user interaction.
    });
  }, []);

  const stopCallTone = useCallback(() => {
    if (!callToneRef.current) return;
    callToneRef.current.pause();
    callToneRef.current.currentTime = 0;
  }, []);

  const cleanupCall = useCallback(({ stopTracks = true } = {}) => {
    if (callTimeoutRef.current) window.clearTimeout(callTimeoutRef.current);
    callTimeoutRef.current = null;
    stopCallTone();
    activeCallRef.current?.close();
    peerRef.current?.destroy();
    if (stopTracks) localStreamRef.current?.getTracks().forEach((track) => track.stop());
    activeCallRef.current = null;
    peerRef.current = null;
    localStreamRef.current = null;
    callIdRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setIncomingCall(null);
    setRemoteUser(null);
    setMicEnabled(true);
    setRemoteMicEnabled(true);
    setStatus('idle');
    statusRef.current = 'idle';
  }, [stopCallTone]);

  const startTimeout = useCallback((handler: () => void, timeout = CALL_RING_TIMEOUT_MS) => {
    if (callTimeoutRef.current) window.clearTimeout(callTimeoutRef.current);
    callTimeoutRef.current = window.setTimeout(handler, timeout);
  }, []);

  const attachCallHandlers = useCallback((call: MediaConnection) => {
    activeCallRef.current = call;
    call.on('stream', (remoteStream) => {
      if (callTimeoutRef.current) window.clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play?.().catch(() => showInfo('Audio connected. If sound is blocked, click anywhere once.'));
      }
      setStatus('in_call');
      statusRef.current = 'in_call';
    });
    call.on('close', () => cleanupCall());
    call.on('error', () => {
      showError('Audio call connection failed.');
      cleanupCall();
    });
  }, [cleanupCall, showError, showInfo]);

  const getMicStream = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    return stream;
  }, []);

  const startAudioCall = useCallback(async () => {
    if (!roomId || !canStartAudioCall || !otherUser || statusRef.current !== 'idle') {
      showError('Audio call tabhi start hogi jab dono users room me honge.');
      return;
    }

    try {
      setStatus('calling');
      statusRef.current = 'calling';
      setRemoteUser(otherUser);
      playCallTone();
      const stream = await getMicStream();
      const { peer, peerId } = await createPeer();
      const callId = createCallId();
      peerRef.current = peer;
      callIdRef.current = callId;
      peer.on('call', (call) => {
        call.answer(stream);
        attachCallHandlers(call);
      });
      getSocket().emit('call_signal', {
        roomId,
        type: 'CALL_REQUEST',
        data: {
          callId,
          toUserId: otherUser._id,
          peerId,
          callType: 'audio',
          micEnabled: true,
        },
      });
      startTimeout(() => {
        getSocket().emit('call_signal', {
          roomId,
          type: 'CALL_ENDED',
          data: { toUserId: otherUser._id, callId, reason: 'no_answer' },
        });
        showInfo('Audio call was not answered.');
        cleanupCall();
      });
    } catch (error) {
      showError(getMediaErrorMessage(error));
      cleanupCall();
    }
  }, [attachCallHandlers, canStartAudioCall, cleanupCall, getMicStream, otherUser, playCallTone, roomId, showError, showInfo, startTimeout]);

  const acceptAudioCall = useCallback(async () => {
    if (!roomId || !incomingCall || statusRef.current !== 'ringing' || !incomingCall.peerId) return;

    try {
      stopCallTone();
      setStatus('connecting');
      statusRef.current = 'connecting';
      const stream = await getMicStream();
      const { peer, peerId } = await createPeer();
      peerRef.current = peer;
      callIdRef.current = incomingCall.callId || null;
      const call = peer.call(incomingCall.peerId, stream);
      attachCallHandlers(call);
      startTimeout(() => {
        showError('Audio connection timed out. Please try again.');
        getSocket().emit('call_signal', {
          roomId,
          type: 'CALL_ENDED',
          data: { toUserId: incomingCall.fromUserId, reason: 'connect_timeout' },
        });
        cleanupCall();
      }, CALL_CONNECT_TIMEOUT_MS);
      getSocket().emit('call_signal', {
        roomId,
        type: 'CALL_ACCEPTED',
        data: {
          callId: incomingCall.callId,
          toUserId: incomingCall.fromUserId,
          peerId,
          callType: 'audio',
          micEnabled: true,
        },
      });
      setIncomingCall(null);
    } catch (error) {
      showError(getMediaErrorMessage(error));
      cleanupCall();
    }
  }, [attachCallHandlers, cleanupCall, getMicStream, incomingCall, roomId, showError, startTimeout, stopCallTone]);

  const rejectAudioCall = useCallback(() => {
    if (!roomId || !incomingCall) return;
    getSocket().emit('call_signal', {
      roomId,
      type: 'CALL_REJECTED',
      data: {
        toUserId: incomingCall.fromUserId,
        callId: incomingCall.callId,
      },
    });
    cleanupCall({ stopTracks: false });
  }, [cleanupCall, incomingCall, roomId]);

  const endAudioCall = useCallback(() => {
    if (!roomId) return;
    getSocket().emit('call_signal', {
      roomId,
      type: 'CALL_ENDED',
      data: {
        toUserId: remoteUserRef.current?._id || incomingCallRef.current?.fromUserId,
        callId: callIdRef.current,
      },
    });
    cleanupCall();
  }, [cleanupCall, roomId]);

  const toggleMic = useCallback(() => {
    if (!roomId) return;
    const nextMicEnabled = !micEnabled;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = nextMicEnabled;
    });
    setMicEnabled(nextMicEnabled);
    getSocket().emit('call_signal', {
      roomId,
      type: 'MEDIA_STATE_CHANGED',
      data: {
        toUserId: remoteUserRef.current?._id,
        callId: callIdRef.current,
        micEnabled: nextMicEnabled,
      },
    });
  }, [micEnabled, roomId]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    canStartAudioCallRef.current = canStartAudioCall;
    if (canStartAudioCall || !['calling', 'ringing', 'connecting', 'in_call'].includes(statusRef.current)) return;
    showInfo('Audio call ended because your partner left the room.');
    cleanupCall();
  }, [canStartAudioCall, cleanupCall, showInfo]);

  useEffect(() => {
    remoteUserRef.current = remoteUser;
  }, [remoteUser]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    if (!roomId || !currentUserId) return undefined;
    const socket = getSocket();
    const handleCallSignal = (payload: unknown) => {
      const { roomId: eventRoomId, type, data = {}, from } = payload as CallSignalPayload;
      const fromUserId = data.fromUserId || from?.id || from?._id;

      if (eventRoomId !== roomId) return;
      if (fromUserId === currentUserId) return;
      if (data.toUserId && data.toUserId !== currentUserId) return;
      if (type !== 'CALL_REQUEST' && data.callId && callIdRef.current && data.callId !== callIdRef.current) return;

      if (type === 'CALL_REQUEST') {
        if (!canStartAudioCallRef.current || statusRef.current !== 'idle') {
          socket.emit('call_signal', {
            roomId,
            type: 'CALL_BUSY',
            data: { callId: data.callId, toUserId: fromUserId },
          });
          return;
        }
        const normalizedIncomingCall = {
          ...data,
          fromUserId,
          fromUser: data.fromUser || {
            _id: fromUserId || '',
            userName: from?.userName,
            profilePicture: from?.profilePicture,
          },
        };
        setIncomingCall(normalizedIncomingCall);
        callIdRef.current = data.callId || null;
        setRemoteUser(normalizedIncomingCall.fromUser || null);
        setRemoteMicEnabled(data.micEnabled ?? true);
        setStatus('ringing');
        statusRef.current = 'ringing';
        playCallTone();
        startTimeout(() => {
          socket.emit('call_signal', {
            roomId,
            type: 'CALL_REJECTED',
            data: { callId: data.callId, toUserId: fromUserId, reason: 'no_answer' },
          });
          showInfo('Incoming audio call missed.');
          cleanupCall({ stopTracks: false });
        });
        return;
      }

      if (type === 'CALL_ACCEPTED') {
        if (callTimeoutRef.current) window.clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
        setStatus('connecting');
        statusRef.current = 'connecting';
        startTimeout(() => {
          showError('Audio connection timed out.');
          cleanupCall();
        }, CALL_CONNECT_TIMEOUT_MS);
        return;
      }

      if (type === 'CALL_REJECTED') {
        showInfo('Audio call rejected.');
        cleanupCall();
        return;
      }

      if (type === 'CALL_BUSY') {
        showInfo('User is busy on another call.');
        cleanupCall();
        return;
      }

      if (type === 'CALL_UNAVAILABLE') {
        showError('User is not available for audio call.');
        cleanupCall();
        return;
      }

      if (type === 'CALL_ENDED') {
        showInfo(data.reason === 'no_answer' ? 'Audio call was not answered.' : data.reason === 'connect_timeout' ? 'Audio connection timed out.' : 'Audio call ended.');
        cleanupCall();
        return;
      }

      if (type === 'MEDIA_STATE_CHANGED') {
        setRemoteMicEnabled(data.micEnabled ?? true);
      }
    };

    socket.on('call_signal', handleCallSignal);
    return () => {
      socket.off('call_signal', handleCallSignal);
      cleanupCall();
    };
  }, [cleanupCall, currentUserId, playCallTone, roomId, showError, showInfo, startTimeout]);

  return {
    acceptAudioCall,
    audioCallStatus: status,
    canStartAudioCall,
    endAudioCall,
    incomingCall,
    micEnabled,
    rejectAudioCall,
    remoteAudioRef,
    remoteMicEnabled,
    startAudioCall,
    toggleMic,
  };
};

export default useAudioCall;
