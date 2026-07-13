import { Mic, MicOff, PanelRightClose, Phone, PhoneOff, Users, X } from 'lucide-react';
import type { RefObject } from 'react';

import type { CollabParticipant } from '@/features/collab/model/collab.types';

type UsersPanelProps = {
  usersData: CollabParticipant[];
  audioCallStatus: string;
  canStartAudioCall: boolean;
  incomingCall: { fromUser?: CollabParticipant } | null;
  micEnabled: boolean;
  remoteMicEnabled: boolean;
  remoteAudioRef: RefObject<HTMLAudioElement | null>;
  onCollapse: () => void;
  startAudioCall: () => void;
  acceptAudioCall: () => void;
  rejectAudioCall: () => void;
  endAudioCall: () => void;
  toggleMic: () => void;
};

const UsersPanel = ({
  usersData,
  audioCallStatus,
  canStartAudioCall,
  incomingCall,
  micEnabled,
  remoteMicEnabled,
  remoteAudioRef,
  onCollapse,
  startAudioCall,
  acceptAudioCall,
  rejectAudioCall,
  endAudioCall,
  toggleMic,
}: UsersPanelProps) => {
  const isCallActive = ['calling', 'connecting', 'in_call'].includes(audioCallStatus);
  const isRinging = audioCallStatus === 'ringing';
  const callStatusText: Record<string, string> = {
    calling: 'Calling your partner...',
    connecting: 'Connecting audio...',
    in_call: 'Audio call connected',
  };

  return (
    <section className="collab-users-panel">
      <audio ref={remoteAudioRef} autoPlay className="hidden" />
      <header>
        <div>
          <Users size={20} aria-hidden="true" />
          <h3>Participants ({usersData.length})</h3>
        </div>
        <button type="button" className="collab-icon-button" onClick={onCollapse} aria-label="Hide chat panel">
          <PanelRightClose size={15} aria-hidden="true" />
        </button>
      </header>

      <div className="collab-users-list">
        {usersData.map((user) => (
          <article key={user._id}>
            <div className="collab-avatar-wrap">
              <img src={user.profilePicture?.url} alt="" />
              {user.roomPresence === 'in_room' && <span />}
            </div>
            <div>
              <strong>{user.userName || 'User'}</strong>
              <p>{user.roomPresence === 'in_room' ? 'In Room' : 'Not In Room'}</p>
            </div>
          </article>
        ))}
      </div>

      {isRinging && (
        <div className="collab-call-box">
          <p>{incomingCall?.fromUser?.userName || 'Your partner'} is calling</p>
          <button type="button" onClick={acceptAudioCall}><Phone size={16} aria-hidden="true" />Accept</button>
          <button type="button" className="is-danger" onClick={rejectAudioCall}><X size={16} aria-hidden="true" />Reject</button>
        </div>
      )}

      {isCallActive && (
        <div className="collab-call-box">
          <p>{callStatusText[audioCallStatus] || 'Audio call'}</p>
          {audioCallStatus === 'in_call' && <small>Partner mic: {remoteMicEnabled ? 'On' : 'Muted'}</small>}
          <button type="button" disabled={audioCallStatus !== 'in_call'} onClick={toggleMic}>
            {micEnabled ? <Mic size={16} aria-hidden="true" /> : <MicOff size={16} aria-hidden="true" />}
            {micEnabled ? 'Mute' : 'Unmute'}
          </button>
          <button type="button" className="is-danger" onClick={endAudioCall}><PhoneOff size={16} aria-hidden="true" />End</button>
        </div>
      )}

      {!isCallActive && !isRinging && canStartAudioCall && (
        <button type="button" className="collab-audio-button" onClick={startAudioCall}>
          <Mic size={16} aria-hidden="true" />
          <span>Connect with Audio</span>
        </button>
      )}

      {!isCallActive && !isRinging && !canStartAudioCall && (
        <p className="collab-audio-note">Audio call is available when both users are in room.</p>
      )}
    </section>
  );
};

export default UsersPanel;
