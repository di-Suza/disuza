import { body } from 'express-validator';

import { ISSUE_CATEGORIES } from '../issue.model.js';

const createIssueRules = [
  body('category')
    .optional()
    .isIn(ISSUE_CATEGORIES)
    .withMessage('Invalid issue category.'),
  body('description')
    .isString()
    .withMessage('Please give proper description.')
    .trim()
    .notEmpty()
    .withMessage('Please give proper description.')
    .isLength({ max: 1000 })
    .withMessage('Description is too long! (Max 1000 characters)'),
];

export { createIssueRules };
