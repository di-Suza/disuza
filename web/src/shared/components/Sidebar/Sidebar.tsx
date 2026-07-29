import { Bell, ChevronDown, ChevronUp, Earth, Home, LogOut, Menu, SendHorizonal, SquarePen, UserRound } from 'lucide-react';
import { lazy, memo, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useAppSelector } from '@/app/store/hooks';
import { useLogoutMutation } from '@/features/auth/api/auth.api';
import logo from '@/shared/assets/images/logo.png';
import useUnreadMessagesCount from '@/shared/hooks/useUnreadMessagesCount';
import { useUnreadNotificationsCount } from '@/shared/hooks/useUnreadNotificationsCount';
import { useToast } from '@/shared/hooks/useToast';
import AvatarImage from '@/shared/components/Avatar/AvatarImage';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import './Sidebar.css';

const sidebarItems = [
  { id: 'home', label: 'Home', icon: Home, path: '/home' },
  { id: 'search', label: 'Explore', icon: Earth, path: '/search' },
  { id: 'messages', label: 'Messages', icon: SendHorizonal, path: '/messages' },
  { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications' },
] as const;

const feedOptions = [
  { label: 'All', value: 'all' },
  { label: 'Following', value: 'following' },
] as const;

const PostComposerModal = lazy(() => import('@/features/posts/ui/components/PostComposerModal'));

type SidebarItem = (typeof sidebarItems)[number];

type SidebarNavLinkProps = {
  item: SidebarItem;
  isActive: boolean;
  badgeCount: number;
};

const SidebarNavLink = memo(({ item, isActive, badgeCount }: SidebarNavLinkProps) => {
  const Icon = item.icon;

  return (
    <Link key={item.id} title={item.label} to={item.path} className={isActive ? 'app-sidebar__link is-active' : 'app-sidebar__link'}>
      <span className="app-sidebar__icon-wrap">
        <Icon size={24} aria-hidden="true" />
        {badgeCount > 0 && <small>{badgeCount > 99 ? '99+' : badgeCount}</small>}
      </span>
      <span className="app-sidebar__label">{item.label}</span>
    </Link>
  );
});

SidebarNavLink.displayName = 'SidebarNavLink';

type SidebarComposeButtonProps = {
  onClick: () => void;
};

const SidebarComposeButton = memo(({ onClick }: SidebarComposeButtonProps) => (
  <button type="button" className="app-sidebar__link app-sidebar__compose-button" onClick={onClick}>
    <span className="app-sidebar__icon-wrap">
      <SquarePen size={22} aria-hidden="true" />
    </span>
    <span className="app-sidebar__label">Add Post</span>
  </button>
));

SidebarComposeButton.displayName = 'SidebarComposeButton';

const Sidebar = () => {
  const { pathname, search } = useLocation();
  const [isExpanded, setExpanded] = useState(false);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [isFeedMenuOpen, setFeedMenuOpen] = useState(false);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const mobileFeedSelectorRef = useRef<HTMLDivElement | null>(null);
  const sidebarFeedSelectorRef = useRef<HTMLDivElement | null>(null);
  const user = useAppSelector((state) => state.auth.user);
  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
  const { showError, showSuccess } = useToast();
  const notificationCount = useUnreadNotificationsCount();
  const messageCount = useUnreadMessagesCount();
  const activeFeedType = new URLSearchParams(search).get('type') === 'following' ? 'following' : 'all';
  const profilePictureUrl = typeof user?.profilePicture?.url === 'string' ? user.profilePicture.url : '';

  const isItemActive = (itemPath: string) => pathname === itemPath || pathname.startsWith(`${itemPath}/`);

  const handleOpenComposer = useCallback(() => {
    setExpanded(false);
    setFeedMenuOpen(false);
    setProfileMenuOpen(false);
    setComposerOpen(true);
  }, []);

  const handleToggleFeedMenu = useCallback(() => {
    setExpanded(false);
    setProfileMenuOpen(false);
    setFeedMenuOpen((current) => !current);
  }, []);

  const handleLogout = async () => {
    try {
      const result = await logout().unwrap();
      showSuccess(result.message);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  };

  useEffect(() => {
    setExpanded(false);
    setFeedMenuOpen(false);
    setProfileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isExpanded && !isFeedMenuOpen && !isProfileMenuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false);
        setFeedMenuOpen(false);
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isExpanded, isFeedMenuOpen, isProfileMenuOpen]);

  useEffect(() => {
    if (!isFeedMenuOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (mobileFeedSelectorRef.current?.contains(target) || sidebarFeedSelectorRef.current?.contains(target)) return;

      setFeedMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isFeedMenuOpen]);

  const renderFeedSelector = (variant: 'mobile' | 'sidebar') => (
    <div
      className={`app-feed-selector app-feed-selector--${variant}`}
      ref={variant === 'mobile' ? mobileFeedSelectorRef : sidebarFeedSelectorRef}
    >
      <button
        type="button"
        className="app-feed-selector__trigger"
        onClick={handleToggleFeedMenu}
        aria-label="Choose feed"
        aria-expanded={isFeedMenuOpen}
        aria-haspopup="menu"
      >
        <img className="brand-logo-image" src={logo} alt="Disuza" />
        <ChevronDown className={isFeedMenuOpen ? 'is-open' : undefined} size={16} aria-hidden="true" />
      </button>

      {isFeedMenuOpen && (
        <div className="app-feed-selector__menu" role="menu">
          {feedOptions.map((option) => (
            <Link
              key={option.value}
              to={`/home?type=${option.value}`}
              className={activeFeedType === option.value ? 'is-active' : undefined}
              onClick={() => {
                setExpanded(false);
                setFeedMenuOpen(false);
              }}
              role="menuitem"
            >
              <span />
              {option.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <header className="app-mobile-navbar" aria-label="Compact navigation">
        <button
          type="button"
          className="app-mobile-navbar__menu"
          onClick={() => {
            setExpanded(true);
            setProfileMenuOpen(false);
          }}
          aria-label="Open sidebar"
          aria-expanded={isExpanded}
        >
          <Menu size={22} aria-hidden="true" />
        </button>

        <div className="app-mobile-navbar__brand">
          {renderFeedSelector('mobile')}
        </div>

        <div className="app-mobile-navbar__profile">
          <Link
            to="/dashboard"
            className="app-mobile-navbar__profile-link"
            onClick={() => {
              setExpanded(false);
              setProfileMenuOpen(false);
            }}
            aria-label="Open profile"
          >
            <AvatarImage
              className="app-mobile-navbar__avatar"
              src={profilePictureUrl}
              fallback={<UserRound size={22} aria-hidden="true" />}
            />
          </Link>
          <button
            type="button"
            className="app-mobile-navbar__profile-toggle"
            onClick={() => {
              setExpanded(false);
              setProfileMenuOpen((current) => !current);
            }}
            aria-expanded={isProfileMenuOpen}
            aria-haspopup="menu"
            aria-label={isProfileMenuOpen ? 'Close profile actions' : 'Open profile actions'}
          >
            <ChevronDown className={isProfileMenuOpen ? 'is-open' : undefined} size={16} aria-hidden="true" />
          </button>
          {isProfileMenuOpen && (
            <div className="app-mobile-navbar__profile-menu" role="menu">
              <button type="button" className="app-sidebar__profile-menu-item" onClick={handleLogout} disabled={isLoggingOut}>
                <LogOut size={18} aria-hidden="true" />
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          )}
        </div>
      </header>

      {isExpanded && <button type="button" className="app-sidebar__backdrop" onClick={() => setExpanded(false)} aria-label="Close sidebar" />}

      <aside className={isExpanded ? 'app-sidebar is-expanded' : 'app-sidebar'} aria-label="Primary navigation">
        <header className="app-sidebar__header">
          <button
            type="button"
            className="app-sidebar__toggle"
            onClick={() => setExpanded((current) => !current)}
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={isExpanded}
          >
            <Menu size={22} aria-hidden="true" />
          </button>
        </header>

        <div className="app-sidebar__feed-switcher" aria-label="Feed filter">
          {renderFeedSelector('sidebar')}
        </div>

        <nav className="app-sidebar__panel" aria-label="Main navigation">
          <div className="app-sidebar__items">
            {sidebarItems.map((item) => {
              const isActive = isItemActive(item.path);
              const badgeCount = item.id === 'messages' ? messageCount : item.id === 'notifications' ? notificationCount : 0;

              return <SidebarNavLink key={item.id} item={item} isActive={isActive} badgeCount={badgeCount} />;
            })}
            <SidebarComposeButton onClick={handleOpenComposer} />
          </div>

          <div className="app-sidebar__footer">
            {isProfileMenuOpen && (
              <div className="app-sidebar__profile-menu">
                <button type="button" className="app-sidebar__profile-menu-item" onClick={handleLogout} disabled={isLoggingOut}>
                  <LogOut size={18} aria-hidden="true" />
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            )}
            <div
              className={[
                'app-sidebar__profile-row',
                isItemActive('/dashboard') ? 'is-active' : '',
                isProfileMenuOpen ? 'is-open' : '',
              ].filter(Boolean).join(' ')}
            >
              <Link
                title="Profile"
                to="/dashboard"
                className="app-sidebar__profile-link"
                onClick={() => {
                  setExpanded(false);
                  setProfileMenuOpen(false);
                }}
              >
                <span className="app-sidebar__icon-wrap">
                  <AvatarImage
                    className="app-sidebar__profile-avatar"
                    src={profilePictureUrl}
                    fallback={<UserRound size={24} aria-hidden="true" />}
                  />
                </span>
                <span className="app-sidebar__label">Profile</span>
              </Link>
              <button
                type="button"
                className="app-sidebar__profile-toggle"
                onClick={() => setProfileMenuOpen((current) => !current)}
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="menu"
                aria-label={isProfileMenuOpen ? 'Close profile actions' : 'Open profile actions'}
              >
                <ChevronUp className="app-sidebar__profile-caret" size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </nav>
      </aside>

      <Suspense fallback={null}>
        {isComposerOpen && <PostComposerModal isOpen={isComposerOpen} mode="create" onClose={() => setComposerOpen(false)} />}
      </Suspense>
    </>
  );
};

export default Sidebar;
