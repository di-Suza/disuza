import { query } from 'express-validator';

import { mongoIdParam } from '../../../shared/validators/common.js';

const getNotificationRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('limit must be between 1 and 20')
    .toInt(),
];

const notificationIdParamRules = [mongoIdParam('notificationId')];

export { getNotificationRules, notificationIdParamRules };
