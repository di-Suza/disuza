const Roles = Object.freeze({
  USER: 'USER',
  ADMIN: 'ADMIN',
});

type Role = (typeof Roles)[keyof typeof Roles];

export { Roles, type Role };