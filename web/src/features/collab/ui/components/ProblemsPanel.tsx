import { CheckCircle, Clock, Code2, FileCode, PanelLeftClose, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useSelectProblemMutation } from '@/features/collab/api/problem.api';
import type { RoomProblem } from '@/features/collab/model/collab.types';
import { useToast } from '@/shared/hooks/useToast';
import { cn } from '@/shared/utils/cn';
import SelectProblemModal from './SelectProblemModal';

type ProblemsPanelProps = {
  selectedProblem: RoomProblem | null;
  problems: RoomProblem[];
  roomId?: string;
  onCollapse: () => void;
};

const getDifficultyClass = (difficulty?: string) => {
  if (difficulty === 'Easy') return 'is-easy';
  if (difficulty === 'Medium') return 'is-medium';
  if (difficulty === 'Hard') return 'is-hard';
  return '';
};

const getStatusIcon = (status?: string) => {
  if (status === 'solved') return <CheckCircle size={16} aria-hidden="true" />;
  if (status === 'attempted') return <Clock size={16} aria-hidden="true" />;
  if (status === 'solving') return <Code2 size={16} aria-hidden="true" />;
  return null;
};

const ProblemsPanel = ({ selectedProblem, problems, roomId, onCollapse }: ProblemsPanelProps) => {
  const navigate = useNavigate();
  const [isSelectProblemModalOpen, setIsSelectProblemModalOpen] = useState(false);
  const [selectProblem, { isLoading: isSelecting }] = useSelectProblemMutation();
  const { showError } = useToast();
  const addedProblemIds = problems.map((problem) => problem.problemId._id);

  const handleSelectProblem = async (roomProblemId: string) => {
    if (!roomId || !roomProblemId || isSelecting) return;

    try {
      await selectProblem({ roomId, roomProblemId }).unwrap();
    } catch {
      showError('Problem select nahi ho payi. Please try again.');
    }
  };

  return (
    <>
      <aside className="collab-problems-panel">
        <header className="collab-panel-header">
          <div>
            <p>Room Problems</p>
            <h2>Problems</h2>
          </div>
          <div className="collab-panel-header__actions">
            <span>{problems.length}</span>
            <button type="button" className="collab-icon-button" onClick={onCollapse} aria-label="Hide problems panel">
              <PanelLeftClose size={15} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="collab-problems-panel__actions">
          <button type="button" onClick={() => setIsSelectProblemModalOpen(true)}>
            <Plus size={16} aria-hidden="true" />
            <span>Add</span>
          </button>
          <button type="button">
            <Sparkles size={16} aria-hidden="true" />
            <span>AI</span>
          </button>
        </div>

        <div className="collab-problems-list">
          {problems.length > 0 ? problems.map((problem) => {
            const problemDetails = problem.problemId;
            const isSelected = selectedProblem?._id === problem._id;

            return (
              <button
                key={problem._id}
                type="button"
                className={cn('collab-problem-card', isSelected && 'is-selected')}
                onClick={() => handleSelectProblem(problem._id)}
              >
                <FileCode size={20} aria-hidden="true" />
                <span>
                  <strong>{problemDetails.title}</strong>
                  <em className={getDifficultyClass(problemDetails.difficulty)}>{problemDetails.difficulty}</em>
                </span>
                <i className={cn('collab-problem-card__status', problem.status)}>{getStatusIcon(problem.status)}</i>
              </button>
            );
          }) : (
            <div className="collab-empty-box">Please add some problems first.</div>
          )}
        </div>

        <footer className="collab-problems-panel__footer">
          <button type="button" onClick={() => navigate(-1)}>Leave Room</button>
        </footer>
      </aside>

      <SelectProblemModal
        isOpen={isSelectProblemModalOpen}
        onClose={() => setIsSelectProblemModalOpen(false)}
        roomId={roomId}
        addedProblemIds={addedProblemIds}
      />
    </>
  );
};

export default ProblemsPanel;
