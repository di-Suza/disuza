import { Mic, MicOff, PanelRightClose, PhoneOff, Users } from 'lucide-react';
import { memo, type RefObject } from 'react';

import type { CollabParticipant } from '@/features/collab/model/collab.types';

type UsersPanelProps = {
  usersData: Array<CollabParticipant & { isInAudio?: boolean; micEnabled?: boolean }>;
  audioCallStatus: string;
  audioParticipantCount: number;
  canStartAudioCall: boolean;
  micEnabled: boolean;
  remoteAudioContainerRef: RefObject<HTMLDivElement | null>;
  onCollapse: () => void;
  startAudioCall: () => void;
  endAudioCall: () => void;
  toggleMic: () => void;
};

const UsersPanel = ({
  usersData,
  audioCallStatus,
  audioParticipantCount,
  canStartAudioCall,
  micEnabled,
  remoteAudioContainerRef,
  onCollapse,
  startAudioCall,
  endAudioCall,
  toggleMic,
}: UsersPanelProps) => {
  const isCallActive = ['connecting', 'in_call'].includes(audioCallStatus);
  const isConnected = audioCallStatus === 'in_call';
  const callStatusText: Record<string, string> = {
    connecting: 'Connecting audio...',
    in_call: `${audioParticipantCount} connected`,
  };

  return (
    <section className="collab-users-panel">
      <div ref={remoteAudioContainerRef} className="hidden" />
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
              <p>
                {user.roomPresence === 'in_room' ? 'In Room' : 'Not In Room'}
                {user.isInAudio ? ` · Audio ${user.micEnabled === false ? 'muted' : 'on'}` : ''}
              </p>
            </div>
          </article>
        ))}
      </div>

      {isCallActive && (
        <div className="collab-call-box">
          <p>{callStatusText[audioCallStatus] || 'Audio channel'}</p>
          <small>{isConnected ? 'Voice channel is active' : 'Preparing microphone...'}</small>
          <button type="button" disabled={!isConnected} onClick={toggleMic}>
            {micEnabled ? <Mic size={16} aria-hidden="true" /> : <MicOff size={16} aria-hidden="true" />}
            {micEnabled ? 'Mute' : 'Unmute'}
          </button>
          <button type="button" className="is-danger" onClick={endAudioCall}><PhoneOff size={16} aria-hidden="true" />Disconnect</button>
        </div>
      )}

      {!isCallActive && canStartAudioCall && (
        <button type="button" className="collab-audio-button" onClick={startAudioCall}>
          <Mic size={16} aria-hidden="true" />
          <span>Connect with Audio{audioParticipantCount > 0 ? ` (${audioParticipantCount})` : ''}</span>
        </button>
      )}

      {!isCallActive && !canStartAudioCall && (
        <p className="collab-audio-note">Audio is available after joining the room.</p>
      )}
    </section>
  );
};

export default memo(UsersPanel);
