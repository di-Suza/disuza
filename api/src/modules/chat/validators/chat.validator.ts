import { body, param, query } from 'express-validator';

const mongoIdPattern = /^[a-f\d]{24}$/i;

const mongoIdBody = (field: string) => body(field)
  .optional({ nullable: true })
  .custom((value) => mongoIdPattern.test(String(value)))
  .withMessage(`${field} must be a valid MongoDB ObjectId`);

const conversationIdParamRules = [
  param('conversationId')
    .custom((value) => mongoIdPattern.test(String(value)))
    .withMessage('conversationId must be a valid MongoDB ObjectId'),
];

const sendMessageRules = [
  mongoIdBody('receiverId'),
  mongoIdBody('conversationId'),
  mongoIdBody('postId'),
  mongoIdBody('sharedPostId'),
  mongoIdBody('userId'),
  body('message')
    .optional({ nullable: true })
    .isString()
    .withMessage('Message must be a string')
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Message cannot exceed 2000 characters'),
  body('messageType')
    .optional()
    .isIn(['text', 'feedback', 'post'])
    .withMessage('messageType must be text, feedback, or post'),
  body('isFeedback')
    .optional()
    .customSanitizer((value) => value === true || value === 'true')
    .isBoolean()
    .withMessage('isFeedback must be a boolean'),
  body('feedbackOn')
    .optional()
    .isIn(['Post', 'User'])
    .withMessage('feedbackOn must be Post or User'),
  body()
    .custom((value) => {
      if (!value.receiverId && !value.conversationId) return false;
      if (value.messageType === 'post') return Boolean(value.postId || value.sharedPostId);
      if (!value.isFeedback && value.messageType !== 'feedback') return Boolean(value.message);
      if (!value.feedbackOn) return false;
      if (value.feedbackOn === 'Post') return Boolean(value.postId);
      if (value.feedbackOn === 'User') return Boolean(value.userId);
      return false;
    })
    .withMessage('receiverId/conversationId and valid feedback target are required'),
];

const getMessagesRules = [
  ...conversationIdParamRules,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be greater than 0').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50').toInt(),
];

const markAsReadRules = conversationIdParamRules;

const unsendMessageRules = [
  param('messageId')
    .custom((value) => mongoIdPattern.test(String(value)))
    .withMessage('messageId must be a valid MongoDB ObjectId'),
];

const deleteConversationRules = conversationIdParamRules;

export { deleteConversationRules, getMessagesRules, markAsReadRules, sendMessageRules, unsendMessageRules };
