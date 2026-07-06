import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';

import { mongoIdParam } from '../../../shared/validators/common.js';

const mongoIdBody = (name: string) => body(name)
  .custom((value) => mongoose.Types.ObjectId.isValid(String(value)))
  .withMessage(`${name} must be a valid MongoDB ObjectId`);

const savePostRules = [
  mongoIdBody('postId'),
  body('collectionId')
    .optional()
    .custom((value) => mongoose.Types.ObjectId.isValid(String(value)))
    .withMessage('collectionId must be a valid MongoDB ObjectId'),
];

const collectionNameRules = [
  body('name')
    .isString()
    .withMessage('Collection name is required')
    .trim()
    .notEmpty()
    .withMessage('Collection name is required')
    .isLength({ max: 50 })
    .withMessage('Collection name cannot exceed 50 characters'),
];

const collectionIdParamRules = [mongoIdParam('id')];

const savedCollectionPostsRules = [
  param('id')
    .custom((value) => mongoose.Types.ObjectId.isValid(String(value)))
    .withMessage('id must be a valid MongoDB ObjectId'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be greater than 0')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 24 })
    .withMessage('Limit must be between 1 and 24')
    .toInt(),
];

export { collectionIdParamRules, collectionNameRules, savePostRules, savedCollectionPostsRules };