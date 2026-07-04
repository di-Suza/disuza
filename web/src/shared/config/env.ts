const getEnvValue = (value: string | undefined, fallback: string): string => {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : fallback;
};

const env = {
  apiBaseUrl: getEnvValue(import.meta.env.VITE_API_BASE_URL, 'http://localhost:8080/api'),
  googleClientId: getEnvValue(import.meta.env.VITE_GOOGLE_CLIENT_ID, ''),
};

export default env;

