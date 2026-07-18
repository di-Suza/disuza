import type { ChatMessage, ChatUser } from '@/features/messages/model/chat.types';

export type ProblemDifficulty = 'Easy' | 'Medium' | 'Hard';
export type ProblemLanguage = 'javascript' | 'python' | 'cpp';
export type RoomProblemStatus = 'pending' | 'solving' | 'solved' | 'attempted';

export type ProblemTestCase = {
  _id?: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  explanation?: string;
};

export type Problem = {
  _id: string;
  title: string;
  description: string;
  difficulty: ProblemDifficulty;
  tags: string[];
  testCases: ProblemTestCase[];
  constraints?: string[];
  isAdded?: boolean;
};

export type RoomProblem = {
  _id: string;
  roomId: string;
  problemId: Problem;
  status: RoomProblemStatus;
  currentCode: string;
  language: ProblemLanguage;
  testCasesPassed: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CollabStatus =
  | {
    status: 'blocked';
    isBlocked?: boolean;
    hasBlockedMe?: boolean;
    message: string;
  }
  | {
    status: 'accepted';
    roomId: string;
    acceptedNotificationId?: string | null;
    message: string;
  }
  | {
    status: 'pending';
    role: 'sender' | 'recipient';
    requestId: string;
    message: string;
  }
  | {
    status: 'none';
    message: string;
  };

export type CollabParticipant = ChatUser & {
  roomPresence?: 'in_room' | 'not_in_room';
};

export type CollabRoomDetails = {
  _id: string;
  conversationId?: {
    _id?: string;
    participants?: CollabParticipant[];
  };
  owner?: CollabParticipant;
  roomType: 'shared' | 'personal';
  accessMode?: 'shared' | 'personal' | 'solo_due_to_block';
  realtimeDisabled?: boolean;
  currentlySelectedProblem?: RoomProblem | null;
  updatedAt?: string;
};

export type CollabRoomResponse = {
  success: boolean;
  message: string;
  data: {
    roomDetails: CollabRoomDetails;
    problems: RoomProblem[];
  };
};

export type CollabStatusResponse = {
  success: boolean;
  message: string;
  data: CollabStatus;
};

export type CollabRoomListItem = {
  _id: string;
  roomType: 'shared' | 'personal';
  accessMode?: string;
  realtimeDisabled?: boolean;
  title: string;
  subtitle: string;
  otherUser?: ChatUser;
  currentlySelectedProblem?: RoomProblem | null;
  updatedAt?: string;
  problemsCount?: number;
  solvedCount?: number;
};

export type CollabRoomsResponse = {
  success: boolean;
  message: string;
  data: {
    rooms: CollabRoomListItem[];
  };
};

export type ProblemSearchResponse = {
  success: boolean;
  message: string;
  data: Problem[];
  hasMore: boolean;
};

export type ProblemMutationResponse = {
  success: boolean;
  message: string;
  data: RoomProblem | null;
};

export type CodeRunResultCase = {
  index: number;
  input: string;
  expectedOutput: string;
  output: string;
  error?: string;
  passed: boolean;
  isHidden: boolean;
  time?: string;
  memory?: number;
};

export type CodeRunResult = {
  testCases: CodeRunResultCase[];
  passedCount: number;
  totalCount: number;
  allPassed: boolean;
  roomProblemId?: string;
  status?: RoomProblemStatus;
};

export type RunProblemResponse = {
  success: boolean;
  message: string;
  data: {
    result: CodeRunResult;
    roomProblem: RoomProblem;
  };
};

export type RoomSyncPayload = {
  type: 'ADD_PROBLEM' | 'SELECT_PROBLEM' | 'UNSELECT_PROBLEM' | 'CODE_CHANGE' | 'YJS_CODE_UPDATE' | 'LANG_CHANGE' | 'RUN_COMPLETED';
  roomId: string;
  data?: Record<string, unknown>;
};

export type RoomSyncUser = {
  id?: string;
  _id?: string;
  userName?: string;
};

export type CodeExecutionPayload = {
  status: 'running' | 'completed' | 'failed';
  roomId: string;
  roomProblemId: string;
  result?: CodeRunResult;
  roomProblem?: RoomProblem;
  error?: string;
  triggeredBy?: ChatUser;
};

export type RoomChatPanelProps = {
  conversationId: string | null;
  otherUser: string | null;
  roomId?: string;
};

export type CollabChatMessage = ChatMessage;
