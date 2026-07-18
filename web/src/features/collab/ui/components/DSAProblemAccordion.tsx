import { CheckCircle, ChevronDown, ChevronUp, Code2, Plus, Tag, Zap } from 'lucide-react';
import { useState } from 'react';

import { useAddProblemToRoomMutation } from '@/features/collab/api/problem.api';
import type { Problem } from '@/features/collab/model/collab.types';
import { cn } from '@/shared/utils/cn';

type DSAProblemAccordionProps = {
  problem: Problem;
  roomId?: string;
  onProblemAdded?: (problemId: string) => void;
};

const getDifficultyClass = (difficulty?: string) => {
  if (difficulty === 'Easy') return 'is-easy';
  if (difficulty === 'Medium') return 'is-medium';
  if (difficulty === 'Hard') return 'is-hard';
  return '';
};

const DSAProblemAccordion = ({ problem, roomId, onProblemAdded }: DSAProblemAccordionProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [addProblemToRoom, { isLoading: isAdding }] = useAddProblemToRoomMutation();
  const isAdded = Boolean(problem.isAdded);

  const toggleProblemDetails = () => {
    setIsOpen((value) => !value);
  };

  const handleSummaryKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    toggleProblemDetails();
  };

  const handleAddProblem = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isAdded || isAdding || !roomId) return;

    try {
      await addProblemToRoom({ roomId, problemId: problem._id }).unwrap();
      onProblemAdded?.(problem._id);
    } catch {
      // The modal keeps the previous state when the add request fails.
    }
  };

  return (
    <article className="collab-dsa-card">
      <div className="collab-dsa-card__header">
        <div
          className="collab-dsa-card__summary"
          role="button"
          tabIndex={0}
          onClick={toggleProblemDetails}
          onKeyDown={handleSummaryKeyDown}
        >
          <div className="collab-dsa-card__title">
            <h3>{problem.title}</h3>
            <span className={cn('collab-difficulty', getDifficultyClass(problem.difficulty))}>{problem.difficulty}</span>
          </div>

          <div className="collab-dsa-tags">
            {problem.tags.map((tag) => (
              <span key={tag}>
                <Tag size={12} aria-hidden="true" />
                {tag}
              </span>
            ))}
          </div>

          <p>{problem.description}</p>
        </div>

        <div className="collab-dsa-card__actions">
          <button
            type="button"
            className={cn('collab-dsa-add-button', isAdded && 'is-added')}
            onClick={handleAddProblem}
            disabled={isAdded || isAdding}
          >
            {isAdded ? 'Added' : isAdding ? 'Adding' : (
              <>
                <Plus size={15} aria-hidden="true" />
                <span>Add</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="collab-dsa-expand-button"
            onClick={toggleProblemDetails}
            aria-label={isOpen ? 'Collapse problem details' : 'Expand problem details'}
            aria-expanded={isOpen}
          >
            {isOpen ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="collab-dsa-card__body">
          <section>
            <h4><Code2 size={16} aria-hidden="true" />Problem Description</h4>
            <p>{problem.description}</p>
          </section>

          <section>
            <h4><CheckCircle size={16} aria-hidden="true" />Test Cases</h4>
            {problem.testCases.map((testCase, index) => (
              <div key={testCase._id || index} className="collab-testcase-card">
                <strong>Test Case {index + 1}</strong>
                {testCase.isHidden && <em>Hidden</em>}
                <p><b>Input:</b> <code>{testCase.input}</code></p>
                <p><b>Expected Output:</b> <code>{testCase.expectedOutput}</code></p>
              </div>
            ))}
          </section>

          <footer>
            <span><Zap size={14} aria-hidden="true" />Difficulty: {problem.difficulty}</span>
            <span><Tag size={14} aria-hidden="true" />{problem.tags.length} Tags</span>
            <span><CheckCircle size={14} aria-hidden="true" />{problem.testCases.length} Test Cases</span>
          </footer>
        </div>
      )}
    </article>
  );
};

export default DSAProblemAccordion;
