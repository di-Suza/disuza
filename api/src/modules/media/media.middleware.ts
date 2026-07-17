import multer from 'multer';

import env from '../../config/env.js';
import { BadRequestError } from '../../shared/errors/index.js';
import { ALLOWED_IMAGE_MIME_TYPES, ALLOWED_MEDIA_MIME_TYPES, CHAT_ATTACHMENT_MAX_SIZE_BYTES } from './media.constants.js';

const createFileFilter = (allowedMimeTypes: string[], message: string): multer.Options['fileFilter'] => (_req, file, callback) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    callback(null, true);
    return;
  }

  callback(new BadRequestError(message));
};

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MEDIA_MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: createFileFilter(ALLOWED_IMAGE_MIME_TYPES, 'Please attach only image files!'),
});

const postMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MEDIA_MAX_VIDEO_FILE_SIZE_BYTES,
    files: env.MEDIA_POST_MEDIA_MAX_COUNT,
  },
  fileFilter: createFileFilter(ALLOWED_MEDIA_MIME_TYPES, 'Please attach only image or video files!'),
});

const chatAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: CHAT_ATTACHMENT_MAX_SIZE_BYTES,
    files: 1,
  },
});

const uploadProfilePicture = imageUpload.single('profilePicture');
const uploadPostImages = postMediaUpload.array('images', env.MEDIA_POST_MEDIA_MAX_COUNT);
const uploadPostMedia = postMediaUpload.fields([
  { name: 'media', maxCount: env.MEDIA_POST_MEDIA_MAX_COUNT },
  { name: 'images', maxCount: env.MEDIA_POST_MEDIA_MAX_COUNT },
]);
const uploadChatAttachment = chatAttachmentUpload.single('attachment');

export { chatAttachmentUpload, imageUpload, postMediaUpload, uploadChatAttachment, uploadPostImages, uploadPostMedia, uploadProfilePicture };
