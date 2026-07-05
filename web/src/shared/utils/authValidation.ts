export const isValidEmail = (email: string): boolean => /\S+@\S+\.\S+/.test(email.trim());

export const isStrongEnoughPassword = (password: string): boolean => password.length >= 8;
