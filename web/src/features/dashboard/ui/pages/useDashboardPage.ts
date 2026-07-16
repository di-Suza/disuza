import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import { useAppSelector } from '@/app/store/hooks';
import { useLogoutAllDevicesMutation, useLogoutMutation } from '@/features/auth/api/auth.api';
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
import type {
  PortfolioAddress,
  PortfolioEducation,
  PortfolioExperience,
  UpdateGeneralInfoRequest,
  UpdateProfessionalInfoRequest,
} from '@/features/users/model/user.types';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

const splitCsv = (value: string): string[] => value.split(',').map((item) => item.trim()).filter(Boolean);

const joinCsv = (value: unknown): string => Array.isArray(value) ? value.filter((item) => typeof item === 'string').join(', ') : '';
const GENERAL_INFO_DEBOUNCE_MS = 700;

type GeneralFormState = {
  headline: string;
  about: string;
  address: PortfolioAddress;
};

type ProfessionalFormState = {
  skills: string;
  interests: string;
  languages: string;
  experiences: PortfolioExperience[];
  educations: PortfolioEducation[];
};

type ProfessionalTextField = 'skills' | 'interests' | 'languages';
type GeneralTextField = 'headline' | 'about';

const createEmptyExperience = (): PortfolioExperience => ({ companyName: '', role: '', timePeriod: '' });

const createEmptyEducation = (): PortfolioEducation => ({ collegeName: '', timePeriod: '', course: '' });

const createEmptyAddress = (): PortfolioAddress => ({ city: '', state: '', country: '' });

type IdentityFormState = {
  userName: string;
  profilePictureUrl: string;
  profilePictureFile: File | null;
  ppRemoved: boolean;
};

const toRecord = (value: unknown): Record<string, unknown> => (
  typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
);

const normalizeAddress = (address: unknown): PortfolioAddress => {
  const record = toRecord(address);

  return {
    city: typeof record.city === 'string' ? record.city : '',
    state: typeof record.state === 'string' ? record.state : '',
    country: typeof record.country === 'string' ? record.country : '',
  };
};

const getGeneralFormFromUser = (user: { headline?: unknown; about?: unknown; address?: unknown } | null): GeneralFormState => ({
  headline: typeof user?.headline === 'string' ? user.headline : '',
  about: typeof user?.about === 'string' ? user.about : '',
  address: user ? normalizeAddress(user.address) : createEmptyAddress(),
});

const getGeneralPayload = (form: GeneralFormState): UpdateGeneralInfoRequest => ({
  headline: form.headline,
  about: form.about,
  address: {
    city: form.address.city,
    state: form.address.state,
    country: form.address.country,
  },
});

const serializeGeneralPayload = (payload: UpdateGeneralInfoRequest): string => JSON.stringify({
  headline: payload.headline?.trim() || '',
  about: payload.about?.trim() || '',
  address: {
    city: payload.address?.city?.trim() || '',
    state: payload.address?.state?.trim() || '',
    country: payload.address?.country?.trim() || '',
  },
});

const normalizeExperiences = (experiences: unknown): PortfolioExperience[] => {
  if (!Array.isArray(experiences) || experiences.length === 0) return [createEmptyExperience()];

  return experiences.map((item) => {
    const experience = toRecord(item);
    return {
      companyName: typeof experience.companyName === 'string' ? experience.companyName : '',
      role: typeof experience.role === 'string' ? experience.role : '',
      timePeriod: typeof experience.timePeriod === 'string' ? experience.timePeriod : '',
    };
  });
};

const normalizeEducations = (educations: unknown): PortfolioEducation[] => {
  if (!Array.isArray(educations) || educations.length === 0) return [createEmptyEducation()];

  return educations.map((item) => {
    const education = toRecord(item);
    return {
      collegeName: typeof education.collegeName === 'string' ? education.collegeName : '',
      timePeriod: typeof education.timePeriod === 'string' ? education.timePeriod : '',
      course: typeof education.course === 'string' ? education.course : '',
    };
  });
};

const getSubmitExperiences = (experiences: PortfolioExperience[]): PortfolioExperience[] => experiences
  .map((experience) => ({
    companyName: experience.companyName.trim(),
    role: experience.role.trim(),
    timePeriod: experience.timePeriod.trim(),
  }))
  .filter((experience) => experience.companyName || experience.timePeriod);

