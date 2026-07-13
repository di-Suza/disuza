import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

const PROBLEM_DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
const PROBLEM_LANGUAGES = ['javascript', 'python', 'cpp'] as const;

type ProblemDifficulty = typeof PROBLEM_DIFFICULTIES[number];
type ProblemLanguage = typeof PROBLEM_LANGUAGES[number];

type ProblemTestCase = {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  explanation?: string;
};

type ProblemBoilerplate = Partial<Record<ProblemLanguage, string>>;

type Problem = {
  title: string;
  description: string;
  difficulty: ProblemDifficulty;
  tags: string[];
  isAIGenerated: boolean;
  createdBy?: Types.ObjectId;
  testCases: ProblemTestCase[];
  boilerplate: ProblemBoilerplate;
  constraints: string[];
  createdAt: Date;
  updatedAt: Date;
};

type ProblemDocument = HydratedDocument<Problem>;
type ProblemModel = Model<Problem>;

const problemSchema = new mongoose.Schema<Problem, ProblemModel>(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true },
    difficulty: {
      type: String,
      enum: PROBLEM_DIFFICULTIES,
      default: 'Easy',
      index: true,
    },
    tags: [{ type: String, trim: true, index: true }],
    isAIGenerated: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    testCases: [
      {
        input: { type: String, required: true },
        expectedOutput: { type: String, required: true },
        isHidden: { type: Boolean, default: false },
        explanation: { type: String },
      },
    ],
    boilerplate: {
      javascript: { type: String, default: 'function solution() {\n\n}' },
      python: { type: String, default: 'def solution():\n    pass' },
      cpp: { type: String, default: 'int main() {\n    return 0;\n}' },
    },
    constraints: [{ type: String }],
  },
  { timestamps: true },
);

problemSchema.index({ title: 'text', tags: 'text' });

const ProblemModel = mongoose.models.Problem as ProblemModel
  || mongoose.model<Problem, ProblemModel>('Problem', problemSchema, 'problems');

export {
  PROBLEM_DIFFICULTIES,
  PROBLEM_LANGUAGES,
  type Problem,
  type ProblemBoilerplate,
  type ProblemDifficulty,
  type ProblemDocument,
  type ProblemLanguage,
  type ProblemTestCase,
};
export default ProblemModel;
