import { CheckCircle, Clock, Code2, FileCode, Loader2, PanelLeftClose, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useRemoveProblemFromRoomMutation, useSelectProblemMutation } from '@/features/collab/api/problem.api';
import type { RoomProblem } from '@/features/collab/model/collab.types';
import { useToast } from '@/shared/hooks/useToast';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import '@/shared/ui/Spinner.css';
import { cn } from '@/shared/utils/cn';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import AIProblemModal from './AIProblemModal';
import SelectProblemModal from './SelectProblemModal';

type ProblemsPanelProps = {
  selectedProblem: RoomProblem | null;
  problems: RoomProblem[];
  roomId?: string;
  isSelectionLocked?: boolean;
  onCollapse: () => void;
};

type ProblemContextMenu = {
  roomProblemId: string;
  title: string;
  x: number;
  y: number;
};

const getDifficultyClass = (difficulty?: string) => {
  if (difficulty === 'Easy') return 'is-easy';
  if (difficulty === 'Medium') return 'is-medium';
  if (difficulty === 'Hard') return 'is-hard';
  return '';
};

const getStatusIcon = (status?: string, executionStatus?: string) => {
  if (executionStatus === 'running') return <Loader2 className="spin" size={16} aria-hidden="true" />;
  if (status === 'solved') return <CheckCircle size={16} aria-hidden="true" />;
  if (status === 'attempted') return <Clock size={16} aria-hidden="true" />;
  if (status === 'solving') return <Code2 size={16} aria-hidden="true" />;
  return null;
};

const ProblemsPanel = ({ selectedProblem, problems, roomId, isSelectionLocked = false, onCollapse }: ProblemsPanelProps) => {
  const navigate = useNavigate();
  const [isSelectProblemModalOpen, setIsSelectProblemModalOpen] = useState(false);
  const [isAIProblemModalOpen, setIsAIProblemModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ProblemContextMenu | null>(null);
  const [problemToRemove, setProblemToRemove] = useState<ProblemContextMenu | null>(null);
  const [selectProblem, { isLoading: isSelecting }] = useSelectProblemMutation();
  const [removeProblemFromRoom, { isLoading: isRemoving }] = useRemoveProblemFromRoomMutation();
  const { showError } = useToast();
  const addedProblemIds = problems.map((problem) => problem.problemId._id);

  useEffect(() => {
    if (!contextMenu) return;

    const closeMenu = () => setContextMenu(null);
    window.addEventListener('pointerdown', closeMenu);
    window.addEventListener('scroll', closeMenu, true);

    return () => {
      window.removeEventListener('pointerdown', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [contextMenu]);

  const handleSelectProblem = async (roomProblemId: string) => {
    if (!roomId || !roomProblemId || isSelecting) return;
    if (isSelectionLocked) {
      showError('Code is running. Please wait before changing room problems.');
      return;
    }

    try {
      await selectProblem({ roomId, roomProblemId }).unwrap();
    } catch (error) {
      showError(getErrorMessage(error, 'Problem could not be selected. Please try again.'));
    }
  };

  const handleContextMenu = (event: MouseEvent<HTMLButtonElement>, problem: RoomProblem) => {
    event.preventDefault();
    if (isSelectionLocked) {
      showError('Code is running. Please wait before removing room problems.');
      return;
    }

    setContextMenu({
      roomProblemId: problem._id,
      title: problem.problemId.title,
      x: Math.min(event.clientX, window.innerWidth - 240),
      y: Math.min(event.clientY, window.innerHeight - 72),
    });
  };

  const handleConfirmRemove = async () => {
    if (!roomId || !problemToRemove) return;

    try {
      await removeProblemFromRoom({ roomId, roomProblemId: problemToRemove.roomProblemId }).unwrap();
      setProblemToRemove(null);
    } catch (error) {
      showError(getErrorMessage(error, 'Problem could not be removed. Please try again.'));
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
          <button type="button" onClick={() => setIsSelectProblemModalOpen(true)} disabled={isSelectionLocked}>
            <Plus size={16} aria-hidden="true" />
            <span>Add</span>
          </button>
          <button type="button" onClick={() => setIsAIProblemModalOpen(true)} disabled={isSelectionLocked}>
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
                className={cn('collab-problem-card', isSelected && 'is-selected', isSelectionLocked && 'is-locked')}
                aria-disabled={isSelectionLocked}
                onClick={() => handleSelectProblem(problem._id)}
                onContextMenu={(event) => handleContextMenu(event, problem)}
              >
                <FileCode size={20} aria-hidden="true" />
                <span>
                  <strong>{problemDetails.title}</strong>
                  <span className="collab-problem-card__meta">
                    <em className={getDifficultyClass(problemDetails.difficulty)}>{problemDetails.difficulty}</em>
                    {problemDetails.isAIGenerated && (
                      <small>
                        <Sparkles size={11} aria-hidden="true" />
                        AI
                      </small>
                    )}
                  </span>
                </span>
                <i className={cn('collab-problem-card__status', problem.status, problem.executionStatus)}>
                  {getStatusIcon(problem.status, problem.executionStatus)}
                </i>
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

      <AIProblemModal
        isOpen={isAIProblemModalOpen}
        onClose={() => setIsAIProblemModalOpen(false)}
        roomId={roomId}
        addedProblemIds={addedProblemIds}
      />

      {contextMenu && (
        <div
          className="collab-problem-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setProblemToRemove(contextMenu);
              setContextMenu(null);
            }}
          >
            <Trash2 size={15} aria-hidden="true" />
            Remove problem from this room
          </button>
        </div>
      )}

      <ConfirmDialog
        cancelLabel="Cancel"
        confirmLabel="Remove"
        description="Are you sure you want to remove this problem permanently? Your solution and code for this room problem will also be removed permanently."
        isBusy={isRemoving}
        isOpen={Boolean(problemToRemove)}
        onCancel={() => setProblemToRemove(null)}
        onConfirm={handleConfirmRemove}
        title={`Remove ${problemToRemove?.title || 'problem'}?`}
      />
    </>
  );
};

export default ProblemsPanel;
