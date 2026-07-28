import { UserRound } from 'lucide-react';
import { memo } from 'react';

import { getUserAvatarUrl, getUserInitial } from '@/features/messages/model/chat.helpers';
import type { ChatUser } from '@/features/messages/model/chat.types';
import AvatarImage from '@/shared/components/Avatar/AvatarImage';
import { cn } from '@/shared/utils/cn';
import './ChatAvatar.css';

type ChatAvatarProps = {
  user?: Pick<ChatUser, 'profilePicture' | 'userName'> | null;
  className?: string;
};

const ChatAvatar = ({ className, user }: ChatAvatarProps) => {
  const avatarUrl = getUserAvatarUrl(user);

  return (
    <span className={cn('chat-avatar', className)}>
      <AvatarImage
        src={avatarUrl}
        fallback={user?.userName ? <span>{getUserInitial(user)}</span> : <UserRound size={18} aria-hidden="true" />}
      />
    </span>
  );
};

export default memo(ChatAvatar);
