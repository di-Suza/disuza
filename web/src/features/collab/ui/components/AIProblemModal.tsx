import { ArrowLeft, Code2, Hash, Loader2, Search, Sparkles, TrendingUp, Wand2, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { useGenerateAIProblemMutation, useGetProblemsQuery } from '@/features/collab/api/problem.api';
import type { Problem } from '@/features/collab/model/collab.types';
import problemSuggestions from '@/features/collab/model/problemSuggestions';
import useDebounce from '@/shared/hooks/useDebounce';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import { useToast } from '@/shared/hooks/useToast';
import Input from '@/shared/ui/Input';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import DSAProblemList from './DSAProblemList';

type AIProblemModalProps = {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
  addedProblemIds?: string[];
};

const suggestionSections = [
  { title: 'Prompt Ideas', icon: Sparkles, items: ['Custom graph challenge', 'Array edge cases', 'String parsing', 'Scheduling problem'] },
  { title: 'Data Structures', icon: Hash, items: problemSuggestions.dataStructures },
  { title: 'Algorithms', icon: Code2, items: problemSuggestions.algorithms },
  { title: 'Difficulty', icon: Zap, items: problemSuggestions.difficulty },
  { title: 'Popular Patterns', icon: TrendingUp, items: problemSuggestions.popular },
];

const AIProblemModal = ({ isOpen, onClose, roomId, addedProblemIds = [] }: AIProblemModalProps) => {
  useLockBodyScroll(isOpen);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [isGenerateMode, setIsGenerateMode] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generatedProblems, setGeneratedProblems] = useState<Problem[]>([]);
  const [locallyAddedProblemIds, setLocallyAddedProblemIds] = useState<string[]>([]);
  const [generateAIProblem, { isLoading: isGenerating }] = useGenerateAIProblemMutation();
  const { showError, showSuccess } = useToast();
  const debouncedSearchQuery = useDebounce(searchQuery.trim(), 300);
  const {
    data: problemsData,
    error,
    isError,
    isFetching,
    refetch,
  } = useGetProblemsQuery(
    { query: debouncedSearchQuery, page, roomId: roomId || '', source: 'ai' },
    { skip: !roomId },
  );
  const hasMore = Boolean(problemsData?.hasMore);

  const problems = useMemo(() => {
    const remoteProblems = problemsData?.data || [];
    const remoteIds = new Set(remoteProblems.map((problem) => problem._id));
    const localOnlyProblems = generatedProblems.filter((problem) => !remoteIds.has(problem._id));
    return [...localOnlyProblems, ...remoteProblems];
  }, [generatedProblems, problemsData?.data]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery]);

  useEffect(() => {
    if (!isOpen) return;
    setLocallyAddedProblemIds([]);
  }, [isOpen, roomId]);

  const handleProblemAdded = (problemId: string) => {
    setLocallyAddedProblemIds((currentIds) => (
      currentIds.includes(problemId) ? currentIds : [...currentIds, problemId]
    ));
  };

  const handleGenerateProblem = async () => {
    if (!roomId || isGenerating) return;

    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length < 12) {
      showError('Please describe the problem you want in at least 12 characters.');
      return;
    }

    try {
      const response = await generateAIProblem({ roomId, prompt: trimmedPrompt }).unwrap();
      setGeneratedProblems((currentProblems) => [response.data, ...currentProblems.filter((problem) => problem._id !== response.data._id)]);
      setSearchQuery(response.data.title);
      setPrompt('');
      setIsGenerateMode(false);
      showSuccess('AI problem generated successfully.');
    } catch (apiError) {
      showError(getErrorMessage(apiError, 'AI problem could not be generated. Please try again.'));
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="collab-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="collab-problem-modal collab-ai-problem-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="collab-icon-button collab-status-modal__close" onClick={onClose} aria-label="Close modal">
          <X size={18} aria-hidden="true" />
        </button>

        <header>
          <h1>AI Problems</h1>
          <p>Search generated problems or create one for this room</p>
        </header>

        <div className="collab-problem-modal__body">
          {isGenerateMode ? (
            <section className="collab-ai-generate-card">
              <div className="collab-ai-generate-card__header">
                <button type="button" className="collab-icon-button" onClick={() => setIsGenerateMode(false)} aria-label="Back to AI problems">
                  <ArrowLeft size={17} aria-hidden="true" />
                </button>
                <div>
                  <h2>Generate Problem</h2>
                  <p>Describe the pattern, topic, or scenario you want to practice.</p>
                </div>
              </div>

              <textarea
                className="collab-ai-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                maxLength={1200}
                placeholder="Example: Create a medium graph problem about finding the minimum cost path with blocked cells and edge cases."
              />

              <div className="collab-ai-generate-card__footer">
                <span>{prompt.trim().length}/1200</span>
                <button type="button" className="collab-ai-generate-button" onClick={handleGenerateProblem} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Wand2 size={16} aria-hidden="true" />}
                  {!isGenerating && <span>Generate</span>}
                </button>
              </div>
            </section>
          ) : (
            <>
              <div className="collab-ai-modal-actions">
                <div className="collab-search-box">
                  <Search size={20} aria-hidden="true" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search AI generated problems..."
                  />
                </div>

                <button type="button" className="collab-ai-generate-button" onClick={() => setIsGenerateMode(true)}>
                  <Wand2 size={16} aria-hidden="true" />
                  <span>Generate problem according to your needs</span>
                </button>
              </div>

              {debouncedSearchQuery.length === 0 && problems.length === 0 ? (
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
              ) : (
                <>
                  {isFetching && page === 1 ? (
                    <LoadingSpinner className="collab-modal-state" label="Loading AI problems" />
                  ) : isError ? (
                    <div className="collab-modal-state">
                      <p>{getErrorMessage(error, 'AI problems could not be loaded')}</p>
                      <button type="button" onClick={() => refetch()}>Retry</button>
                    </div>
                  ) : problems.length > 0 ? (
                    <DSAProblemList
                      title="AI Generated Problems"
                      problems={problems}
                      roomId={roomId}
                      addedProblemIds={[...addedProblemIds, ...locallyAddedProblemIds]}
                      onProblemAdded={handleProblemAdded}
                    />
                  ) : (
                    <div className="collab-empty-box">No AI generated problems found.</div>
                  )}

                  {hasMore && (
                    <button type="button" className="collab-load-more" onClick={() => setPage((currentPage) => currentPage + 1)} disabled={isFetching}>
                      {isFetching ? <LoadingSpinner inline label="Loading AI problems" size={16} /> : 'Load more'}
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AIProblemModal;
