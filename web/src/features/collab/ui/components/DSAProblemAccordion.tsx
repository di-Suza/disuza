import { CheckCircle, ChevronDown, ChevronUp, Code2, Plus, Tag, Zap } from 'lucide-react';
import { useState } from 'react';

import { useAddProblemToRoomMutation } from '@/features/collab/api/problem.api';
import type { Problem } from '@/features/collab/model/collab.types';
import { cn } from '@/shared/utils/cn';

type DSAProblemAccordionProps = {
  problem: Problem;
  roomId?: string;
};

const getDifficultyClass = (difficulty?: string) => {
  if (difficulty === 'Easy') return 'is-easy';
  if (difficulty === 'Medium') return 'is-medium';
  if (difficulty === 'Hard') return 'is-hard';
  return '';
};

const DSAProblemAccordion = ({ problem, roomId }: DSAProblemAccordionProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [addProblemToRoom, { isLoading: isAdding }] = useAddProblemToRoomMutation();

  const handleAddProblem = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (problem.isAdded || isAdding || !roomId) return;
    await addProblemToRoom({ roomId, problemId: problem._id }).unwrap().catch(() => undefined);
  };

  return (
    <article className="collab-dsa-card">
      <button type="button" className="collab-dsa-card__header" onClick={() => setIsOpen((value) => !value)}>
        <div>
          <div className="collab-dsa-card__title">
            <h3>{problem.title}</h3>
            <span className={cn('collab-difficulty', getDifficultyClass(problem.difficulty))}>{problem.difficulty}</span>
            <button type="button" onClick={handleAddProblem} disabled={problem.isAdded || isAdding}>
              {problem.isAdded ? 'Added' : isAdding ? 'Adding' : <Plus size={16} aria-hidden="true" />}
            </button>
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

        {isOpen ? <ChevronUp size={24} aria-hidden="true" /> : <ChevronDown size={24} aria-hidden="true" />}
      </button>

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
