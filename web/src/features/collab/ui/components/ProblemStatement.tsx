import { FileText } from 'lucide-react';
import { memo } from 'react';

import type { RoomProblem } from '@/features/collab/model/collab.types';

type ProblemStatementProps = {
  problem: RoomProblem | null;
};

const ProblemStatement = ({ problem }: ProblemStatementProps) => {
  if (!problem) {
    return (
      <div className="collab-empty-editor">
        <FileText size={54} aria-hidden="true" />
        <p>Select a problem to view details</p>
      </div>
    );
  }

  const problemDetails = problem.problemId;
  const publicTestCases = problemDetails.testCases || [];
  const constraints = problemDetails.constraints || [];

  return (
    <article className="collab-problem-statement">
      <header>
        <div>
          <p>Problem Details</p>
          <h1>{problemDetails.title}</h1>
        </div>
        <span>{problemDetails.difficulty}</span>
      </header>

      <section>
        <h3>Problem Description</h3>
        <p>{problemDetails.description}</p>
      </section>

      {publicTestCases.length > 0 && (
        <section>
          <h3>Examples</h3>
          {publicTestCases.map((testCase, index) => (
            <div key={testCase._id || index} className="collab-example-card">
              <strong>Example {index + 1}:</strong>
              <p><b>Input:</b> <code>{testCase.input}</code></p>
              <p><b>Output:</b> <code>{testCase.expectedOutput}</code></p>
              {testCase.explanation && <p>{testCase.explanation}</p>}
            </div>
          ))}
        </section>
      )}

      {constraints.length > 0 && (
        <section>
          <h3>Constraints</h3>
          <ul>
            {constraints.map((constraint, index) => (
              <li key={`${constraint}_${index}`}>
                <span>*</span>
                <code>{constraint}</code>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
};

export default memo(ProblemStatement);
