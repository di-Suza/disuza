import type { Request, RequestHandler, Response } from 'express';

import asyncHandler from '../../shared/utils/asyncHandler.js';
import userService, { type UserService } from './user.service.js';

const getParamId = (req: Request): string => String(req.params.id);

class UserController {
  readonly updatePassword: RequestHandler;
  readonly updateUserNameAndPP: RequestHandler;
  readonly updateGeneralInfo: RequestHandler;
  readonly updateProfessionalInfo: RequestHandler;
  readonly getProfileUser: RequestHandler;
  readonly getUserAccountHistory: RequestHandler;
  readonly verifyAccountDeletePassword: RequestHandler;
  readonly sendAccountDeleteOtp: RequestHandler;
  readonly verifyAccountDeleteOtp: RequestHandler;
  readonly deleteUserAccount: RequestHandler;
  readonly followUser: RequestHandler;
  readonly unfollowUser: RequestHandler;
  readonly getFollowers: RequestHandler;
  readonly getFollowing: RequestHandler;
  readonly blockUser: RequestHandler;
  readonly unblockUser: RequestHandler;
  readonly getBlockedUsers: RequestHandler;
  readonly getUserRecommendations: RequestHandler;

  constructor(private readonly service: UserService = userService) {
    this.updatePassword = asyncHandler(this.handleUpdatePassword.bind(this));
    this.updateUserNameAndPP = asyncHandler(this.handleUpdateUserNameAndPP.bind(this));
    this.updateGeneralInfo = asyncHandler(this.handleUpdateGeneralInfo.bind(this));
    this.updateProfessionalInfo = asyncHandler(this.handleUpdateProfessionalInfo.bind(this));
    this.getProfileUser = asyncHandler(this.handleGetProfileUser.bind(this));
    this.getUserAccountHistory = asyncHandler(this.handleGetUserAccountHistory.bind(this));
    this.verifyAccountDeletePassword = asyncHandler(this.handleVerifyAccountDeletePassword.bind(this));
    this.sendAccountDeleteOtp = asyncHandler(this.handleSendAccountDeleteOtp.bind(this));
    this.verifyAccountDeleteOtp = asyncHandler(this.handleVerifyAccountDeleteOtp.bind(this));
    this.deleteUserAccount = asyncHandler(this.handleDeleteUserAccount.bind(this));
    this.followUser = asyncHandler(this.handleFollowUser.bind(this));
    this.unfollowUser = asyncHandler(this.handleUnfollowUser.bind(this));
    this.getFollowers = asyncHandler(this.handleGetFollowers.bind(this));
    this.getFollowing = asyncHandler(this.handleGetFollowing.bind(this));
    this.blockUser = asyncHandler(this.handleBlockUser.bind(this));
    this.unblockUser = asyncHandler(this.handleUnblockUser.bind(this));
    this.getBlockedUsers = asyncHandler(this.handleGetBlockedUsers.bind(this));
    this.getUserRecommendations = asyncHandler(this.handleGetUserRecommendations.bind(this));
  }

  private async handleUpdatePassword(req: Request, res: Response) {
    await this.service.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);

