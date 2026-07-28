import { Check, Search, Trash2, UserMinus, UserRound, Users, X } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { useAppSelector } from '@/app/store/hooks';
import {
  useInviteGroupMembersMutation,
  useRemoveGroupMemberMutation,
  useUpdateGroupMutation,
} from '@/features/messages/api/chat.api';
import type { ChatConversation, ChatUser } from '@/features/messages/model/chat.types';
import { useGetFollowersQuery, useGetFollowingQuery } from '@/features/users/api/user.api';
import type { UserProfile } from '@/features/users/model/user.types';
import AvatarImage from '@/shared/components/Avatar/AvatarImage';
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

type GroupMemberRowProps = {
  admins?: string[];
  isAdmin: boolean;
  isRemoving: boolean;
  member: ChatUser;
  onRemove: (memberId: string) => void;
  participantCount: number;
  userId?: string;
};

type GroupInviteOptionProps = {
  onToggle: (userId: string) => void;
  selected: boolean;
  user: UserProfile;
};

const getAvatarUrl = (user: Pick<ChatUser | UserProfile, 'profilePicture'>) => {
  const url = user.profilePicture?.url;
  return typeof url === 'string' && url.trim() ? url : null;
};

const GroupMemberRow = memo(({
  admins,
  isAdmin,
  isRemoving,
  member,
  onRemove,
  participantCount,
  userId,
}: GroupMemberRowProps) => {
  const avatarUrl = getAvatarUrl(member);
  const memberIsMe = member._id === userId;
  const canRemove = memberIsMe || (isAdmin && member._id !== userId);
  const adminCannotLeave = Boolean(memberIsMe && isAdmin);
  const adminLeaveLabel = participantCount > 1 ? 'Remove members first' : 'Delete from inbox';

  return (
    <article>
      <span className="messages-v1-person-card__avatar">
        <AvatarImage src={avatarUrl} fallback={<UserRound size={16} aria-hidden="true" />} />
      </span>
      <span>
        <strong>{member.userName || 'User'}</strong>
        <small>{admins?.includes(member._id) ? 'Admin' : 'Member'}</small>
      </span>
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(member._id)}
          disabled={isRemoving || adminCannotLeave}
          title={adminCannotLeave ? 'Use the conversation menu to delete the group after removing members.' : undefined}
        >
          {memberIsMe ? <Trash2 size={15} aria-hidden="true" /> : <UserMinus size={15} aria-hidden="true" />}
          {adminCannotLeave ? adminLeaveLabel : memberIsMe ? 'Leave' : 'Remove'}
        </button>
      )}
    </article>
  );
});

GroupMemberRow.displayName = 'GroupMemberRow';

const GroupInviteOption = memo(({ onToggle, selected, user }: GroupInviteOptionProps) => {
  const avatarUrl = getAvatarUrl(user);

  return (
    <button
      type="button"
      className={`messages-v1-person-card ${selected ? 'is-selected' : ''}`}
      onClick={() => onToggle(user._id)}
    >
      <span className="messages-v1-person-card__avatar">
        <AvatarImage src={avatarUrl} fallback={<UserRound size={16} aria-hidden="true" />} />
      </span>
      <span>
        <strong>{user.userName || 'User'}</strong>
        <small>{user.headline || 'Disuza member'}</small>
      </span>
      {selected && <Check size={16} aria-hidden="true" />}
    </button>
  );
});

GroupInviteOption.displayName = 'GroupInviteOption';

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

  const handleUpdateGroup = useCallback(async () => {
    if (!conversation._id || !groupName.trim() || isUpdating) return;

    try {
      const response = await updateGroup({ conversationId: conversation._id, groupName: groupName.trim() }).unwrap();
      if (response.conversation) onConversationUpdated(response.conversation);
      showSuccess('Group updated.');
    } catch (error) {
      showError(getErrorMessage(error, 'Group update failed.'));
    }
  }, [conversation._id, groupName, isUpdating, onConversationUpdated, showError, showSuccess, updateGroup]);

  const handleInviteMembers = useCallback(async () => {
    if (!conversation._id || selectedInviteIds.length === 0 || isInviting) return;

    try {
      const response = await inviteMembers({ conversationId: conversation._id, memberIds: selectedInviteIds }).unwrap();
      if (response.conversation) onConversationUpdated(response.conversation);
      setSelectedInviteIds([]);
      showSuccess('Invites sent.');
    } catch (error) {
      showError(getErrorMessage(error, 'Invites could not be sent.'));
    }
  }, [conversation._id, inviteMembers, isInviting, onConversationUpdated, selectedInviteIds, showError, showSuccess]);

  const handleRemoveMember = useCallback(async (memberId: string) => {
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
  }, [conversation._id, currentUserId, isRemoving, onClose, onConversationUpdated, onLeftGroup, removeMember, showError, showSuccess]);

  const toggleInvite = useCallback((userId: string) => {
    setSelectedInviteIds((current) => (
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    ));
  }, []);

  if (!isOpen) return null;

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
              <Button onClick={handleUpdateGroup} disabled={!groupName.trim()} isLoading={isUpdating} loadingLabel="Saving group">
                Save
              </Button>
            </div>
          )}

          <section className="messages-v1-group-settings__section">
            <h3>Members</h3>
            <div className="messages-v1-group-members">
              {(conversation.participants || []).map((member) => (
                <GroupMemberRow
                  key={member._id}
                  admins={conversation.admins}
                  isAdmin={isAdmin}
                  isRemoving={isRemoving}
                  member={member}
                  onRemove={handleRemoveMember}
                  participantCount={conversation.participants?.length || 0}
                  userId={currentUserId}
                />
              ))}
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
                {inviteOptions.length > 0 ? inviteOptions.map((user) => (
                  <GroupInviteOption
                    key={user._id}
                    onToggle={toggleInvite}
                    selected={selectedInviteIds.includes(user._id)}
                    user={user}
                  />
                )) : <p className="messages-v1-group-settings__empty">No people available</p>}
              </div>
              <Button onClick={handleInviteMembers} disabled={selectedInviteIds.length === 0} isLoading={isInviting} loadingLabel="Inviting members">
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