const getSubmitEducations = (educations: PortfolioEducation[]): PortfolioEducation[] => educations
  .map((education) => ({
    collegeName: education.collegeName.trim(),
    timePeriod: education.timePeriod.trim(),
    course: education.course.trim(),
  }))
  .filter((education) => education.collegeName || education.timePeriod || education.course);

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

  const [identityForm, setIdentityForm] = useState<IdentityFormState>({ userName: '', profilePictureUrl: '', profilePictureFile: null, ppRemoved: false });
  const [generalForm, setGeneralForm] = useState<GeneralFormState>(() => getGeneralFormFromUser(null));
  const [professionalForm, setProfessionalForm] = useState<ProfessionalFormState>({
    skills: '',
    interests: '',
    languages: '',
    experiences: [createEmptyExperience()],
    educations: [createEmptyEducation()],
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const generalHydratedUserIdRef = useRef<string | null>(null);
  const lastSavedGeneralRef = useRef(serializeGeneralPayload(getGeneralPayload(getGeneralFormFromUser(null))));
  const generalSaveRequestIdRef = useRef(0);
  const skipNextGeneralSaveRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    setIdentityForm({
      userName: user.userName || '',
      profilePictureUrl: typeof user.profilePicture?.url === 'string' ? user.profilePicture.url : '',
      profilePictureFile: null,
      ppRemoved: false,
    });
    if (generalHydratedUserIdRef.current !== user._id) {
      const nextGeneralForm = getGeneralFormFromUser(user);
      setGeneralForm(nextGeneralForm);
      lastSavedGeneralRef.current = serializeGeneralPayload(getGeneralPayload(nextGeneralForm));
      generalHydratedUserIdRef.current = user._id;
      skipNextGeneralSaveRef.current = true;
    }
    setProfessionalForm({
      skills: joinCsv(user.skills),
      interests: joinCsv(user.interests),
      languages: joinCsv(user.languages),
      experiences: normalizeExperiences(user.experiences),
      educations: normalizeEducations(user.educations),
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

  const updateIdentityField = useCallback((field: 'userName' | 'profilePictureUrl') => (event: ChangeEvent<HTMLInputElement>) => {
    setIdentityForm((current) => ({ ...current, [field]: event.target.value, ppRemoved: false }));
  }, []);

  const updateIdentityFile = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setIdentityForm((current) => ({ ...current, profilePictureFile: file, profilePictureUrl: file ? '' : current.profilePictureUrl, ppRemoved: false }));
  }, []);

  const handleRemoveProfilePicture = useCallback(() => {
    setIdentityForm((current) => ({ ...current, profilePictureFile: null, profilePictureUrl: '', ppRemoved: true }));
  }, []);

  const updateGeneralField = useCallback((field: GeneralTextField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setGeneralForm((current) => ({ ...current, [field]: event.target.value }));
  }, []);

  const updateAddressField = useCallback((field: keyof PortfolioAddress) => (event: ChangeEvent<HTMLInputElement>) => {
    setGeneralForm((current) => ({
      ...current,
      address: {
        ...current.address,
        [field]: event.target.value,
      },
    }));
  }, []);

  const updateProfessionalField = useCallback((field: ProfessionalTextField) => (event: ChangeEvent<HTMLInputElement>) => {
    setProfessionalForm((current) => ({ ...current, [field]: event.target.value }));
  }, []);

  const updateExperienceField = useCallback((index: number, field: keyof PortfolioExperience) => (event: ChangeEvent<HTMLInputElement>) => {
    setProfessionalForm((current) => ({
      ...current,
      experiences: current.experiences.map((experience, itemIndex) => (
        itemIndex === index ? { ...experience, [field]: event.target.value } : experience
      )),
    }));
  }, []);

  const updateEducationField = useCallback((index: number, field: keyof PortfolioEducation) => (event: ChangeEvent<HTMLInputElement>) => {
    setProfessionalForm((current) => ({
      ...current,
      educations: current.educations.map((education, itemIndex) => (
        itemIndex === index ? { ...education, [field]: event.target.value } : education
      )),
    }));
  }, []);

  const addExperience = useCallback(() => {
    setProfessionalForm((current) => ({ ...current, experiences: [...current.experiences, createEmptyExperience()] }));
  }, []);

  const addEducation = useCallback(() => {
    setProfessionalForm((current) => ({ ...current, educations: [...current.educations, createEmptyEducation()] }));
  }, []);

  const removeExperience = useCallback((index: number) => {
    setProfessionalForm((current) => ({
      ...current,
      experiences: current.experiences.length <= 1 ? [createEmptyExperience()] : current.experiences.filter((_item, itemIndex) => itemIndex !== index),
    }));
  }, []);

  const removeEducation = useCallback((index: number) => {
    setProfessionalForm((current) => ({
      ...current,
      educations: current.educations.length <= 1 ? [createEmptyEducation()] : current.educations.filter((_item, itemIndex) => itemIndex !== index),
    }));
  }, []);

  const updatePasswordField = useCallback((field: keyof typeof passwordForm) => (event: ChangeEvent<HTMLInputElement>) => {
    setPasswordForm((current) => ({ ...current, [field]: event.target.value }));
  }, []);

  const handleIdentitySubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const body = identityForm.profilePictureFile || identityForm.ppRemoved
        ? new FormData()
        : {
          userName: identityForm.userName.trim(),
          profilePictureUrl: identityForm.profilePictureUrl.trim() || undefined,
        };

      if (body instanceof FormData) {
        body.append('userName', identityForm.userName.trim());
        if (identityForm.profilePictureFile) body.append('profilePicture', identityForm.profilePictureFile);
        if (identityForm.ppRemoved) body.append('ppRemoved', 'true');
      }

      const result = await updateUserNameAndPP(body).unwrap();
      showSuccess(result.message);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  }, [identityForm, showError, showSuccess, updateUserNameAndPP]);

  const saveGeneralInfo = useCallback(async (form: GeneralFormState, notifyOnSuccess = false) => {
    const payload = getGeneralPayload(form);
    const serializedPayload = serializeGeneralPayload(payload);

    if (serializedPayload === lastSavedGeneralRef.current) return;

    const requestId = generalSaveRequestIdRef.current + 1;
    generalSaveRequestIdRef.current = requestId;

    try {
      const result = await updateGeneralInfo(payload).unwrap();

      if (requestId === generalSaveRequestIdRef.current) {
        lastSavedGeneralRef.current = serializeGeneralPayload(result.updatedData);
      }

      if (notifyOnSuccess) showSuccess(result.message);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  }, [showError, showSuccess, updateGeneralInfo]);

  useEffect(() => {
    if (!user || generalHydratedUserIdRef.current !== user._id) return undefined;

    if (skipNextGeneralSaveRef.current) {
      skipNextGeneralSaveRef.current = false;
      return undefined;
    }

    const serializedPayload = serializeGeneralPayload(getGeneralPayload(generalForm));
    if (serializedPayload === lastSavedGeneralRef.current) return undefined;

    const timeoutId = window.setTimeout(() => {
      void saveGeneralInfo(generalForm);
    }, GENERAL_INFO_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [generalForm, saveGeneralInfo, user]);

  const handleGeneralSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveGeneralInfo(generalForm, true);
  }, [generalForm, saveGeneralInfo]);

  const handleProfessionalSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const body: UpdateProfessionalInfoRequest = {
      skills: splitCsv(professionalForm.skills),
      interests: splitCsv(professionalForm.interests),
      languages: splitCsv(professionalForm.languages),
      experiences: getSubmitExperiences(professionalForm.experiences),
      educations: getSubmitEducations(professionalForm.educations),
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
    addEducation,
    addExperience,
    blockedUsers: blockedUsersData?.blockedUsers || [],
    generalForm,
    handleFollowRecommendation,
    handleGeneralSubmit,
    handleIdentitySubmit,
    handleLogout,
    handleRemoveProfilePicture,
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
    removeEducation,
    removeExperience,
    updateEducationField,
    updateExperienceField,
    updateAddressField,
    updateGeneralField,
    updateIdentityFile,
    updateIdentityField,
    updatePasswordField,
    updateProfessionalField,
    user,
  }), [
    addEducation,
    addExperience,
    blockedUsersData?.blockedUsers,
    generalForm,
    handleFollowRecommendation,
    handleGeneralSubmit,
    handleIdentitySubmit,
    handleLogout,
    handleRemoveProfilePicture,
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
    removeEducation,
    removeExperience,
    updateEducationField,
    updateExperienceField,
    updateAddressField,
    updateGeneralField,
    updateIdentityFile,
    updateIdentityField,
    updatePasswordField,
    updateProfessionalField,
    user,
  ]);
};
