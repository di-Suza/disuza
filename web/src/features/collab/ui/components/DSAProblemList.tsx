import type { Problem } from '@/features/collab/model/collab.types';
import DSAProblemAccordion from './DSAProblemAccordion';

type DSAProblemListProps = {
  problems: Problem[];
  roomId?: string;
  addedProblemIds?: string[];
  onProblemAdded?: (problemId: string) => void;
};

const DSAProblemList = ({ problems, roomId, addedProblemIds = [], onProblemAdded }: DSAProblemListProps) => {
  const addedProblemIdSet = new Set(addedProblemIds);

  return (
    <div className="collab-dsa-list">
      <h2>DSA Problems</h2>
      {problems.map((problem) => (
        <DSAProblemAccordion
          key={problem._id}
          problem={addedProblemIdSet.has(problem._id) ? { ...problem, isAdded: true } : problem}
          roomId={roomId}
          onProblemAdded={onProblemAdded}
        />
      ))}
    </div>
  );
};

export default DSAProblemList;
