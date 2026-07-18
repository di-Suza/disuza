import { Router } from 'express';

import { authenticate } from '../../shared/middleware/auth.js';
import { uploadProfilePicture } from '../media/media.middleware.js';
import validateRequest from '../../shared/middleware/validateRequest.js';
import userController from './user.controller.js';
import {
  mongoIdParam,
  pageAndIdRules,
  pageQueryRules,
  passwordRules,
  queryTypeAndPageRules,
  recommendationRules,
  analyticsRangeRules,
  updateGeneralInfoRules,
  updateProfessionalInfoRules,
  updateUserNameAndPPRules,
  verifyDeleteAccountOtpRules,
  verifyDeleteAccountPasswordRules,
} from './validators/user.validator.js';

class UserRoutes {
  private readonly router = Router();

  constructor() {
    this.register();
  }

  private register(): void {
    this.router.use(authenticate);

    this.router.post('/updatePassword', passwordRules, validateRequest, userController.updatePassword);
    this.router.post('/verifyDeleteAccountPassword', verifyDeleteAccountPasswordRules, validateRequest, userController.verifyAccountDeletePassword);
    this.router.post('/sendDeleteAccountOtp', userController.sendAccountDeleteOtp);
    this.router.post('/verifyDeleteAccountOtp', verifyDeleteAccountOtpRules, validateRequest, userController.verifyAccountDeleteOtp);
    this.router.delete('/deleteAccount', userController.deleteUserAccount);

    this.router.patch('/updateUserNameAndPP', uploadProfilePicture, updateUserNameAndPPRules, validateRequest, userController.updateUserNameAndPP);
    this.router.patch('/updateGeneralInfo', updateGeneralInfoRules, validateRequest, userController.updateGeneralInfo);
    this.router.patch('/updateProfessionalInfo', updateProfessionalInfoRules, validateRequest, userController.updateProfessionalInfo);

    this.router.get('/dashboardAnalytics', analyticsRangeRules, validateRequest, userController.getDashboardAnalytics);
    this.router.get('/getProfileUser/:id', mongoIdParam('id'), validateRequest, userController.getProfileUser);
    this.router.post('/trackProfileView/:id', mongoIdParam('id'), validateRequest, userController.trackProfileView);
    this.router.get('/getUserAccountHistory', queryTypeAndPageRules, validateRequest, userController.getUserAccountHistory);
    this.router.get('/blockedUsers', pageQueryRules, validateRequest, userController.getBlockedUsers);
    this.router.get('/recommendations', recommendationRules, validateRequest, userController.getUserRecommendations);

    this.router.post('/followUser/:id', mongoIdParam('id'), validateRequest, userController.followUser);
    this.router.delete('/unfollowUser/:id', mongoIdParam('id'), validateRequest, userController.unfollowUser);
    this.router.post('/blockUser/:id', mongoIdParam('id'), validateRequest, userController.blockUser);
    this.router.delete('/unblockUser/:id', mongoIdParam('id'), validateRequest, userController.unblockUser);
    this.router.get('/getFollowers/:id', pageAndIdRules, validateRequest, userController.getFollowers);
    this.router.get('/getFollowing/:id', pageAndIdRules, validateRequest, userController.getFollowing);
  }

  getRouter(): Router {
    return this.router;
  }
}

export { UserRoutes };
export default new UserRoutes().getRouter();
