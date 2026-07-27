import { Code2, DoorOpen, Lock, RefreshCw, UserRound, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  useGetMyCollabRoomsQuery,
  useGetPersonalRoomMutation,
} from '@/features/collab/api/collab.api';
import type { CollabRoomListItem } from '@/features/collab/model/collab.types';
import { useToast } from '@/shared/hooks/useToast';
import Button from '@/shared/ui/Button';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

const getAvatarUrl = (url: unknown): string | null => (typeof url === 'string' && url.trim() ? url : null);

const formatDate = (date?: string) => {
  if (!date) return 'Not opened yet';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const RoomCard = ({ onOpen, room }: { onOpen: (roomId: string) => void; room: CollabRoomListItem }) => {
  const isPersonal = room.roomType === 'personal';
  const isSolo = room.accessMode === 'solo_due_to_block';
  const avatar = getAvatarUrl(room.otherUser?.profilePicture?.url);

  return (
    <button type="button" onClick={() => onOpen(room._id)} className="dashboard-room-card">
      <span className={isPersonal ? 'dashboard-room-card__icon' : 'dashboard-room-card__avatar'}>
        {isPersonal ? <Code2 size={20} aria-hidden="true" /> : avatar ? <img src={avatar} alt="" /> : <UserRound size={20} aria-hidden="true" />}
      </span>

      <span className="dashboard-room-card__body">
        <span className="dashboard-room-card__top">
          <span>
            <strong>{room.title}</strong>
            <small>{room.subtitle}</small>
          </span>
          <DoorOpen size={16} aria-hidden="true" />
        </span>

        <span className="dashboard-room-card__chips">
          <em>{room.problemsCount || 0} problems</em>
          <em className="is-success">{room.solvedCount || 0} solved</em>
          {isSolo && <em className="is-warning"><Lock size={12} aria-hidden="true" />Solo</em>}
        </span>

        <small>Updated {formatDate(room.updatedAt)}</small>
      </span>
    </button>
  );
};

const DashboardRoomsPanel = () => {
  const navigate = useNavigate();
  const { showError } = useToast();
  const { data, error, isError, isFetching, isLoading, refetch } = useGetMyCollabRoomsQuery();
  const [getPersonalRoom, { isLoading: isPersonalLoading }] = useGetPersonalRoomMutation();
  const rooms = data?.data?.rooms || [];

  const openRoom = (roomId?: string) => {
    if (roomId) navigate(`/collab/${roomId}`);
  };

  const handleOpenPersonalRoom = async () => {
    try {
      const response = await getPersonalRoom().unwrap();
      openRoom(response?.data?._id);
    } catch (apiError) {
      showError(getErrorMessage(apiError, 'Personal room could not be opened.'));
    }
  };

  return (
    <section className="dashboard-rooms-v1">
      <header>
        <div>
          <h2>Your Rooms</h2>
        </div>
        <Button className="dashboard-rooms-v1__personal-button" onClick={handleOpenPersonalRoom} isLoading={isPersonalLoading} loadingLabel="Opening personal room">
          <Code2 size={16} aria-hidden="true" />
          Open Personal Room
        </Button>
      </header>

      {isLoading ? (
        <LoadingSpinner className="dashboard-room-state" label="Loading rooms" />
      ) : isError ? (
        <div className="dashboard-room-state">
          <p>{getErrorMessage(error, 'Rooms could not be loaded')}</p>
          <Button variant="secondary" onClick={() => refetch()}><RefreshCw size={16} aria-hidden="true" />Retry</Button>
        </div>
      ) : rooms.length > 0 ? (
        <div className="dashboard-room-list">
          {isFetching && <LoadingSpinner inline className="dashboard-room-refresh" label="Refreshing rooms" size={16} />}
          {rooms.map((room) => <RoomCard key={room._id} room={room} onOpen={openRoom} />)}
        </div>
      ) : (
        <div className="dashboard-room-state">
          <Users size={22} aria-hidden="true" />
          <strong>No rooms yet</strong>
          <p>Start with a personal room and add problems whenever you want.</p>
        </div>
      )}
    </section>
  );
};

export default DashboardRoomsPanel;
