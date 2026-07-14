import { Crown, Loader2, RefreshCw, Search, Sparkles, TrendingUp, X } from 'lucide-react';
import { Link } from 'react-router-dom';

import SearchPostCard from '@/features/search/ui/components/SearchPostCard';
import SearchUserCard from '@/features/search/ui/components/SearchUserCard';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import { useSearchPage } from './useSearchPage';

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
            <p className="state-panel__eyebrow">Explore</p>
            <h1>Search</h1>
            <p>{hasActiveSearchQuery ? `${totalUsers + totalPosts} result${totalUsers + totalPosts === 1 ? '' : 's'}` : 'Discover people and posts'}</p>
          </div>
          <div className="search-header__actions">
            <Link to="/home" className="button button--secondary">Feed</Link>
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
            placeholder="Search people or posts"
            aria-label="Search people or posts"
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
                <p>Searching...</p>
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
                    <div className="search-user-grid">
                      {matchedUsers.map((user, index) => (
                        <SearchUserCard key={user._id} user={user} index={index} currentUserId={currentUserId} />
                      ))}
                    </div>
                    {hasMoreSearchUsers && (
                      <div className="search-load-more">
                        <Button variant="secondary" onClick={handleLoadMoreSearchUsers} disabled={isFetching}>
                          {isFetching ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <RefreshCw size={18} aria-hidden="true" />}
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
                    <div className="search-post-grid">
                      {matchedPosts.map((post) => (
                        <SearchPostCard key={post._id} post={post} />
                      ))}
                    </div>
                    {hasMoreSearchPosts && (
                      <div className="search-load-more">
                        <Button variant="secondary" onClick={handleLoadMoreSearchPosts} disabled={isFetching}>
                          {isFetching ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <RefreshCw size={18} aria-hidden="true" />}
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
              <div className="search-user-grid">
                {topContributors.map((user, index) => (
                  <SearchUserCard key={user._id} user={user} index={index} currentUserId={currentUserId} />
                ))}
              </div>
            </section>

            <section className="search-section">
              <div className="search-section__title">
                <TrendingUp size={19} aria-hidden="true" />
                <h2>Trending Posts</h2>
              </div>
              {trendingPosts.length > 0 ? (
                <div className="search-post-grid">
                  {trendingPosts.map((post) => (
                    <SearchPostCard key={post._id} post={post} />
                  ))}
                </div>
              ) : (
                <section className="post-empty-state search-state">
                  <Sparkles size={24} aria-hidden="true" />
                  <p>No trending posts yet.</p>
                </section>
              )}
              {hasMoreTrendingPosts && (
                <div className="search-load-more">
                  <Button variant="secondary" onClick={handleLoadMoreTrendingPosts} disabled={isDiscoverFetching}>
                    {isDiscoverFetching ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <RefreshCw size={18} aria-hidden="true" />}
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
