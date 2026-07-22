import { body, param } from 'express-validator';
import mongoose from 'mongoose';

import { PROBLEM_LANGUAGES } from '../problem.model.js';

function objectId(value: unknown) {
  return mongoose.Types.ObjectId.isValid(String(value));
}

const roomIdParamRules = [
  param('roomId')
    .custom(objectId)
    .withMessage('roomId must be a valid MongoDB ObjectId'),
];

const addProblemToRoomRules = [
  body('roomId').custom(objectId).withMessage('roomId must be a valid MongoDB ObjectId'),
  body('problemId').custom(objectId).withMessage('problemId must be a valid MongoDB ObjectId'),
];

const selectProblemRules = [
  body('roomId').custom(objectId).withMessage('roomId must be a valid MongoDB ObjectId'),
  body('roomProblemId').custom(objectId).withMessage('roomProblemId must be a valid MongoDB ObjectId'),
];

const unselectProblemRules = [
  body('roomId').custom(objectId).withMessage('roomId must be a valid MongoDB ObjectId'),
];

const removeProblemFromRoomRules = [
  body('roomId').custom(objectId).withMessage('roomId must be a valid MongoDB ObjectId'),
  body('roomProblemId').custom(objectId).withMessage('roomProblemId must be a valid MongoDB ObjectId'),
];

const updateProblemLanguageRules = [
  body('roomId').custom(objectId).withMessage('roomId must be a valid MongoDB ObjectId'),
  body('roomProblemId').custom(objectId).withMessage('roomProblemId must be a valid MongoDB ObjectId'),
  body('language').isIn(PROBLEM_LANGUAGES).withMessage('Unsupported language'),
];

const runProblemRules = [
  body('roomId').custom(objectId).withMessage('roomId must be a valid MongoDB ObjectId'),
  body('roomProblemId').custom(objectId).withMessage('roomProblemId must be a valid MongoDB ObjectId'),
  body('code').isString().withMessage('Code is required').trim().notEmpty().withMessage('Code is required'),
  body('language').isIn(PROBLEM_LANGUAGES).withMessage('Unsupported language'),
];

export {
  addProblemToRoomRules,
  removeProblemFromRoomRules,
  roomIdParamRules,
  runProblemRules,
  selectProblemRules,
  unselectProblemRules,
  updateProblemLanguageRules,
};
