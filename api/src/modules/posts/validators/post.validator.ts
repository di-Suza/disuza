import type { Request } from 'express';
import { body, query } from 'express-validator';

import { mongoIdParam } from '../../../shared/validators/common.js';

type FileFieldMap = Record<string, Express.Multer.File[]>;

const parseJsonField = (value: unknown) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    throw new Error('Invalid JSON payload');
  }
};

const toBoolean = (value: unknown) => value === true || value === 'true';

const getUploadedPostMediaFiles = (req: Request): Express.Multer.File[] => {
  if (!req.files) return [];
  if (Array.isArray(req.files)) return req.files;

  const fileFields = req.files as FileFieldMap;

  return [
    ...(fileFields.media || []),
    ...(fileFields.images || []),
  ];
};

const settingsRules = [
  body('settings')
    .optional()
    .customSanitizer(parseJsonField)
    .custom((value) => typeof value === 'object' && value !== null && !Array.isArray(value))
    .withMessage('Settings must be a valid object'),
  body('settings.hideLikesCount')
    .optional()
    .customSanitizer(toBoolean)
    .isBoolean()
    .withMessage('hideLikesCount must be a boolean'),
  body('settings.commentsDisabled')
    .optional()
    .customSanitizer(toBoolean)
    .isBoolean()
    .withMessage('commentsDisabled must be a boolean'),
];

const projectLinkRules = [
  body('projectLinks')
    .optional()
    .customSanitizer(parseJsonField)
    .custom((value) => typeof value === 'object' && value !== null && !Array.isArray(value))
    .withMessage('Project links must be a valid object'),
  body('projectLinks.liveDemoUrl')
    .optional()
    .isString()
    .withMessage('Live demo URL must be a string')
    .trim(),
  body('projectLinks.repositoryUrl')
    .optional()
    .isString()
    .withMessage('Repository URL must be a string')
    .trim(),
];

const linkRules = [
  body('links')
    .optional()
    .customSanitizer(parseJsonField)
    .isArray({ max: 8 })
    .withMessage('Links must be an array with up to 8 items'),
  body('links.*.label')
    .optional()
    .isString()
    .withMessage('Link label must be a string')
    .trim()
    .isLength({ max: 80 })
    .withMessage('Link label cannot exceed 80 characters'),
  body('links.*.url')
    .optional()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Link URL must be a valid http(s) URL')
    .trim(),
];

const codeSnippetRules = [
  body('codeSnippet')
    .optional({ nullable: true })
    .customSanitizer(parseJsonField)
    .custom((value) => value === undefined || value === null || (typeof value === 'object' && !Array.isArray(value)))
    .withMessage('Code snippet must be a valid object'),
  body('codeSnippet.language')
    .optional()
    .isString()
    .withMessage('Code language must be a string')
    .trim()
    .isLength({ max: 40 })
    .withMessage('Code language cannot exceed 40 characters'),
  body('codeSnippet.code')
    .optional()
    .isString()
    .withMessage('Code must be a string')
    .trim()
    .isLength({ max: 8000 })
    .withMessage('Code cannot exceed 8000 characters'),
];

const hashtagRules = [
  body('hashtags')
    .optional()
    .customSanitizer(parseJsonField)
    .isArray({ max: 12 })
    .withMessage('Hashtags must be an array with up to 12 items'),
  body('hashtags.*')
    .optional()
    .isString()
    .withMessage('Each hashtag must be a string')
    .trim()
    .isLength({ max: 40 })
    .withMessage('Hashtags cannot exceed 40 characters'),
];

const mediaOrderRules = [
  body('mediaOrder')
    .optional()
    .customSanitizer(parseJsonField)
    .isArray({ max: 10 })
    .withMessage('mediaOrder must be an array with up to 10 items'),
  body('mediaOrder.*.source')
    .optional()
    .isIn(['existing', 'upload', 'new'])
    .withMessage('mediaOrder source must be existing, upload, or new'),
  body('mediaOrder.*.fileId')
    .optional()
    .isString()
    .withMessage('mediaOrder fileId must be a string')
    .trim(),
  body('mediaOrder.*.uploadIndex')
    .optional()
    .isInt({ min: 0 })
    .withMessage('mediaOrder uploadIndex must be 0 or greater')
    .toInt(),
];

