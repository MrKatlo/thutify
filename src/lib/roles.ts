export type InstitutionRole = 'owner' | 'admin' | 'teacher' | 'student';

/** Institution owner and admin are treated as the same administrative role. */
export function canManageInstitution(role?: string | null): boolean {
  return role === 'owner' || role === 'admin';
}

/** Maps owner/admin to the owner menu bucket for sidebar visibility. */
export function effectiveMenuRole(role?: string | null): 'owner' | 'teacher' | 'student' | undefined {
  if (!role) return undefined;
  if (canManageInstitution(role)) return 'owner';
  if (role === 'teacher' || role === 'student') return role;
  return undefined;
}
