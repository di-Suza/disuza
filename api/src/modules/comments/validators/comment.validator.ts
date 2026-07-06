import { body, query } from 'express-validator';

import { mongoIdParam } from '../../../shared/validators/common.js';

const mongoIdBody = (field: string) => body(field)
  .custom((value) => /^[a-f\d]{24}$/i.test(String(value)))
  .withMessage(`${field} must be a valid MongoDB ObjectId`);

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
];

const createCommentRules = [
  mongoIdBody('postId'),
  body('parentCommentId')
    .optional()
    .custom((value) => /^[a-f\d]{24}$/i.test(String(value)))
    .withMessage('parentCommentId must be a valid MongoDB ObjectId'),
  body('comment')
    .isString()
    .withMessage('Comment should be proper string!')
    .trim()
    .notEmpty()
    .withMessage('Comment cannot be empty!')
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters'),
];

const getCommentsRules = [
  mongoIdParam('postId'),
  ...pageQueryRules,
];

const getRepliesRules = [
  mongoIdParam('commentId'),
  ...pageQueryRules,
];

const deleteCommentRules = [
  mongoIdBody('postId'),
  mongoIdBody('commentId'),
];

export { createCommentRules, deleteCommentRules, getCommentsRules, getRepliesRules };