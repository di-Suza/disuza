import { query } from 'express-validator';

const paginationRules = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('limit must be between 1 and 20')
    .toInt(),
];

const searchRules = [
  query('q')
    .isString()
    .withMessage('Search query is required!')
    .trim()
    .notEmpty()
    .withMessage('Search query cannot be empty!'),
  query('userPage')
    .optional()
    .isInt({ min: 1 })
    .withMessage('userPage must be a positive integer')
    .toInt(),
  query('postPage')
    .optional()
    .isInt({ min: 1 })
    .withMessage('postPage must be a positive integer')
    .toInt(),
  ...paginationRules,
];

const discoverRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer')
    .toInt(),
  ...paginationRules,
];

export { discoverRules, searchRules };
