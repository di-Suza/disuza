type PolicyReason =
  | 'allowed'
  | 'anonymous'
  | 'not-found'
  | 'not-owner'
  | 'blocked'
  | 'inactive'
  | 'forbidden'
  | 'unsupported';

type PolicyDecision = Readonly<{
  allowed: boolean;
  reason: PolicyReason;
}>;

const allow = (): PolicyDecision => ({ allowed: true, reason: 'allowed' });

const deny = (reason: Exclude<PolicyReason, 'allowed'>): PolicyDecision => ({
  allowed: false,
  reason,
});

export { allow, deny };
export type { PolicyDecision, PolicyReason };
