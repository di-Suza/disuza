import type { Problem } from '@/features/collab/model/collab.types';
import DSAProblemAccordion from './DSAProblemAccordion';

type DSAProblemListProps = {
  problems: Problem[];
  roomId?: string;
};

const DSAProblemList = ({ problems, roomId }: DSAProblemListProps) => (
  <div className="collab-dsa-list">
    <h2>DSA Problems</h2>
    {problems.map((problem) => (
      <DSAProblemAccordion key={problem._id} problem={problem} roomId={roomId} />
    ))}
  </div>
);

export default DSAProblemList;
