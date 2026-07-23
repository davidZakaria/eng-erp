import { Role } from '@/lib/types';

/** Roles that review consultant drawing uploads (matches API pending gate). */
export const DRAWING_REVIEW_ROLES: Role[] = [
  'SUPER_ADMIN',
  'HEAD_ENGINEER',
  'PROJECT_MANAGER',
  'ADMIN',
];

export function canReviewDrawings(role: Role): boolean {
  return DRAWING_REVIEW_ROLES.includes(role);
}
