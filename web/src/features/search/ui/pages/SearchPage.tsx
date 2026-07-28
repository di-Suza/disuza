import { Crown, Loader2, RefreshCw, Search, Sparkles, TrendingUp, X } from 'lucide-react';
import { memo } from 'react';

import SearchPostCard from '@/features/search/ui/components/SearchPostCard';
import SearchUserCard from '@/features/search/ui/components/SearchUserCard';
import type { SearchUser } from '@/features/search/model/search.types';
import type { Post } from '@/features/posts/model/post.types';
import ErrorBoundary from '@/shared/components/ErrorBoundary/ErrorBoundary';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import { useSearchPage } from './useSearchPage';
import './SearchPage.css';
import '@/app/layouts/ProductShell.css';

type SearchUserGridProps = {
  boundaryTitle: string;
  className?: string;
  currentUserId?: string;
  users: SearchUser[];
};

const SearchUserGrid = memo(({ boundaryTitle, className, currentUserId, users }: SearchUserGridProps) => (
  <div className={['search-user-grid', className].filter(Boolean).join(' ')}>
    {users.map((user, index) => (
      <ErrorBoundary key={user._id} variant="section" title={boundaryTitle} resetKeys={[user._id]} showReload={false}>
        <SearchUserCard user={user} index={index} currentUserId={currentUserId} />
      </ErrorBoundary>
    ))}
  </div>
));

SearchUserGrid.displayName = 'SearchUserGrid';

type SearchPostGridProps = {
  boundaryTitle: string;
  posts: Post[];
};

const SearchPostGrid = memo(({ boundaryTitle, posts }: SearchPostGridProps) => (
  <div className="search-post-grid">
    {posts.map((post) => (
      <ErrorBoundary key={post._id} variant="section" title={boundaryTitle} resetKeys={[post._id]} showReload={false}>
        <SearchPostCard post={post} />
      </ErrorBoundary>
    ))}
  </div>
));

SearchPostGrid.displayName = 'SearchPostGrid';

const SearchPage = () => {
  const {
    currentUserId,
    error,
    handleClearSearch,
    handleLoadMoreSearchPosts,
    handleLoadMoreSearchUsers,
    handleLoadMoreTrendingPosts,
    handleSearchBlur,
    handleSearchChange,
    handleSearchFocus,
    hasActiveSearchQuery,
    hasMoreSearchPosts,
    hasMoreSearchUsers,
    hasMoreTrendingPosts,
    isDiscoverFetching,
    isError,
    isFetching,
    isSearchFocused,
    isSearchPending,
    matchedPosts,
    matchedUsers,
    refetch,
    searchQuery,
    topContributors,
    totalPosts,
    totalUsers,
    trendingPosts,
  } = useSearchPage();

  return (
    <main className="dashboard-shell dashboard-shell--wide search-shell">
      <section className="dashboard-panel dashboard-panel--wide search-panel">
        <header className="search-header">
          <div>
            <h1>Explore</h1>
            <p>{hasActiveSearchQuery ? `${totalUsers + totalPosts} result${totalUsers + totalPosts === 1 ? '' : 's'}` : 'Discover people and posts'}</p>
          </div>
          <div className="search-header__actions">
            <Button variant="ghost" className="button--icon" onClick={() => refetch()} disabled={isFetching} aria-label="Refresh search">
              {isFetching ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <RefreshCw size={18} aria-hidden="true" />}
            </Button>
          </div>
        </header>

        <div className={`search-box ${isSearchFocused ? 'is-focused' : ''}`}>
          <Search size={20} aria-hidden="true" />
          <Input
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            placeholder="Anything you want to explore..."
            aria-label="Anything you want to explore..."
          />
          {searchQuery && (
            <Button variant="ghost" className="button--icon" onClick={handleClearSearch} aria-label="Clear search">
              <X size={18} aria-hidden="true" />
            </Button>
          )}
        </div>

        {isError ? (
          <section className="post-empty-state search-state">
            <RefreshCw size={24} aria-hidden="true" />
            <p>{getErrorMessage(error, 'Search could not be loaded.')}</p>
            <Button variant="secondary" onClick={() => refetch()}>Retry</Button>
          </section>
        ) : hasActiveSearchQuery ? (
          <div className="search-results">
            {isSearchPending ? (
              <section className="post-empty-state search-state">
                <Loader2 className="spin" size={24} aria-hidden="true" />
              </section>
            ) : totalUsers + totalPosts === 0 ? (
              <section className="post-empty-state search-state">
                <Search size={24} aria-hidden="true" />
                <p>No results found.</p>
              </section>
            ) : (
              <>
                {matchedUsers.length > 0 && (
                  <section className="search-section">
                    <div className="search-section__title">
                      <Crown size={19} aria-hidden="true" />
                      <h2>People</h2>
                    </div>
                    <SearchUserGrid users={matchedUsers} currentUserId={currentUserId} boundaryTitle="User result could not be rendered." />
                    {hasMoreSearchUsers && (
                      <div className="search-load-more">
                        <Button variant="secondary" onClick={handleLoadMoreSearchUsers} isLoading={isFetching} loadingLabel="Loading users">
                          <RefreshCw size={18} aria-hidden="true" />
                          Load more users
                        </Button>
                      </div>
                    )}
                  </section>
                )}

                {matchedPosts.length > 0 && (
                  <section className="search-section">
                    <div className="search-section__title">
                      <TrendingUp size={19} aria-hidden="true" />
                      <h2>Posts</h2>
                    </div>
                    <SearchPostGrid posts={matchedPosts} boundaryTitle="Post result could not be rendered." />
                    {hasMoreSearchPosts && (
                      <div className="search-load-more">
                        <Button variant="secondary" onClick={handleLoadMoreSearchPosts} isLoading={isFetching} loadingLabel="Loading posts">
                          <RefreshCw size={18} aria-hidden="true" />
                          Load more posts
                        </Button>
                      </div>
                    )}
                  </section>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="search-results">
            <section className="search-section">
              <div className="search-section__title">
                <Crown size={19} aria-hidden="true" />
                <h2>Top Contributors</h2>
              </div>
              <SearchUserGrid
                users={topContributors}
                currentUserId={currentUserId}
                boundaryTitle="Contributor card could not be rendered."
                className="search-user-grid--contributors"
              />
            </section>

            <section className="search-section">
              <div className="search-section__title">
                <TrendingUp size={19} aria-hidden="true" />
                <h2>Trending Posts</h2>
              </div>
              {trendingPosts.length > 0 ? (
                <SearchPostGrid posts={trendingPosts} boundaryTitle="Trending post could not be rendered." />
              ) : (
                <section className="post-empty-state search-state">
                  <Sparkles size={24} aria-hidden="true" />
                  <p>No trending posts yet.</p>
                </section>
              )}
              {hasMoreTrendingPosts && (
                <div className="search-load-more">
                  <Button variant="secondary" onClick={handleLoadMoreTrendingPosts} isLoading={isDiscoverFetching} loadingLabel="Loading posts">
                    <RefreshCw size={18} aria-hidden="true" />
                    Load more posts
                  </Button>
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
};

export default SearchPage;
