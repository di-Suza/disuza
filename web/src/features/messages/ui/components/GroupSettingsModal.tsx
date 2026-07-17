import { Check, Loader2, Search, Trash2, UserMinus, UserRound, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useAppSelector } from '@/app/store/hooks';
import {
  useInviteGroupMembersMutation,
  useRemoveGroupMemberMutation,
  useUpdateGroupMutation,
} from '@/features/messages/api/chat.api';
import type { ChatConversation, ChatUser } from '@/features/messages/model/chat.types';
import { useGetFollowersQuery, useGetFollowingQuery } from '@/features/users/api/user.api';
import type { UserProfile } from '@/features/users/model/user.types';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

type GroupSettingsModalProps = {
  conversation: ChatConversation;
  isOpen: boolean;
  onClose: () => void;
  onConversationUpdated: (conversation: ChatConversation) => void;
  onLeftGroup: () => void;
};

const getAvatarUrl = (user: Pick<ChatUser | UserProfile, 'profilePicture'>) => {
  const url = user.profilePicture?.url;
  return typeof url === 'string' && url.trim() ? url : null;
};

const GroupSettingsModal = ({
  conversation,
  isOpen,
  onClose,
  onConversationUpdated,
  onLeftGroup,
}: GroupSettingsModalProps) => {
  const currentUserId = useAppSelector((state) => state.auth.user?._id);
  const { showError, showSuccess } = useToast();
  const [groupName, setGroupName] = useState(conversation.groupName || '');
  const [query, setQuery] = useState('');
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([]);
  const [updateGroup, { isLoading: isUpdating }] = useUpdateGroupMutation();
  const [inviteMembers, { isLoading: isInviting }] = useInviteGroupMembersMutation();
  const [removeMember, { isLoading: isRemoving }] = useRemoveGroupMemberMutation();
  const isAdmin = Boolean(currentUserId && conversation.admins?.some((adminId) => adminId === currentUserId));
  const participantIds = useMemo(() => new Set((conversation.participants || []).map((user) => user._id)), [conversation.participants]);
  const { data: followersData } = useGetFollowersQuery(
    { userId: currentUserId || '', page: 1 },
    { skip: !isOpen || !currentUserId || !isAdmin },
  );
  const { data: followingData } = useGetFollowingQuery(
    { userId: currentUserId || '', page: 1 },
    { skip: !isOpen || !currentUserId || !isAdmin },
  );

  const inviteOptions = useMemo(() => {
    const userMap = new Map<string, UserProfile>();
    [...(followersData?.followers || []), ...(followingData?.following || [])].forEach((user) => {
      if (user._id && user._id !== currentUserId && !participantIds.has(user._id)) {
        userMap.set(user._id, user);
      }
    });

    const normalizedQuery = query.trim().toLowerCase();
    return Array.from(userMap.values())
      .filter((user) => !normalizedQuery || user.userName?.toLowerCase().includes(normalizedQuery))
      .sort((first, second) => (first.userName || '').localeCompare(second.userName || ''));
  }, [currentUserId, followersData?.followers, followingData?.following, participantIds, query]);

  useEffect(() => {
    if (!isOpen) return;
    setGroupName(conversation.groupName || '');
    setQuery('');
    setSelectedInviteIds([]);
  }, [conversation.groupName, isOpen]);

  if (!isOpen) return null;

  const handleUpdateGroup = async () => {
    if (!conversation._id || !groupName.trim() || isUpdating) return;

    try {
      const response = await updateGroup({ conversationId: conversation._id, groupName: groupName.trim() }).unwrap();
      if (response.conversation) onConversationUpdated(response.conversation);
      showSuccess('Group updated.');
    } catch (error) {
      showError(getErrorMessage(error, 'Group update failed.'));
    }
  };

  const handleInviteMembers = async () => {
    if (!conversation._id || selectedInviteIds.length === 0 || isInviting) return;

    try {
      const response = await inviteMembers({ conversationId: conversation._id, memberIds: selectedInviteIds }).unwrap();
      if (response.conversation) onConversationUpdated(response.conversation);
      setSelectedInviteIds([]);
      showSuccess('Invites sent.');
    } catch (error) {
      showError(getErrorMessage(error, 'Invites could not be sent.'));
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!conversation._id || isRemoving) return;

    try {
      const response = await removeMember({ conversationId: conversation._id, memberId }).unwrap();
      if (memberId === currentUserId) {
        onLeftGroup();
        onClose();
        return;
      }
      if (response.conversation) onConversationUpdated(response.conversation);
      showSuccess('Member removed.');
    } catch (error) {
      showError(getErrorMessage(error, 'Member could not be removed.'));
    }
  };

  const toggleInvite = (userId: string) => {
    setSelectedInviteIds((current) => (
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    ));
  };

  return (
    <div className="messages-v1-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="messages-v1-start-modal messages-v1-group-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="messages-group-settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <span><Users size={18} aria-hidden="true" /></span>
          <div>
            <p>Group</p>
            <h2 id="messages-group-settings-title">Settings</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="messages-v1-group-settings__body">
          <label className="messages-v1-start-modal__field">
            <span>Group name</span>
            <Input value={groupName} onChange={(event) => setGroupName(event.target.value)} disabled={!isAdmin} maxLength={80} />
          </label>
          {isAdmin && (
            <div className="messages-v1-group-settings__actions">
              <Button onClick={handleUpdateGroup} disabled={isUpdating || !groupName.trim()}>
                {isUpdating && <Loader2 className="spin" size={16} aria-hidden="true" />}
                Save
              </Button>
            </div>
          )}

          <section className="messages-v1-group-settings__section">
            <h3>Members</h3>
            <div className="messages-v1-group-members">
              {(conversation.participants || []).map((member) => {
                const avatarUrl = getAvatarUrl(member);
                const memberIsMe = member._id === currentUserId;
                const canRemove = memberIsMe || (isAdmin && member._id !== currentUserId);

                return (
                  <article key={member._id}>
                    <span className="messages-v1-person-card__avatar">
                      {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={16} aria-hidden="true" />}
                    </span>
                    <span>
                      <strong>{member.userName || 'User'}</strong>
                      <small>{conversation.admins?.includes(member._id) ? 'Admin' : 'Member'}</small>
                    </span>
                    {canRemove && (
                      <button type="button" onClick={() => handleRemoveMember(member._id)} disabled={isRemoving}>
                        {memberIsMe ? <Trash2 size={15} aria-hidden="true" /> : <UserMinus size={15} aria-hidden="true" />}
                        {memberIsMe ? 'Leave' : 'Remove'}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          {isAdmin && (
            <section className="messages-v1-group-settings__section">
              <h3>Invite</h3>
              <label className="messages-v1-start-modal__search">
                <Search size={16} aria-hidden="true" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people" />
              </label>
              <div className="messages-v1-group-invite-list">
                {inviteOptions.length > 0 ? inviteOptions.map((user) => {
                  const selected = selectedInviteIds.includes(user._id);
                  const avatarUrl = getAvatarUrl(user);

                  return (
                    <button
                      key={user._id}
                      type="button"
                      className={`messages-v1-person-card ${selected ? 'is-selected' : ''}`}
                      onClick={() => toggleInvite(user._id)}
                    >
                      <span className="messages-v1-person-card__avatar">
                        {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={16} aria-hidden="true" />}
                      </span>
                      <span>
                        <strong>{user.userName || 'User'}</strong>
                        <small>{user.headline || 'DevLoopFeed member'}</small>
                      </span>
                      {selected && <Check size={16} aria-hidden="true" />}
                    </button>
                  );
                }) : <p className="messages-v1-group-settings__empty">No people available</p>}
              </div>
              <Button onClick={handleInviteMembers} disabled={isInviting || selectedInviteIds.length === 0}>
                {isInviting && <Loader2 className="spin" size={16} aria-hidden="true" />}
                Invite selected
              </Button>
            </section>
          )}
        </div>
      </section>
    </div>
  );
};

export default GroupSettingsModal;
