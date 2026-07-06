import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';

import { useLogoutAllDevicesMutation, useLogoutMutation } from '@/features/auth/api/auth.api';
import { useAppSelector } from '@/app/store/hooks';
import {
  useFollowUserMutation,
  useGetBlockedUsersQuery,
  useGetUserRecommendationsQuery,
  useUnblockUserMutation,
  useUpdateGeneralInfoMutation,
  useUpdatePasswordMutation,
  useUpdateProfessionalInfoMutation,
  useUpdateUserNameAndPPMutation,
} from '@/features/users/api/user.api';
import type { UpdateProfessionalInfoRequest } from '@/features/users/model/user.types';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

const splitCsv = (value: string): string[] => value.split(',').map((item) => item.trim()).filter(Boolean);

const joinCsv = (value: unknown): string => Array.isArray(value) ? value.filter((item) => typeof item === 'string').join(', ') : '';

export const useDashboardPage = () => {
  const user = useAppSelector((state) => state.auth.user);
  const { showError, showSuccess } = useToast();

  const [logout, { isLoading: isLogoutLoading }] = useLogoutMutation();
  const [logoutAllDevices, { isLoading: isLogoutAllLoading }] = useLogoutAllDevicesMutation();
  const [updateUserNameAndPP, { isLoading: isIdentityUpdating }] = useUpdateUserNameAndPPMutation();
  const [updateGeneralInfo, { isLoading: isGeneralUpdating }] = useUpdateGeneralInfoMutation();
  const [updateProfessionalInfo, { isLoading: isProfessionalUpdating }] = useUpdateProfessionalInfoMutation();
  const [updatePassword, { isLoading: isPasswordUpdating }] = useUpdatePasswordMutation();
  const [followUser, { isLoading: isFollowing }] = useFollowUserMutation();
  const [unblockUser, { isLoading: isUnblocking }] = useUnblockUserMutation();

  const { data: recommendationsData, isFetching: isRecommendationsFetching } = useGetUserRecommendationsQuery({ limit: 8 });
  const { data: blockedUsersData, isFetching: isBlockedUsersFetching } = useGetBlockedUsersQuery({ page: 1 });

  const [identityForm, setIdentityForm] = useState({ userName: '', profilePictureUrl: '' });
  const [generalForm, setGeneralForm] = useState({ headline: '', about: '' });
  const [professionalForm, setProfessionalForm] = useState({ skills: '', interests: '', languages: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });

  useEffect(() => {
    if (!user) return;

    setIdentityForm({
      userName: user.userName || '',
      profilePictureUrl: typeof user.profilePicture?.url === 'string' ? user.profilePicture.url : '',
    });
    setGeneralForm({
      headline: typeof user.headline === 'string' ? user.headline : '',
      about: typeof user.about === 'string' ? user.about : '',
    });
    setProfessionalForm({
      skills: joinCsv(user.skills),
      interests: joinCsv(user.interests),
      languages: joinCsv(user.languages),
    });
  }, [user]);

  const handleLogout = useCallback(async () => {
    try {
      const result = await logout().unwrap();
      showSuccess(result.message);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  }, [logout, showError, showSuccess]);

  const handleLogoutAllDevices = useCallback(async () => {
    try {
      const result = await logoutAllDevices().unwrap();
      showSuccess(result.message);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  }, [logoutAllDevices, showError, showSuccess]);

  const updateIdentityField = useCallback((field: keyof typeof identityForm) => (event: ChangeEvent<HTMLInputElement>) => {
    setIdentityForm((current) => ({ ...current, [field]: event.target.value }));
  }, []);

  const updateGeneralField = useCallback((field: keyof typeof generalForm) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setGeneralForm((current) => ({ ...current, [field]: event.target.value }));
  }, []);

  const updateProfessionalField = useCallback((field: keyof typeof professionalForm) => (event: ChangeEvent<HTMLInputElement>) => {
    setProfessionalForm((current) => ({ ...current, [field]: event.target.value }));
  }, []);

  const updatePasswordField = useCallback((field: keyof typeof passwordForm) => (event: ChangeEvent<HTMLInputElement>) => {
    setPasswordForm((current) => ({ ...current, [field]: event.target.value }));
  }, []);

  const handleIdentitySubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const result = await updateUserNameAndPP({
        userName: identityForm.userName.trim(),
        profilePictureUrl: identityForm.profilePictureUrl.trim() || undefined,
      }).unwrap();
      showSuccess(result.message);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  }, [identityForm, showError, showSuccess, updateUserNameAndPP]);

  const handleGeneralSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const result = await updateGeneralInfo({
        headline: generalForm.headline,
        about: generalForm.about,
      }).unwrap();
      showSuccess(result.message);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  }, [generalForm, showError, showSuccess, updateGeneralInfo]);

  const handleProfessionalSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const body: UpdateProfessionalInfoRequest = {
      skills: splitCsv(professionalForm.skills),
      interests: splitCsv(professionalForm.interests),
      languages: splitCsv(professionalForm.languages),
    };

    try {
      const result = await updateProfessionalInfo(body).unwrap();
      showSuccess(result.message);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  }, [professionalForm, showError, showSuccess, updateProfessionalInfo]);

  const handlePasswordSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const result = await updatePassword(passwordForm).unwrap();
      showSuccess(result.message);
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (error) {
      showError(getErrorMessage(error));
    }
  }, [passwordForm, showError, showSuccess, updatePassword]);

  const handleFollowRecommendation = useCallback(async (userId: string) => {
    try {
      const result = await followUser(userId).unwrap();
      showSuccess(result.message);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  }, [followUser, showError, showSuccess]);

  const handleUnblockUser = useCallback(async (userId: string) => {
    try {
      const result = await unblockUser(userId).unwrap();
      showSuccess(result.message);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  }, [showError, showSuccess, unblockUser]);

  return useMemo(() => ({
    blockedUsers: blockedUsersData?.blockedUsers || [],
    generalForm,
    handleFollowRecommendation,
    handleGeneralSubmit,
    handleIdentitySubmit,
    handleLogout,
    handleLogoutAllDevices,
    handlePasswordSubmit,
    handleProfessionalSubmit,
    handleUnblockUser,
    identityForm,
    isBlockedUsersFetching,
    isBusy: isIdentityUpdating || isGeneralUpdating || isProfessionalUpdating || isPasswordUpdating,
    isFollowing,
    isGeneralUpdating,
    isIdentityUpdating,
    isLogoutAllLoading,
    isLogoutLoading,
    isPasswordUpdating,
    isProfessionalUpdating,
    isRecommendationsFetching,
    isUnblocking,
    passwordForm,
    professionalForm,
    recommendations: recommendationsData?.recommendations || [],
    updateGeneralField,
    updateIdentityField,
    updatePasswordField,
    updateProfessionalField,
    user,
  }), [
    blockedUsersData?.blockedUsers,
    generalForm,
    handleFollowRecommendation,
    handleGeneralSubmit,
    handleIdentitySubmit,
    handleLogout,
    handleLogoutAllDevices,
    handlePasswordSubmit,
    handleProfessionalSubmit,
    handleUnblockUser,
    identityForm,
    isBlockedUsersFetching,
    isFollowing,
    isGeneralUpdating,
    isIdentityUpdating,
    isLogoutAllLoading,
    isLogoutLoading,
    isPasswordUpdating,
    isProfessionalUpdating,
    isRecommendationsFetching,
    isUnblocking,
    passwordForm,
    professionalForm,
    recommendationsData?.recommendations,
    updateGeneralField,
    updateIdentityField,
    updatePasswordField,
    updateProfessionalField,
    user,
  ]);
};
