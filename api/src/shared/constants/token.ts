const TokenType = Object.freeze({
  ACCESS: 'access',
  REFRESH: 'refresh',
});

type TokenTypeValue = (typeof TokenType)[keyof typeof TokenType];

export { TokenType, type TokenTypeValue };