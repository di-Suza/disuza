import { Check, Loader2, Search, UserRound, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useAppSelector } from '@/app/store/hooks';
import { useCreateGroupMutation, useStartConversationMutation } from '@/features/messages/api/chat.api';
import type { ChatConversation } from '@/features/messages/model/chat.types';
import { useGetFollowersQuery, useGetFollowingQuery } from '@/features/users/api/user.api';
import type { UserProfile } from '@/features/users/model/user.types';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import { useToast } from '@/shared/hooks/useToast';

type ConversationStartMode = 'chat' | 'group';

type ConversationStartModalProps = {
  isOpen: boolean;
  mode: ConversationStartMode;
  onClose: () => void;
  onConversationReady: (conversation: ChatConversation) => void;
};

const getAvatarUrl = (user: UserProfile) => {
  const url = user.profilePicture?.url;
  return typeof url === 'string' && url.trim() ? url : null;
};

const getInitial = (user: UserProfile) => user.userName?.trim().charAt(0).toUpperCase() || 'U';

const ConversationStartModal = ({ isOpen, mode, onClose, onConversationReady }: ConversationStartModalProps) => {
  const currentUserId = useAppSelector((state) => state.auth.user?._id);
  const { showError, showSuccess } = useToast();
  const [query, setQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { data: followersData, isFetching: isFetchingFollowers } = useGetFollowersQuery(
    { userId: currentUserId || '', page: 1 },
    { skip: !isOpen || !currentUserId },
  );
  const { data: followingData, isFetching: isFetchingFollowing } = useGetFollowingQuery(
    { userId: currentUserId || '', page: 1 },
    { skip: !isOpen || !currentUserId },
  );
  const [startConversation, { isLoading: isStartingConversation }] = useStartConversationMutation();
  const [createGroup, { isLoading: isCreatingGroup }] = useCreateGroupMutation();
  const isGroupMode = mode === 'group';
  const isSubmitting = isStartingConversation || isCreatingGroup;

  const users = useMemo(() => {
    const userMap = new Map<string, UserProfile>();

    [...(followersData?.followers || []), ...(followingData?.following || [])].forEach((user) => {
      if (user._id && user._id !== currentUserId) userMap.set(user._id, user);
    });

    return Array.from(userMap.values()).sort((first, second) => (
      (first.userName || '').localeCompare(second.userName || '')
    ));
  }, [currentUserId, followersData?.followers, followingData?.following]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return users;

    return users.filter((user) => (
      user.userName?.toLowerCase().includes(normalizedQuery)
      || user.headline?.toLowerCase().includes(normalizedQuery)
    ));
  }, [query, users]);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setGroupName('');
    setSelectedIds([]);
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const toggleUser = (userId: string) => {
    setSelectedIds((current) => {
      if (isGroupMode) {
        return current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId];
      }

      return current.includes(userId) ? [] : [userId];
    });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    try {
      if (isGroupMode) {
        if (selectedIds.length < 2) {
          showError('Select at least two members for a group.');
          return;
        }

        const response = await createGroup({
          memberIds: selectedIds,
          groupName: groupName.trim() || undefined,
        }).unwrap();

        onConversationReady(response.conversation);
        showSuccess('Group created. Invites sent.');
        onClose();
        return;
      }

      if (!selectedIds[0]) {
        showError('Select a user to start messaging.');
        return;
      }

      const response = await startConversation({ receiverId: selectedIds[0] }).unwrap();
      onConversationReady(response.conversation);
      onClose();
    } catch (error) {
      showError(getErrorMessage(error, isGroupMode ? 'Group could not be created.' : 'Conversation could not be started.'));
    }
  };

  return (
    <div className="messages-v1-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="messages-v1-start-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="messages-start-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <span>
            {isGroupMode ? <Users size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
          </span>
          <div>
            <p>{isGroupMode ? 'Create' : 'Start'}</p>
            <h2 id="messages-start-modal-title">{isGroupMode ? 'New Group' : 'New Chat'}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {isGroupMode && (
          <label className="messages-v1-start-modal__field">
            <span>Group name</span>
            <Input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Optional"
              maxLength={80}
            />
          </label>
        )}

        <label className="messages-v1-start-modal__search">
          <Search size={16} aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search followers and following"
            aria-label="Search followers and following"
          />
        </label>

        <div className="messages-v1-start-modal__list">
          {isFetchingFollowers || isFetchingFollowing ? (
            <div className="messages-v1-start-modal__state">
              <Loader2 className="spin" size={20} aria-hidden="true" />
              <p>Loading people...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const selected = selectedIds.includes(user._id);
              const avatarUrl = getAvatarUrl(user);

              return (
                <button
                  key={user._id}
                  type="button"
                  className={`messages-v1-person-card ${selected ? 'is-selected' : ''}`}
                  onClick={() => toggleUser(user._id)}
                >
                  <span className="messages-v1-person-card__avatar">
                    {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={16} aria-hidden="true" />}
                  </span>
                  <span>
                    <strong>{user.userName || getInitial(user)}</strong>
                    <small>{user.headline || 'DevLoopFeed member'}</small>
                  </span>
                  {selected && <Check size={16} aria-hidden="true" />}
                </button>
              );
            })
          ) : (
            <div className="messages-v1-start-modal__state">
              <p>No people found</p>
            </div>
          )}
        </div>

        <footer>
          <small>{isGroupMode ? `${selectedIds.length}/2 minimum selected` : selectedIds.length ? 'Ready to start' : 'Select one person'}</small>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (isGroupMode ? selectedIds.length < 2 : selectedIds.length !== 1)}
          >
            {isSubmitting && <Loader2 className="spin" size={16} aria-hidden="true" />}
            {isGroupMode ? 'Create Group' : 'Start Messaging'}
          </Button>
        </footer>
      </section>
    </div>
  );
};

export default ConversationStartModal;
