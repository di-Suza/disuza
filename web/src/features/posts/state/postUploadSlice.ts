import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type PostUploadStatus = 'uploading' | 'processing' | 'failed';

export type PostUploadTask = {
  clientUploadId: string;
  caption?: string;
  error?: string;
  mediaCount: number;
  postId?: string;
  progress: number;
  status: PostUploadStatus;
  createdAt: string;
};

type PostUploadState = {
  tasks: PostUploadTask[];
};

const initialState: PostUploadState = {
  tasks: [],
};

const postUploadSlice = createSlice({
  name: 'postUploads',
  initialState,
  reducers: {
    addPendingPostUpload: (state, action: PayloadAction<Pick<PostUploadTask, 'caption' | 'clientUploadId' | 'mediaCount'>>) => {
      const exists = state.tasks.some((task) => task.clientUploadId === action.payload.clientUploadId);
      if (exists) return;

      state.tasks.unshift({
        ...action.payload,
        progress: 2,
        status: 'uploading',
        createdAt: new Date().toISOString(),
      });
    },
    attachQueuedPostUpload: (state, action: PayloadAction<{ clientUploadId?: string; postId: string; progress?: number }>) => {
      const task = state.tasks.find((item) => (
        (action.payload.clientUploadId && item.clientUploadId === action.payload.clientUploadId)
        || item.postId === action.payload.postId
      ));

      if (!task) return;
      task.postId = action.payload.postId;
      task.status = 'processing';
      task.progress = Math.max(task.progress, action.payload.progress ?? 8);
    },
    updatePostUploadProgress: (state, action: PayloadAction<{ clientUploadId?: string; postId?: string; progress: number; status?: PostUploadStatus }>) => {
      const task = state.tasks.find((item) => (
        (action.payload.clientUploadId && item.clientUploadId === action.payload.clientUploadId)
        || (action.payload.postId && item.postId === action.payload.postId)
      ));

      if (!task) return;
      task.progress = Math.max(task.progress, Math.min(100, Math.max(0, action.payload.progress)));
      if (action.payload.status) task.status = action.payload.status;
    },
    completePostUpload: (state, action: PayloadAction<{ clientUploadId?: string; postId?: string }>) => {
      state.tasks = state.tasks.filter((item) => !(
        (action.payload.clientUploadId && item.clientUploadId === action.payload.clientUploadId)
        || (action.payload.postId && item.postId === action.payload.postId)
      ));
    },
    failPostUpload: (state, action: PayloadAction<{ clientUploadId?: string; error?: string; postId?: string }>) => {
      const task = state.tasks.find((item) => (
        (action.payload.clientUploadId && item.clientUploadId === action.payload.clientUploadId)
        || (action.payload.postId && item.postId === action.payload.postId)
      ));

      if (!task) return;
      task.status = 'failed';
      task.progress = 100;
      task.error = action.payload.error || 'Upload failed.';
    },
  },
});

export const {
  addPendingPostUpload,
  attachQueuedPostUpload,
  completePostUpload,
  failPostUpload,
  updatePostUploadProgress,
} = postUploadSlice.actions;

export default postUploadSlice.reducer;
