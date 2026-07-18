const TokenType = Object.freeze({
  ACCESS: 'access',
  REFRESH: 'refresh',
  PASSWORD_RESET: 'password-reset',
});

type TokenTypeValue = (typeof TokenType)[keyof typeof TokenType];

export { TokenType, type TokenTypeValue };