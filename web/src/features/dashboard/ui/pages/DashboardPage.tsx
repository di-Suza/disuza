import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Bookmark,
  ChevronDown,
  ChevronRight,
  Code2,
  FileText,
  Grid,
  Heart,
  HelpCircle,
  Lock,
  LogOut,
  MessageCircle,
  MessageSquare,
  Monitor,
  Moon,
  Settings,
  Shield,
  ShieldCheck,
  Sun,
  Trash2,
  UserPen,
  UserPlus,
  UserRound,
  UserStar,
  UserX,
} from 'lucide-react';

import ErrorBoundary from '@/shared/components/ErrorBoundary/ErrorBoundary';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';
import HeatmapRules from '../components/HeatmapRules';
import type { DashboardAccountModalMode } from '../components/DashboardAccountModal';
import type { DashboardActivityType } from '../components/DashboardActivitiesModal';
import type { DashboardUserListType } from '../components/DashboardUserListModal';
import { useDashboardPage } from './useDashboardPage';
import '@/features/reports/ui/components/ReportModal.css';
import './DashboardLegacy.css';
import './DashboardPage.css';
import '@/app/layouts/ProductShell.css';

type DashboardTab = 'heatmap' | 'posts' | 'portfolio' | 'rooms' | 'more';
type MoreSection = 'display' | 'activities' | 'collections' | 'support' | 'privacy';
type Theme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'disuza-theme';

const ForgotPasswordModal = lazy(() => import('@/features/auth/ui/components/ForgotPasswordModal/ForgotPasswordModal'));
const ReportAProblemModal = lazy(() => import('@/features/issues/ui/components/ReportAProblemModal'));
const DashboardPostsPanel = lazy(() => import('@/features/posts/ui/components/DashboardPostsPanel'));
const PostComposerModal = lazy(() => import('@/features/posts/ui/components/PostComposerModal'));
const SavedCollectionsPanel = lazy(() => import('@/features/saves/ui/components/SavedCollectionsPanel'));
const DashboardAccountModal = lazy(() => import('../components/DashboardAccountModal'));
const DashboardActivitiesModal = lazy(() => import('../components/DashboardActivitiesModal'));
const DashboardBlockedUsersModal = lazy(() => import('../components/DashboardBlockedUsersModal'));
const DashboardEditProfileModal = lazy(() => import('../components/DashboardEditProfileModal'));
const DashboardPortfolioEditor = lazy(() => import('../components/DashboardPortfolioEditor'));
const DashboardReportsModal = lazy(() => import('../components/DashboardReportsModal'));
const DashboardRoomsPanel = lazy(() => import('../components/DashboardRoomsPanel'));
const DashboardUserListModal = lazy(() => import('../components/DashboardUserListModal'));
const ContributionHeatmap = lazy(() => import('../components/ContributionHeatmap'));

const dashboardTabs: Array<{ id: DashboardTab; label: string; icon: typeof Activity }> = [
  { id: 'heatmap', label: 'Activity', icon: Activity },
  { id: 'posts', label: 'Posts', icon: Grid },
  { id: 'portfolio', label: 'Portfolio', icon: UserPen },
  { id: 'rooms', label: 'Rooms', icon: Code2 },
  { id: 'more', label: 'More', icon: Settings },
];

const moreSections: Array<{ id: MoreSection; label: string; description: string; icon: typeof Monitor }> = [
  { id: 'display', label: 'Display', description: 'Theme preferences', icon: Monitor },
  { id: 'activities', label: 'Activities History', description: 'Your activity logs', icon: Activity },
  { id: 'collections', label: 'Collections', description: 'Saved posts', icon: Bookmark },
  { id: 'support', label: 'Support & Legal', description: 'Help and policies', icon: HelpCircle },
  { id: 'privacy', label: 'Privacy & Security', description: 'Account security', icon: Shield },
];

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';
  return window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
};

const getAvatarUrl = (url: unknown): string | null => (typeof url === 'string' && url.trim() ? url : null);

const SettingsRow = ({
  description,
  icon: Icon,
  onClick,
  title,
  tone = 'accent',
}: {
  description: string;
  icon: typeof Activity;
  onClick: () => void;
  title: string;
  tone?: 'accent' | 'danger';
}) => (
  <button type="button" onClick={onClick} className={tone === 'danger' ? 'settings-row settings-row--danger' : 'settings-row'}>
    <span className="settings-row__main">
      <span className="settings-row__icon"><Icon size={20} aria-hidden="true" /></span>
      <span><strong>{title}</strong><small>{description}</small></span>
    </span>
    <ChevronRight size={20} aria-hidden="true" />
  </button>
);