const existingMediaRules = [
  body('media')
    .optional()
    .customSanitizer(parseJsonField)
    .isArray({ max: 10 })
    .withMessage('media must be an array with up to 10 items'),
  body('media.*.fileId')
    .optional()
    .isString()
    .withMessage('media fileId must be a string')
    .trim(),
  body('images')
    .optional()
    .customSanitizer(parseJsonField)
    .isArray({ max: 10 })
    .withMessage('images must be an array with up to 10 items'),
  body('images.*.fileId')
    .optional()
    .isString()
    .withMessage('images fileId must be a string')
    .trim(),
];

const createPostRules = [
  body('caption')
    .optional()
    .isString()
    .withMessage('Caption must be a string')
    .trim()
    .isLength({ max: 2200 })
    .withMessage('Caption cannot exceed 2200 characters'),
  body('isProjectPost')
    .optional()
    .customSanitizer(toBoolean)
    .isBoolean()
    .withMessage('isProjectPost must be a boolean'),
  ...settingsRules,
  ...projectLinkRules,
  ...linkRules,
  ...codeSnippetRules,
  ...hashtagRules,
  ...mediaOrderRules,
  body()
    .custom((value, { req }) => Boolean(
      value.caption
      || value.codeSnippet?.code
      || value.links?.length
      || value.hashtags?.length
      || getUploadedPostMediaFiles(req as Request).length > 0
      || (value.isProjectPost && (value.projectLinks?.liveDemoUrl || value.projectLinks?.repositoryUrl)),
    ))
    .withMessage('Post must include text, media, code, links, hashtags, or project links.'),
  body()
    .custom((value) => {
      if (!value.isProjectPost) return true;
      return Boolean(value.projectLinks?.liveDemoUrl && value.projectLinks?.repositoryUrl);
    })
    .withMessage('Project post cannot be created without URLs!'),
];

const updatePostRules = [
  mongoIdParam('postId'),
  body('caption')
    .optional()
    .isString()
    .withMessage('Caption must be a string')
    .trim()
    .isLength({ max: 2200 })
    .withMessage('Caption cannot exceed 2200 characters'),
  ...settingsRules,
  ...projectLinkRules,
  ...linkRules,
  ...codeSnippetRules,
  ...hashtagRules,
  ...mediaOrderRules,
  ...existingMediaRules,
  body()
    .custom((value, { req }) => (
      Object.prototype.hasOwnProperty.call(value, 'caption')
      || Object.prototype.hasOwnProperty.call(value, 'settings')
      || Object.prototype.hasOwnProperty.call(value, 'projectLinks')
      || Object.prototype.hasOwnProperty.call(value, 'links')
      || Object.prototype.hasOwnProperty.call(value, 'codeSnippet')
      || Object.prototype.hasOwnProperty.call(value, 'hashtags')
      || Object.prototype.hasOwnProperty.call(value, 'mediaOrder')
      || Object.prototype.hasOwnProperty.call(value, 'media')
      || Object.prototype.hasOwnProperty.call(value, 'images')
      || getUploadedPostMediaFiles(req as Request).length > 0
    ))
    .withMessage('Please provide post data to update.'),
];

const postIdParamRules = [mongoIdParam('postId')];

const postAnalyticsRules = [
  mongoIdParam('postId'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be greater than 0')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Limit must be between 1 and 30')
    .toInt(),
  query('section')
    .optional()
    .isIn(['likes', 'comments', 'reposts', 'feedbacks'])
    .withMessage('Analytics section must be likes, comments, reposts, or feedbacks'),
];

const trackPostLinkClickRules = [
  mongoIdParam('postId'),
  body('linkKey')
    .isString()
    .withMessage('Link key must be a string')
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage('Link key must be between 1 and 80 characters'),
];

const pageQueryRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be greater than 0')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Limit must be between 1 and 30')
    .toInt(),
  query('type')
    .optional()
    .isIn(['all', 'following'])
    .withMessage('Feed type must be all or following'),
];

export { createPostRules, pageQueryRules, postAnalyticsRules, postIdParamRules, trackPostLinkClickRules, updatePostRules };
