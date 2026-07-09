import { Ban, Flag, Loader2, LockOpen, MessageSquare, RefreshCw, UserPlus, UserRound, UserX } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import ContributionHeatmap from '@/features/dashboard/ui/components/ContributionHeatmap';
import SendFeedbackModal from '@/features/messages/ui/components/SendFeedbackModal';
import ProfilePostsSection from '@/features/posts/ui/components/ProfilePostsSection';
import ReportModal from '@/features/reports/ui/components/ReportModal';
import Button from '@/shared/ui/Button';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import { useProfilePage } from './useProfilePage';

const avatarUrl = (url: unknown): string | null => (typeof url === 'string' && url.trim() ? url : null);
const listToChips = (items: unknown): string[] => Array.isArray(items) ? items.filter((item): item is string => typeof item === 'string') : [];

const ProfilePage = () => {
  const [isFeedbackOpen, setFeedbackOpen] = useState(false);
  const {
    closeList,
    closeReport,
    currentUserId,
    error,
    followers,
    followersCount,
    following,
    followingCount,
    goToDashboard,
    handleBlockToggle,
    handleFollowToggle,
    isFetching,
    isListFetching,
    isListOpen,
    isLoading,
    isMutating,
    isOwnProfile,
    isProfileError,
    isReportOpen,
    listMode,
    normalPosts,
    openList,
    openReport,
    profileUser,
    projectPosts,
    refetch,
  } = useProfilePage();

  if (isOwnProfile) {
    return (
      <main className="dashboard-shell">
        <section className="state-panel">
          <p className="state-panel__eyebrow">Own profile</p>
          <h1>This profile is managed from dashboard.</h1>
          <Button onClick={goToDashboard}>Open dashboard</Button>
        </section>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="dashboard-shell">
        <section className="state-panel"><Loader2 className="spin" aria-hidden="true" /><h1>Loading profile</h1></section>
      </main>
    );
  }

  if (isProfileError || !profileUser) {
    return (
      <main className="dashboard-shell">
        <section className="state-panel">
          <p className="state-panel__eyebrow">Profile</p>
          <h1>Profile could not be loaded.</h1>
          <p>{getErrorMessage(error)}</p>
          <Button onClick={() => refetch()}><RefreshCw size={18} aria-hidden="true" />Retry</Button>
        </section>
      </main>
    );
  }

  const image = avatarUrl(profileUser.profilePicture?.url);
  const skills = listToChips(profileUser.skills);
  const interests = listToChips(profileUser.interests);
  const languages = listToChips(profileUser.languages);
  const relationshipList = listMode === 'followers' ? followers : following;
  const canReportProfile = !profileUser.isBlocked && !profileUser.blockedProfile;
  const canSendFeedback = canReportProfile && Boolean(profileUser._id && profileUser._id !== currentUserId);

  return (
    <main className="dashboard-shell dashboard-shell--wide">
      <section className="dashboard-panel dashboard-panel--wide profile-page-panel">
        <div className="profile-hero">
          <span className="dashboard-profile__avatar dashboard-profile__avatar--image profile-hero__avatar">
            {image ? <img src={image} alt={profileUser.userName} /> : <UserRound size={42} aria-hidden="true" />}
          </span>
          <div className="profile-hero__content">
            <p className="state-panel__eyebrow">Profile</p>
            <h1>{profileUser.userName}</h1>
            <p>{profileUser.headline || 'DevLoopFeed developer'}</p>
            {profileUser.isBlocked && <p className="profile-warning">You have blocked this user.</p>}
          </div>
          <div className="profile-hero__actions">
            {!profileUser.isBlocked && (
              <Button onClick={handleFollowToggle} disabled={isMutating} variant={profileUser.isFollowed ? 'secondary' : 'primary'}>
                {profileUser.isFollowed ? <UserX size={18} aria-hidden="true" /> : <UserPlus size={18} aria-hidden="true" />}
                {profileUser.isFollowed ? 'Unfollow' : 'Follow'}
              </Button>
            )}
            <Button onClick={handleBlockToggle} disabled={isMutating} variant={profileUser.isBlocked ? 'secondary' : 'danger'}>
              {profileUser.isBlocked ? <LockOpen size={18} aria-hidden="true" /> : <Ban size={18} aria-hidden="true" />}
              {profileUser.isBlocked ? 'Unblock' : 'Block'}
            </Button>
            {canSendFeedback && (
              <Button onClick={() => setFeedbackOpen(true)} variant="secondary">
                <MessageSquare size={18} aria-hidden="true" />
                Feedback
              </Button>
            )}
            {canReportProfile && (
              <Button onClick={openReport} variant="ghost" aria-label="Report profile">
                <Flag size={18} aria-hidden="true" />
                Report
              </Button>
            )}
          </div>
        </div>

        <div className="profile-stats profile-stats--clickable">
          <button type="button" onClick={() => openList('followers')}><strong>{followersCount}</strong><span>Followers</span></button>
          <button type="button" onClick={() => openList('following')}><strong>{followingCount}</strong><span>Following</span></button>
          <article><strong>{Number(profileUser.profileContributions || 0)}</strong><span>Contributions</span></article>
        </div>

        {profileUser.blockedProfile ? (
          <section className="profile-card profile-card--full"><h2>Blocked profile</h2><p className="empty-copy">Unblock this user to view their profile details.</p></section>
        ) : (
          <div className="dashboard-grid dashboard-grid--secondary">
            <ContributionHeatmap heatmap={profileUser.heatmap} />

            <section className="profile-card profile-card--full">
              <div className="profile-card__header"><h2>About</h2><p>{isFetching ? 'Refreshing profile...' : 'Public profile summary.'}</p></div>
              <p className="profile-copy">{profileUser.about || 'No about section added yet.'}</p>
            </section>

            <section className="profile-card">
              <div className="profile-card__header"><h2>Skills</h2><p>Technical strengths.</p></div>
              <div className="chip-list">{skills.length ? skills.map((skill) => <span key={skill}>{skill}</span>) : <p className="empty-copy">No skills added.</p>}</div>
            </section>

            <section className="profile-card">
              <div className="profile-card__header"><h2>Interests</h2><p>Topics they care about.</p></div>
              <div className="chip-list">{interests.length ? interests.map((interest) => <span key={interest}>{interest}</span>) : <p className="empty-copy">No interests added.</p>}</div>
            </section>

            <section className="profile-card">
              <div className="profile-card__header"><h2>Languages</h2><p>Programming languages.</p></div>
              <div className="chip-list">{languages.length ? languages.map((language) => <span key={language}>{language}</span>) : <p className="empty-copy">No languages added.</p>}</div>
            </section>

            <ProfilePostsSection normalPosts={normalPosts} projectPosts={projectPosts} profileUser={profileUser} viewerId={currentUserId} />
          </div>
        )}
      </section>

      {isReportOpen && canReportProfile && (
        <ReportModal
          isOpen={isReportOpen}
          onClose={closeReport}
          targetId={profileUser._id}
          onModel="User"
        />
      )}

      {isFeedbackOpen && canSendFeedback && (
        <SendFeedbackModal
          isOpen={isFeedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          feedbackOn="User"
          receiverId={profileUser._id}
          userId={profileUser._id}
        />
      )}

      {isListOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`${listMode} list`}>
          <section className="modal-card relation-modal">
            <div className="modal-card__header"><h1>{listMode === 'followers' ? 'Followers' : 'Following'}</h1><p>{isListFetching ? 'Loading...' : `${relationshipList.length} users`}</p></div>
            <div className="user-list relation-modal__list">
              {relationshipList.length === 0 && <p className="empty-copy">No users found.</p>}
              {relationshipList.map((user) => (
                <Link to={`/profile/${user._id}`} className="user-row user-row__main" key={user._id} onClick={closeList}>
                  <span className="user-row__avatar">{avatarUrl(user.profilePicture?.url) ? <img src={user.profilePicture?.url} alt="" /> : <UserRound size={18} />}</span>
                  <span><strong>{user.userName}</strong><small>{user.headline || 'DevLoopFeed member'}</small></span>
                </Link>
              ))}
            </div>
            <Button variant="secondary" onClick={closeList}>Close</Button>
          </section>
        </div>
      )}
    </main>
  );
};

export default ProfilePage;
