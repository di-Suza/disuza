import {
  Ban,
  Flag,
  Loader2,
  LockOpen,
  MapPin,
  MoreVertical,
  RefreshCw,
  SendHorizontal,
  ShieldAlert,
  UserPlus,
  UserRound,
  UserX,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import ContributionHeatmap from '@/features/dashboard/ui/components/ContributionHeatmap';
import SendFeedbackModal from '@/features/messages/ui/components/SendFeedbackModal';
import ProfilePostsSection from '@/features/posts/ui/components/ProfilePostsSection';
import ReportModal from '@/features/reports/ui/components/ReportModal';
import Button from '@/shared/ui/Button';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import { useProfilePage } from './useProfilePage';
import './ProfilePage.css';
import '@/app/layouts/ProductShell.css';

const avatarUrl = (url: unknown): string | null => (typeof url === 'string' && url.trim() ? url : null);
const listToChips = (items: unknown): string[] => Array.isArray(items) ? items.filter((item): item is string => typeof item === 'string') : [];
const listToRecords = <T,>(items: unknown): T[] => Array.isArray(items) ? items.filter((item): item is T => typeof item === 'object' && item !== null) : [];
const toExternalHref = (link: string): string => {
  if (/^https?:\/\//i.test(link)) return link;
  return `https://${link.replace(/^[a-z][a-z\d+\-.]*:\/\//i, '')}`;
};

const listToHandles = (items: unknown): Array<{ label: string; link: string }> => (
  Array.isArray(items)
    ? items
      .map((item) => (typeof item === 'object' && item !== null ? item as Record<string, unknown> : {}))
      .map((handle) => ({
        label: typeof handle.label === 'string' ? handle.label.trim() : '',
        link: typeof handle.link === 'string' ? toExternalHref(handle.link.trim()) : '',
      }))
      .filter((handle) => handle.label && handle.link)
    : []
);
const formatAddress = (address: unknown): string => {
  const record = typeof address === 'object' && address !== null ? address as Record<string, unknown> : {};

  return [record.city, record.state, record.country]
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .join(', ');
};

const BlockConfirmModal = ({
  isLoading,
  isOpen,
  onClose,
  onConfirm,
  userName,
}: {
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  userName?: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop report-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <section className="modal-card profile-block-confirm" onMouseDown={(event) => event.stopPropagation()}>
        <div className="profile-block-confirm__title">
          <span><Ban size={20} aria-hidden="true" /></span>
          <div>
            <p className="state-panel__eyebrow">Block User</p>
            <h1>Block {userName || 'this user'}?</h1>
          </div>
        </div>
        <p>They will not be able to follow you, message you, send collab requests, or interact with your profile until you unblock them.</p>
        <footer className="report-modal__footer">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="spin" size={17} aria-hidden="true" />}
            Block
          </Button>
        </footer>
      </section>
    </div>
  );
};

const ProfilePage = () => {
  const [isFeedbackOpen, setFeedbackOpen] = useState(false);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isBlockConfirmOpen, setBlockConfirmOpen] = useState(false);
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
  const handles = listToHandles(profileUser.handles);
  const interests = listToChips(profileUser.interests);
  const languages = listToChips(profileUser.languages);
  const experiences = listToRecords<{ companyName?: string; role?: string; timePeriod?: string }>(profileUser.experiences);
  const educations = listToRecords<{ collegeName?: string; course?: string; timePeriod?: string }>(profileUser.educations);
  const relationshipList = listMode === 'followers' ? followers : following;
  const isLimitedProfile = Boolean(profileUser.blockedProfile || profileUser.isBlocked || profileUser.hasBlockedMe);
  const hasPosts = normalPosts.length > 0 || projectPosts.length > 0;
  const canReportProfile = !isLimitedProfile;
  const canSendFeedback = canReportProfile && Boolean(profileUser._id && profileUser._id !== currentUserId);
  const profileBlockedByViewer = Boolean(profileUser.isBlocked);
  const profileBlockedViewer = Boolean(profileUser.hasBlockedMe);
  const profileAddress = formatAddress(profileUser.address);

  const handleOpenReport = () => {
    setProfileMenuOpen(false);
    openReport();
  };

  const handleOpenBlockConfirm = () => {
    setProfileMenuOpen(false);
    setBlockConfirmOpen(true);
  };

  const handleConfirmBlock = async () => {
    await handleBlockToggle();
    setBlockConfirmOpen(false);
  };

  const handleUnblock = async () => {
    setProfileMenuOpen(false);
    await handleBlockToggle();
  };

  return (
    <main className="dashboard-shell dashboard-shell--wide">
      <section className="dashboard-panel dashboard-panel--wide profile-page-panel">
        {profileBlockedByViewer ? (
          <div className="profile-hero profile-hero--blocked">
            <span className="dashboard-profile__avatar dashboard-profile__avatar--image profile-hero__avatar">
              {image ? <img src={image} alt={profileUser.userName} /> : <UserRound size={42} aria-hidden="true" />}
            </span>
            <div className="profile-hero__content">
              <p className="state-panel__eyebrow">Developer Profile</p>
              <h1>{profileUser.userName}</h1>
              <p className="profile-warning">You blocked this user.</p>
            </div>
            <Button onClick={handleUnblock} disabled={isMutating} className="profile-hero__unblock">
              {isMutating ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <LockOpen size={18} aria-hidden="true" />}
              Unblock User
            </Button>
          </div>
        ) : (
          <>
            <div className="profile-hero profile-hero--v1">
              <span className="dashboard-profile__avatar dashboard-profile__avatar--image profile-hero__avatar">
                {image ? <img src={image} alt={profileUser.userName} /> : <UserRound size={42} aria-hidden="true" />}
              </span>
              <div className="profile-hero__content">
                <div className="profile-hero__title-row">
                  <div>
                    <p className="state-panel__eyebrow">Developer Profile</p>
                    <h1>{profileUser.userName}</h1>
                  </div>
                  <div className="profile-hero__menu">
                    <button
                      type="button"
                      aria-label="Profile options"
                      className="profile-hero__menu-button"
                      onClick={() => setProfileMenuOpen((isOpen) => !isOpen)}
                    >
                      <MoreVertical size={18} aria-hidden="true" />
                    </button>
                    {isProfileMenuOpen && (
                      <div className="profile-hero__dropdown">
                        {canReportProfile && (
                          <button type="button" onClick={handleOpenReport}>
                            <Flag size={16} aria-hidden="true" />
                            Report profile
                          </button>
                        )}
                        <button type="button" className="is-danger" onClick={handleOpenBlockConfirm}>
                          <UserX size={16} aria-hidden="true" />
                          Block user
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p>{profileUser.headline || 'DevLoopFeed developer'}</p>
                {profileAddress && <p className="profile-hero__address"><MapPin size={14} aria-hidden="true" />{profileAddress}</p>}
                {profileBlockedViewer && (
                  <div className="profile-hero__notice">
                    <ShieldAlert size={16} aria-hidden="true" />
                    <span>Profile actions are unavailable right now.</span>
                  </div>
                )}
                <div className="profile-stats profile-stats--clickable profile-stats--hero">
                  <article><strong>{Number(profileUser.postsCount || normalPosts.length + projectPosts.length || 0)}</strong><span>Posts</span></article>
                  <button type="button" onClick={() => openList('followers')} disabled={profileBlockedViewer}><strong>{followersCount}</strong><span>Followers</span></button>
                  <button type="button" onClick={() => openList('following')} disabled={profileBlockedViewer}><strong>{followingCount}</strong><span>Following</span></button>
                  <article><strong>{Number(profileUser.profileContributions || 0)}</strong><span>Contributions</span></article>
                </div>
              </div>
            </div>
            <div className="profile-hero__actions profile-hero__actions--v1">
              {profileBlockedViewer ? (
                <Button disabled variant="secondary" className="profile-hero__unavailable">
                  <ShieldAlert size={18} aria-hidden="true" />
                  Actions Unavailable
                </Button>
              ) : (
                <>
                  <Button onClick={handleFollowToggle} disabled={isMutating} variant={profileUser.isFollowed ? 'secondary' : 'primary'} className="profile-hero__follow">
                    {profileUser.isFollowed ? <Users size={18} aria-hidden="true" /> : <UserPlus size={18} aria-hidden="true" />}
                    {profileUser.isFollowed ? 'Following' : 'Follow'}
                  </Button>
                  {canSendFeedback && (
                    <Button onClick={() => setFeedbackOpen(true)} variant="secondary" className="profile-hero__feedback">
                      <SendHorizontal size={18} aria-hidden="true" />
                      Send Feedback
                    </Button>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {isLimitedProfile ? (
          <section className="profile-card profile-card--full"><h2>Blocked profile</h2><p className="empty-copy">Unblock this user to view their profile details.</p></section>
        ) : (
          <div className="dashboard-grid dashboard-grid--secondary">
            <ContributionHeatmap heatmap={profileUser.heatmap} />

            {profileUser.about && (
              <section className="profile-card profile-card--full">
                <div className="profile-card__header"><h2>About</h2><p>{isFetching ? 'Refreshing profile...' : 'Public profile summary.'}</p></div>
                <p className="profile-copy">{profileUser.about}</p>
              </section>
            )}

            {skills.length > 0 && (
              <section className="profile-card">
                <div className="profile-card__header"><h2>Skills</h2><p>Technical strengths.</p></div>
                <div className="chip-list">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
              </section>
            )}

            {handles.length > 0 && (
              <section className="profile-card">
                <div className="profile-card__header"><h2>Handles</h2><p>Links around the web.</p></div>
                <div className="chip-list chip-list--links">
                  {handles.map((handle, index) => (
                    <a key={`${handle.label}-${index}`} href={handle.link} target="_blank" rel="noreferrer">{handle.label}</a>
                  ))}
                </div>
              </section>
            )}

            {hasPosts && (
              <ProfilePostsSection normalPosts={normalPosts} projectPosts={projectPosts} profileUser={profileUser} viewerId={currentUserId} />
            )}

            {experiences.length > 0 && (
              <section className="profile-card profile-card--full">
                <div className="profile-card__header"><h2>Experience</h2><p>Professional work and practice.</p></div>
                <div className="profile-timeline-list">
                  {experiences.map((experience, index) => (
                    <article key={`${experience.companyName || 'experience'}-${index}`}>
                      <strong>{experience.companyName || 'Experience'}</strong>
                      {experience.role && <small>{experience.role}</small>}
                      {experience.timePeriod && <span>{experience.timePeriod}</span>}
                    </article>
                  ))}
                </div>
              </section>
            )}

            {educations.length > 0 && (
              <section className="profile-card profile-card--full">
                <div className="profile-card__header"><h2>Education</h2><p>Learning history.</p></div>
                <div className="profile-timeline-list">
                  {educations.map((education, index) => (
                    <article key={`${education.collegeName || 'education'}-${index}`}>
                      <strong>{education.collegeName || 'Education'}</strong>
                      {education.course && <small>{education.course}</small>}
                      {education.timePeriod && <span>{education.timePeriod}</span>}
                    </article>
                  ))}
                </div>
              </section>
            )}

            {languages.length > 0 && (
              <section className="profile-card">
                <div className="profile-card__header"><h2>Languages</h2><p>Programming languages.</p></div>
                <div className="chip-list">{languages.map((language) => <span key={language}>{language}</span>)}</div>
              </section>
            )}

            {interests.length > 0 && (
              <section className="profile-card">
                <div className="profile-card__header"><h2>Interests</h2><p>Topics they care about.</p></div>
                <div className="chip-list">{interests.map((interest) => <span key={interest}>{interest}</span>)}</div>
              </section>
            )}
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
          receiverName={profileUser.userName}
          userId={profileUser._id}
        />
      )}

      <BlockConfirmModal
        isOpen={isBlockConfirmOpen}
        isLoading={isMutating}
        onClose={() => setBlockConfirmOpen(false)}
        onConfirm={handleConfirmBlock}
        userName={profileUser.userName}
      />

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
