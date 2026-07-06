import multer from 'multer';

import env from '../../config/env.js';
import { BadRequestError } from '../../shared/errors/index.js';
import { ALLOWED_IMAGE_MIME_TYPES } from './media.constants.js';

const imageFileFilter: multer.Options['fileFilter'] = (_req, file, callback) => {
  if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    callback(null, true);
    return;
  }

  callback(new BadRequestError('Please attach only image files!'));
};

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MEDIA_MAX_FILE_SIZE_BYTES,
    files: env.MEDIA_POST_IMAGE_MAX_COUNT,
  },
  fileFilter: imageFileFilter,
});

const uploadProfilePicture = imageUpload.single('profilePicture');
const uploadPostImages = imageUpload.array('images', env.MEDIA_POST_IMAGE_MAX_COUNT);

export { imageUpload, uploadPostImages, uploadProfilePicture };
