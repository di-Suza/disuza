import { Award, Trophy, UserRound } from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router-dom';

import type { SearchUser } from '@/features/search/model/search.types';
import { cn } from '@/shared/utils/cn';
import { getOptimizedImage } from '@/shared/utils/getOptimizedImage';

type SearchUserCardProps = {
  user: SearchUser;
  index?: number;
  currentUserId?: string;
};

const getAvatarUrl = (user: SearchUser): string | null => {
  const url = user.profilePicture?.url;
  return typeof url === 'string' && url.trim() ? getOptimizedImage(url, 'avatarSmall') || url : null;
};

const SearchUserCard = ({ currentUserId, index, user }: SearchUserCardProps) => {
  const avatarUrl = getAvatarUrl(user);
  const rank = typeof index === 'number' ? index + 1 : null;
  const profilePath = currentUserId && currentUserId === user._id ? '/dashboard' : `/profile/${user._id}`;

  return (
    <Link to={profilePath} className="search-user-card">
      {rank && (
        <span className={cn('search-user-card__rank', rank <= 3 && 'is-top')}>
          <Trophy size={13} aria-hidden="true" />#{rank}
        </span>
      )}
      <span className="search-user-card__avatar">
        {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={22} aria-hidden="true" />}
      </span>
      <span className="search-user-card__body">
        <strong>{user.userName}</strong>
        <small>{user.headline || 'Disuza member'}</small>
      </span>
      <span className="search-user-card__score">
        <Award size={14} aria-hidden="true" />
        {Number(user.profileContributions || 0).toLocaleString()}
      </span>
    </Link>
  );
};

export default memo(SearchUserCard);
