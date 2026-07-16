import type { Request } from 'express';
import { body, query } from 'express-validator';

import { mongoIdParam } from '../../../shared/validators/common.js';

const passwordRules = [
  body('currentPassword')
    .isString()
    .withMessage('All fields are required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long!'),
  body('newPassword')
    .isString()
    .withMessage('All fields are required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long!')
    .custom((newPassword, { req }) => newPassword !== req.body.currentPassword)
    .withMessage('New password cannot be same as old password'),
];

const verifyDeleteAccountPasswordRules = [
  body('password')
    .isString()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long!'),
];

const verifyDeleteAccountOtpRules = [
  body('otp')
    .isString()
    .withMessage('OTP is required')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('OTP must be a 6 digit code'),
];

const updateUserNameAndPPRules = [
  body('userName')
    .optional()
    .isString()
    .withMessage('User Name must be a string')
    .trim()
    .isLength({ min: 1 })
    .withMessage('User Name cannot be empty'),
  body('ppRemoved')
    .optional()
    .customSanitizer((value) => value === true || value === 'true')
    .isBoolean()
    .withMessage('ppRemoved must be a boolean'),
  body('profilePictureUrl')
    .optional()
    .isURL({ require_protocol: true })
    .withMessage('Profile picture URL must be valid'),
  body('profilePictureFileId')
    .optional()
    .isString()
    .withMessage('Profile picture file id must be a string')
    .trim(),
  body()
    .custom((value, { req }) => {
      const requestWithFile = req as Request & { file?: Express.Multer.File };
      return Boolean(value.userName || value.ppRemoved || value.profilePictureUrl || requestWithFile.file);
    })
    .withMessage('At least one field (User Name or Profile Picture) must be provided!'),
];

const updateGeneralInfoRules = [
  body('headline')
    .optional()
    .isString()
    .withMessage('Headline must be a string')
    .trim(),
  body('about')
    .optional()
    .isString()
    .withMessage('About must be a string')
    .trim(),
  body('address')
    .optional()
    .isObject()
    .withMessage('Address must be an object'),
  body('address.city')
    .optional()
    .isString()
    .withMessage('City must be a string')
    .trim(),
  body('address.state')
    .optional()
    .isString()
    .withMessage('State must be a string')
    .trim(),
  body('address.country')
    .optional()
    .isString()
    .withMessage('Country must be a string')
    .trim(),
  body()
    .custom((value) => (
      Object.prototype.hasOwnProperty.call(value, 'headline')
      || Object.prototype.hasOwnProperty.call(value, 'about')
      || Object.prototype.hasOwnProperty.call(value, 'address')
    ))
    .withMessage('Please provide headline, about, or address to update!'),
];

const updateProfessionalInfoRules = [
  body()
    .custom((value) => {
      const allowedFields = ['skills', 'experiences', 'educations', 'handles', 'interests', 'languages'];
      const fields = Object.keys(value || {});
      return fields.length > 0 && fields.every((field) => allowedFields.includes(field));
    })
    .withMessage('Invalid or empty updates!'),
  body('skills').optional().isArray().withMessage('Skills must be an array'),
  body('skills.*').optional().isString().withMessage('Each skill must be a string').trim(),
  body('interests').optional().isArray().withMessage('Interests must be an array'),
  body('interests.*').optional().isString().withMessage('Each interest must be a string').trim(),
  body('languages').optional().isArray().withMessage('Languages must be an array'),
  body('languages.*').optional().isString().withMessage('Each language must be a string').trim(),
  body('educations').optional().isArray().withMessage('Educations must be an array'),
  body('educations.*.collegeName').optional().isString().withMessage('College name is required').trim().notEmpty().withMessage('College name is required'),
  body('educations.*.timePeriod').optional().isString().withMessage('Time period is required').trim().notEmpty().withMessage('Time period is required'),
  body('educations.*.course').optional().isString().withMessage('Course is required').trim().notEmpty().withMessage('Course is required'),
  body('experiences').optional().isArray().withMessage('Experiences must be an array'),
  body('experiences.*.companyName').optional().isString().withMessage('Company name is required').trim().notEmpty().withMessage('Company name is required'),
  body('experiences.*.role').optional().isString().withMessage('Role must be a string').trim(),
  body('experiences.*.timePeriod').optional().isString().withMessage('Time period is required').trim().notEmpty().withMessage('Time period is required'),
  body('handles').optional().isArray().withMessage('Handles must be an array'),
  body('handles.*.label').optional().isString().withMessage('Handle label is required').trim().notEmpty().withMessage('Handle label is required'),
  body('handles.*.link').optional().isString().withMessage('Handle link is required').trim().notEmpty().withMessage('Handle link is required').isURL({ require_protocol: true }).withMessage('Handle link must be a valid URL'),
];

const pageQueryRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be greater than 0')
    .toInt(),
];

const pageAndIdRules = [
  mongoIdParam('id'),
  ...pageQueryRules,
];

const queryTypeAndPageRules = [
  query('type')
    .isString()
    .withMessage('Type is required')
    .trim()
    .notEmpty()
    .withMessage('Type is required'),
  ...pageQueryRules,
];

const recommendationRules = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20')
    .toInt(),
];

export {
  mongoIdParam,
  pageAndIdRules,
  pageQueryRules,
  passwordRules,
  queryTypeAndPageRules,
  recommendationRules,
  updateGeneralInfoRules,
  updateProfessionalInfoRules,
  updateUserNameAndPPRules,
  verifyDeleteAccountOtpRules,
  verifyDeleteAccountPasswordRules,
};