    res.status(200).json({
      success: true,
      message: 'Password Updated Successfully!',
    });
  }

  private async handleUpdateUserNameAndPP(req: Request, res: Response) {
    const updatedData = await this.service.updateUserNameAndPP(req.user!.id, req.body, req.file);

    res.status(201).json({
      success: true,
      message: 'Details Updated Successfully!',
      updatedData,
    });
  }

  private async handleUpdateGeneralInfo(req: Request, res: Response) {
    const updatedData = await this.service.updateGeneralInfo(req.user!.id, req.body.headline, req.body.about);

    res.status(200).json({
      success: true,
      message: 'Updated Successfully!',
      updatedData,
    });
  }

  private async handleUpdateProfessionalInfo(req: Request, res: Response) {
    const updatedData = await this.service.updateProfessionalInfo(req.user!.id, req.body);

    res.status(200).json({
      success: true,
      message: 'Updated Successfully!',
      updatedData,
    });
  }

  private async handleGetProfileUser(req: Request, res: Response) {
    const responseData = await this.service.getUserProfile(req.user!.id, getParamId(req));
    res.status(200).json(responseData);
  }

  private async handleGetUserAccountHistory(req: Request, res: Response) {
    const limit = 10;
    const activities = await this.service.getUserAccountHistory(req.user!.id, String(req.query.type), req.query.page, limit);

    res.status(200).json({
      success: true,
      activities,
      hasMore: activities.length === limit,
    });
  }

  private async handleVerifyAccountDeletePassword(req: Request, res: Response) {
    await this.service.verifyAccountDeletePassword(req.user!.id, req.body.password);

    res.status(200).json({
      success: true,
      message: 'Password verified successfully!',
    });
  }

  private async handleSendAccountDeleteOtp(req: Request, res: Response) {
    await this.service.sendAccountDeleteOtp(req.user!.id);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully!',
    });
  }

  private async handleVerifyAccountDeleteOtp(req: Request, res: Response) {
    await this.service.verifyAccountDeleteOtp(req.user!.id, req.body.otp);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully!',
    });
  }

  private async handleDeleteUserAccount(req: Request, res: Response) {
    await this.service.deleteUserAccount(req.user!.id);

    res.status(200).json({
      success: true,
      message: 'Account deletion started successfully!',
    });
  }

  private async handleFollowUser(req: Request, res: Response) {
    const result = await this.service.followUser(req.user!.id, getParamId(req));

    res.status(result.alreadyFollowing ? 200 : 201).json({
      success: true,
      message: result.alreadyFollowing ? 'Already following this user!' : 'Followed Successfully!',
      ...result,
    });
  }

  private async handleUnfollowUser(req: Request, res: Response) {
    await this.service.unfollowUser(req.user!.id, getParamId(req));

    res.status(200).json({
      success: true,
      message: 'Unfollowed Successfully!',
    });
  }

  private async handleGetFollowers(req: Request, res: Response) {
    const limit = 15;
    const followers = await this.service.getFollowers(req.user!.id, getParamId(req), req.query.page, limit);

    res.status(200).json({
      success: true,
      message: 'Followers fetched Successfully!',
      count: followers.length,
      followers,
      hasMore: followers.length === limit,
    });
  }

  private async handleGetFollowing(req: Request, res: Response) {
    const limit = 15;
    const following = await this.service.getFollowing(req.user!.id, getParamId(req), req.query.page, limit);

    res.status(200).json({
      success: true,
      message: 'Following fetched Successfully!',
      count: following.length,
      following,
      hasMore: following.length === limit,
    });
  }

  private async handleBlockUser(req: Request, res: Response) {
    const blockData = await this.service.blockUser(req.user!.id, getParamId(req));

    res.status(blockData.alreadyBlocked ? 200 : 201).json({
      success: true,
      message: blockData.alreadyBlocked ? 'User already blocked!' : 'User blocked successfully!',
      ...blockData,
    });
  }

  private async handleUnblockUser(req: Request, res: Response) {
    await this.service.unblockUser(req.user!.id, getParamId(req));

    res.status(200).json({
      success: true,
      message: 'User unblocked successfully!',
    });
  }

  private async handleGetBlockedUsers(req: Request, res: Response) {
    const blockedUsersData = await this.service.getBlockedUsers(req.user!.id, req.query.page, 15);

    res.status(200).json({
      success: true,
      message: 'Blocked users fetched successfully!',
      ...blockedUsersData,
    });
  }

  private async handleGetUserRecommendations(req: Request, res: Response) {
    const recommendations = await this.service.getUserRecommendations(req.user!.id, req.query.limit);

    res.status(200).json({
      success: true,
      message: 'User recommendations fetched successfully!',
      recommendations,
    });
  }
}

const userController = new UserController();

export { UserController };
export default userController;
