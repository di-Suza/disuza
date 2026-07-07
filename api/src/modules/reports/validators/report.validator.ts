import { body, query } from 'express-validator';
import mongoose from 'mongoose';

import { REPORT_REASONS, REPORT_TARGET_MODELS } from '../report.model.js';

const targetIdRule = body('targetId')
  .custom((value) => mongoose.Types.ObjectId.isValid(String(value)))
  .withMessage('targetId must be a valid MongoDB ObjectId');

const reportRules = [
  targetIdRule,
  body('onModel')
    .isIn(REPORT_TARGET_MODELS)
    .withMessage('Invalid report target type! Must be Post, User, or Message.'),
  body('reason')
    .isIn(REPORT_REASONS)
    .withMessage('Invalid report reason.'),
  body('description')
    .isString()
    .withMessage('Description is required!')
    .trim()
    .notEmpty()
    .withMessage('Description is required!')
    .isLength({ max: 500 })
    .withMessage('Description is too long! (Max 500 characters)'),
];

const postReportRules = [
  targetIdRule,
  body('reason')
    .isIn(REPORT_REASONS)
    .withMessage('Invalid report reason.'),
  body('description')
    .isString()
    .withMessage('Description is required!')
    .trim()
    .notEmpty()
    .withMessage('Description is required!')
    .isLength({ max: 500 })
    .withMessage('Description is too long! (Max 500 characters)'),
];

const getMyReportsRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be greater than 0')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20')
    .toInt(),
];

export { getMyReportsRules, postReportRules, reportRules };