const ActivityCard = ({
  description,
  icon: Icon,
  onClick,
  title,
  tone = 'accent',
}: {
  description: string;
  icon: typeof Activity;
  onClick: () => void;
  title: string;
  tone?: 'accent' | 'danger';
}) => (
  <button type="button" onClick={onClick} className={tone === 'danger' ? 'activity-card activity-card--danger' : 'activity-card'}>
    <span className="activity-card__heading">
      <span className="activity-card__icon"><Icon size={20} aria-hidden="true" /></span>
      <strong>{title}</strong>
    </span>
    <small>{description}</small>
  </button>
);

const DashboardSectionLoader = () => (
  <LoadingSpinner className="dashboard-v1-section-loader" label="Loading dashboard section" />
);

const DashboardPage = () => {
  const dashboard = useDashboardPage();
  const { user } = dashboard;
  const [activeTab, setActiveTab] = useState<DashboardTab>('heatmap');
  const [activeMoreSection, setActiveMoreSection] = useState<MoreSection>('display');
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [isEditProfileOpen, setEditProfileOpen] = useState(false);
  const [isForgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [isProblemModalOpen, setProblemModalOpen] = useState(false);
  const [userListModal, setUserListModal] = useState<DashboardUserListType | null>(null);
  const [activityModal, setActivityModal] = useState<DashboardActivityType | null>(null);
  const [accountModal, setAccountModal] = useState<DashboardAccountModalMode | null>(null);
  const [isReportsModalOpen, setReportsModalOpen] = useState(false);
  const [isBlockedUsersModalOpen, setBlockedUsersModalOpen] = useState(false);
  const avatarUrl = getAvatarUrl(user?.profilePicture?.url);
  const isDarkMode = theme === 'dark';
  const [isMoreMenuOpen, setMoreMenuOpen] = useState(false);
  const activeMoreSectionLabel = useMemo(
    () => moreSections.find((section) => section.id === activeMoreSection)?.label || 'Display',
    [activeMoreSection],
  );
  const handleThemeToggle = useCallback(() => {
    setTheme((current) => current === 'dark' ? 'light' : 'dark');
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <main className="dashboard-v1-shell">
      <div className="dashboard-v1-container">
        <ErrorBoundary variant="section" title="Dashboard header could not be rendered." resetKeys={[user?._id]} showReload={false}>
          <section className="dashboard-v1-header">
            <div className="dashboard-v1-header__top">
              <div className="dashboard-v1-user">
                <span className="dashboard-v1-avatar-wrap">
                  <span className="dashboard-v1-avatar">
                    {avatarUrl ? <img src={avatarUrl} alt={user?.userName || 'Profile'} /> : <UserRound size={34} aria-hidden="true" />}
                  </span>
                </span>
                <span className="dashboard-v1-user__copy">
                  <small>Your Dashboard</small>
                  <span className="dashboard-v1-user__name-row">
                    <h1>{user?.userName || 'Disuza user'}</h1>
                    <button type="button" className="dashboard-v1-edit-profile-button" onClick={() => setEditProfileOpen(true)} aria-label="Edit profile">
                      <UserPen size={17} aria-hidden="true" />
                    </button>
                  </span>
                  <em><UserStar size={16} aria-hidden="true" />{Number(user?.profileContributions || 0)} contributions</em>
                </span>
              </div>

              <div className="dashboard-v1-stats" aria-label="Your profile stats">
                <button type="button"><strong>{Number(user?.postsCount || 0)}</strong><span>Posts</span></button>
                <button type="button" onClick={() => setUserListModal('followers')}><strong>{Number(user?.followersCount || 0)}</strong><span>Followers</span></button>
                <button type="button" onClick={() => setUserListModal('following')}><strong>{Number(user?.followingCount || 0)}</strong><span>Following</span></button>
              </div>
            </div>
          </section>
        </ErrorBoundary>

        <ErrorBoundary variant="section" title="Dashboard navigation could not be rendered." resetKeys={[activeTab]} showReload={false}>
          <section className="dashboard-v1-tabs" aria-label="Dashboard sections">
            {dashboardTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={isActive ? 'dashboard-v1-tab is-active' : 'dashboard-v1-tab'}>
                  <Icon size={17} aria-hidden="true" />
                  <span>{tab.label}</span>
                  {tab.id === 'heatmap' && <HeatmapRules />}
                </button>
              );
            })}
          </section>
        </ErrorBoundary>

        <section className="dashboard-v1-content">
          <Suspense fallback={<DashboardSectionLoader />}>
            {activeTab === 'heatmap' && (
              <ErrorBoundary variant="section" title="Activity could not be rendered." resetKeys={[activeTab, user?._id]} showReload={false}>
                <ContributionHeatmap heatmap={user?.heatmap} showAnalytics />
              </ErrorBoundary>
            )}
            {activeTab === 'posts' && (
              <ErrorBoundary variant="section" title="Posts panel could not be rendered." resetKeys={[activeTab, user?._id]} showReload={false}>
                <DashboardPostsPanel user={user} />
              </ErrorBoundary>
            )}
            {activeTab === 'portfolio' && (
              <ErrorBoundary variant="section" title="Portfolio editor could not be rendered." resetKeys={[activeTab, user?._id]} showReload={false}>
                <DashboardPortfolioEditor {...dashboard} />
              </ErrorBoundary>
            )}

            {activeTab === 'rooms' && (
              <ErrorBoundary variant="section" title="Rooms panel could not be rendered." resetKeys={[activeTab, user?._id]} showReload={false}>
                <DashboardRoomsPanel />
              </ErrorBoundary>
            )}

            {activeTab === 'more' && (
              <ErrorBoundary variant="section" title="More settings could not be rendered." resetKeys={[activeTab, activeMoreSection]} showReload={false}>
                <div className="more-page-v1">
                <header className="more-page-v1__heading"><h1>More</h1></header>

                <div className="more-v1-shell">
                  <div className={isMoreMenuOpen ? 'more-v1-select is-open' : 'more-v1-select'}>
                    <button
                      type="button"
                      className="more-v1-select__trigger"
                      onClick={() => setMoreMenuOpen((current) => !current)}
                      aria-expanded={isMoreMenuOpen}
                      aria-haspopup="listbox"
                    >
                      <span>{activeMoreSectionLabel}</span>
                      <ChevronDown size={16} aria-hidden="true" />
                    </button>
                    {isMoreMenuOpen && (
                      <div className="more-v1-select__menu" role="listbox" aria-label="More sections">
                        {moreSections.map((section) => (
                          <button
                            key={section.id}
                            type="button"
                            role="option"
                            aria-selected={activeMoreSection === section.id}
                            onClick={() => {
                              setActiveMoreSection(section.id);
                              setMoreMenuOpen(false);
                            }}
                            className={activeMoreSection === section.id ? 'is-active' : ''}
                          >
                            {section.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                <aside className="more-v1-menu">
                  {moreSections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeMoreSection === section.id;
                    return (
                      <button key={section.id} type="button" onClick={() => setActiveMoreSection(section.id)} className={isActive ? 'more-v1-menu__item is-active' : 'more-v1-menu__item'}>
                        <Icon size={20} aria-hidden="true" />
                        <span><strong>{section.label}</strong><small>{section.description}</small></span>
                      </button>
                    );
                  })}
                </aside>

                <section className="more-v1-panel">
                  {activeMoreSection === 'display' && (
                    <div className="more-v1-section">
                      <div><h2>Display</h2><p>Customize how Disuza looks on your device</p></div>
                      <button type="button" onClick={handleThemeToggle} className="settings-row">
                        <span className="settings-row__main"><span className="settings-row__icon">{isDarkMode ? <Moon size={20} /> : <Sun size={20} />}</span><span><strong>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</strong><small>{isDarkMode ? 'Easy on the eyes in low light' : 'Bright and clear interface'}</small></span></span>
                        <span className={isDarkMode ? 'settings-toggle is-active' : 'settings-toggle'}><i /></span>
                      </button>
                    </div>
                  )}

                  {activeMoreSection === 'activities' && (
                    <div className="more-v1-section">
                      <div><h2>Activities History</h2><p>View your activity on Disuza</p></div>
                      <div className="activity-card-grid">
                        <ActivityCard icon={Heart} title="Likes" description="Posts you've liked" onClick={() => setActivityModal('likes')} tone="danger" />
                        <ActivityCard icon={MessageCircle} title="Comments" description="Your comment history" onClick={() => setActivityModal('comments')} />
                        <ActivityCard icon={UserPlus} title="Follows" description="People you follow" onClick={() => setActivityModal('follows')} />
                        <ActivityCard icon={MessageSquare} title="Feedbacks" description="Feedback you've sent" onClick={() => setActivityModal('feedbacks')} />
                      </div>
                    </div>
                  )}

                  {activeMoreSection === 'collections' && <SavedCollectionsPanel viewerId={user?._id} />}

                  {activeMoreSection === 'support' && (
                    <div className="more-v1-section">
                      <div><h2>Support & Legal</h2><p>Get help and review our policies</p></div>
                      <SettingsRow icon={AlertCircle} title="Report a Bug" description="Let us know if something is not working" onClick={() => setProblemModalOpen(true)} />
                      <SettingsRow icon={ShieldCheck} title="Your Reports" description="Track reports you submitted and their review status" onClick={() => setReportsModalOpen(true)} />
                      <SettingsRow icon={FileText} title="Privacy Policy & Terms" description="Review our policies and terms" onClick={() => setAccountModal('privacy')} />
                    </div>
                  )}

                  {activeMoreSection === 'privacy' && (
                    <div className="more-v1-section">
                      <div><h2>Privacy & Security</h2><p>Manage your account security and privacy</p></div>
                      {!user?.isGoogleUser && <SettingsRow icon={Lock} title="Change Password" description="Update your account password" onClick={() => setForgotPasswordOpen(true)} />}
                      <SettingsRow icon={UserX} title="Blocked Users" description="Manage your blocked accounts" onClick={() => setBlockedUsersModalOpen(true)} tone="danger" />
                      <SettingsRow icon={LogOut} title={dashboard.isLogoutLoading ? 'Logging Out...' : 'Log Out'} description="Sign out from this device" onClick={dashboard.handleLogout} tone="danger" />
                      <SettingsRow icon={LogOut} title={dashboard.isLogoutAllLoading ? 'Logging Out Everywhere...' : 'Log Out From All Devices'} description="End active sessions on every device" onClick={dashboard.handleLogoutAllDevices} tone="danger" />
                      <SettingsRow icon={Trash2} title="Delete Account" description="Permanently delete your account and data" onClick={() => setAccountModal('delete')} tone="danger" />
                    </div>
                  )}
                </section>
                </div>
              </div>
              </ErrorBoundary>
            )}
          </Suspense>
        </section>
      </div>

      <Suspense fallback={null}>
        {isComposerOpen && (
          <ErrorBoundary variant="inline" title="Post modal could not be rendered." resetKeys={[isComposerOpen]} showReload={false}>
            <PostComposerModal isOpen={isComposerOpen} mode="create" onClose={() => setComposerOpen(false)} />
          </ErrorBoundary>
        )}
        {isEditProfileOpen && (
          <ErrorBoundary variant="inline" title="Edit profile modal could not be rendered." resetKeys={[isEditProfileOpen]} showReload={false}>
            <DashboardEditProfileModal
              {...dashboard}
              isOpen={isEditProfileOpen}
              onClose={() => setEditProfileOpen(false)}
              onForgotPassword={() => {
                setEditProfileOpen(false);
                setForgotPasswordOpen(true);
              }}
            />
          </ErrorBoundary>
        )}
        {isForgotPasswordOpen && (
          <ErrorBoundary variant="inline" title="Forgot password modal could not be rendered." resetKeys={[isForgotPasswordOpen]} showReload={false}>
            <ForgotPasswordModal isOpen={isForgotPasswordOpen} onClose={() => setForgotPasswordOpen(false)} />
          </ErrorBoundary>
        )}
        {isProblemModalOpen && (
          <ErrorBoundary variant="inline" title="Problem report modal could not be rendered." resetKeys={[isProblemModalOpen]} showReload={false}>
            <ReportAProblemModal isOpen={isProblemModalOpen} onClose={() => setProblemModalOpen(false)} />
          </ErrorBoundary>
        )}
        {userListModal && (
          <ErrorBoundary variant="inline" title="User list modal could not be rendered." resetKeys={[userListModal]} showReload={false}>
            <DashboardUserListModal isOpen={Boolean(userListModal)} type={userListModal} userId={user?._id} onClose={() => setUserListModal(null)} />
          </ErrorBoundary>
        )}
        {activityModal && (
          <ErrorBoundary variant="inline" title="Activity modal could not be rendered." resetKeys={[activityModal]} showReload={false}>
            <DashboardActivitiesModal isOpen={Boolean(activityModal)} type={activityModal} onClose={() => setActivityModal(null)} />
          </ErrorBoundary>
        )}
        {isReportsModalOpen && (
          <ErrorBoundary variant="inline" title="Reports modal could not be rendered." resetKeys={[isReportsModalOpen]} showReload={false}>
            <DashboardReportsModal isOpen={isReportsModalOpen} onClose={() => setReportsModalOpen(false)} />
          </ErrorBoundary>
        )}
        {isBlockedUsersModalOpen && (
          <ErrorBoundary variant="inline" title="Blocked users modal could not be rendered." resetKeys={[isBlockedUsersModalOpen]} showReload={false}>
            <DashboardBlockedUsersModal isOpen={isBlockedUsersModalOpen} onClose={() => setBlockedUsersModalOpen(false)} />
          </ErrorBoundary>
        )}
        {accountModal && (
          <ErrorBoundary variant="inline" title="Account modal could not be rendered." resetKeys={[accountModal]} showReload={false}>
            <DashboardAccountModal isOpen={Boolean(accountModal)} mode={accountModal} onClose={() => setAccountModal(null)} />
          </ErrorBoundary>
        )}
      </Suspense>
    </main>
  );
};

export default DashboardPage;
