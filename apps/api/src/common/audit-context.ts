import { AsyncLocalStorage } from 'async_hooks';

export type AuditStore = {
  userId?: string;
};

export const auditContext = new AsyncLocalStorage<AuditStore>();

export function getAuditUserId(): string | undefined {
  return auditContext.getStore()?.userId;
}

export function runWithAuditUser<T>(userId: string | undefined, fn: () => T): T {
  return auditContext.run({ userId }, fn);
}
