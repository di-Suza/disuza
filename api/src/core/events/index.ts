type DomainEventName =
  | 'auth.session.created'
  | 'auth.session.revoked'
  | 'user.followed'
  | 'user.unfollowed'
  | 'post.created'
  | 'post.updated'
  | 'post.deleted'
  | 'post.liked'
  | 'post.commented'
  | 'post.saved'
  | 'report.submitted'
  | 'issue.submitted'
  | 'chat.feedback.created';

type DomainEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> = {
  id: string;
  name: DomainEventName;
  occurredAt: Date;
  actorId?: string;
  targetId?: string;
  payload: TPayload;
};

export type { DomainEvent, DomainEventName };
