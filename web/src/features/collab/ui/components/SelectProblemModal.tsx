import { Code2, Hash, Search, TrendingUp, X, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useGetProblemsQuery } from '@/features/collab/api/problem.api';
import problemSuggestions from '@/features/collab/model/problemSuggestions';
import useDebounce from '@/shared/hooks/useDebounce';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import Input from '@/shared/ui/Input';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import DSAProblemList from './DSAProblemList';

type SelectProblemModalProps = {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
  addedProblemIds?: string[];
};

const suggestionSections = [
  { title: 'Popular Patterns', icon: TrendingUp, items: problemSuggestions.popular },
  { title: 'Data Structures', icon: Hash, items: problemSuggestions.dataStructures },
  { title: 'Algorithms', icon: Code2, items: problemSuggestions.algorithms },
  { title: 'Difficulty', icon: Zap, items: problemSuggestions.difficulty },
  { title: 'Top Companies', icon: Code2, items: problemSuggestions.companies },
];

const SelectProblemModal = ({ isOpen, onClose, roomId, addedProblemIds = [] }: SelectProblemModalProps) => {
  useLockBodyScroll(isOpen);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [locallyAddedProblemIds, setLocallyAddedProblemIds] = useState<string[]>([]);
  const debouncedSearchQuery = useDebounce(searchQuery.trim(), 300);
  const {
    data: problemsData,
    error,
    isError,
    isFetching,
    refetch,
  } = useGetProblemsQuery(
    { query: debouncedSearchQuery, page, roomId: roomId || '', source: 'manual' },
    { skip: debouncedSearchQuery.trim() === '' || !roomId },
  );
  const problems = problemsData?.data || [];
  const hasMore = Boolean(problemsData?.hasMore);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery]);

  useEffect(() => {
    setLocallyAddedProblemIds([]);
  }, [roomId]);

  const handleProblemAdded = (problemId: string) => {
    setLocallyAddedProblemIds((currentIds) => (
      currentIds.includes(problemId) ? currentIds : [...currentIds, problemId]
    ));
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="collab-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="collab-problem-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="collab-icon-button collab-status-modal__close" onClick={onClose} aria-label="Close modal">
          <X size={18} aria-hidden="true" />
        </button>

        <header>
          <h1>DSA Problems</h1>
          <p>Search by algorithm, data structure, problem pattern, or company</p>
        </header>

        <div className="collab-problem-modal__body">
          <div className="collab-search-box">
            <Search size={20} aria-hidden="true" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search problems, algorithms, data structures, tags..."
            />
          </div>

          {debouncedSearchQuery.length > 0 ? (
            <>
              {isFetching ? (
                <LoadingSpinner className="collab-modal-state" label="Loading problems" />
              ) : isError ? (
                <div className="collab-modal-state">
                  <p>{getErrorMessage(error, 'Problems could not be loaded')}</p>
                  <button type="button" onClick={() => refetch()}>Retry</button>
                </div>
              ) : problems.length > 0 ? (
                <DSAProblemList
                  problems={problems}
                  roomId={roomId}
                  addedProblemIds={[...addedProblemIds, ...locallyAddedProblemIds]}
                  onProblemAdded={handleProblemAdded}
                />
              ) : (
                <div className="collab-empty-box">No Problems Found</div>
              )}

              {hasMore && (
                <button type="button" className="collab-load-more" onClick={() => setPage((currentPage) => currentPage + 1)}>
                  Load more
                </button>
              )}
            </>
          ) : (
            <div className="collab-suggestions">
              {suggestionSections.map((section) => {
                const Icon = section.icon;
                return (
                  <section key={section.title}>
                    <h3><Icon size={18} aria-hidden="true" />{section.title}</h3>
                    <div>
                      {section.items.map((term) => (
                        <button key={term} type="button" onClick={() => setSearchQuery(term)}>{term}</button>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default SelectProblemModal;
