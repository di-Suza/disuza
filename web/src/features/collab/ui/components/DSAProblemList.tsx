import { memo, useMemo } from 'react';

import type { Problem } from '@/features/collab/model/collab.types';
import DSAProblemAccordion from './DSAProblemAccordion';

const EMPTY_ADDED_PROBLEM_IDS: string[] = [];

type DSAProblemListProps = {
  problems: Problem[];
  title?: string;
  roomId?: string;
  addedProblemIds?: string[];
  onProblemAdded?: (problemId: string) => void;
};

const DSAProblemList = ({ problems, title = 'DSA Problems', roomId, addedProblemIds = EMPTY_ADDED_PROBLEM_IDS, onProblemAdded }: DSAProblemListProps) => {
  const addedProblemIdSet = useMemo(() => new Set(addedProblemIds), [addedProblemIds]);
  const problemsWithAddedState = useMemo(() => problems.map((problem) => (
    addedProblemIdSet.has(problem._id) ? { ...problem, isAdded: true } : problem
  )), [addedProblemIdSet, problems]);

  return (
    <div className="collab-dsa-list">
      <h2>{title}</h2>
      {problemsWithAddedState.map((problem) => (
        <DSAProblemAccordion
          key={problem._id}
          problem={problem}
          roomId={roomId}
          onProblemAdded={onProblemAdded}
        />
      ))}
    </div>
  );
};

export default memo(DSAProblemList);
