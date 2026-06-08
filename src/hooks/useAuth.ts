import { useEffect, useState, useMemo } from 'react';
import { onIdTokenChanged, type User } from 'firebase/auth';
import { auth, logout as firebaseLogout } from '../lib/firebase';
import * as cfApi from '../services/cfApi';
import type { Institution, InstitutionUser, PlatformUser } from '../types';
import { canManageInstitution as resolveCanManageInstitution } from '../lib/roles';

export interface MergedProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  photoURL?: string;
  role?: 'owner' | 'admin' | 'teacher' | 'student';
  status?: 'active' | 'pending' | 'suspended' | 'rejected';
  institution_id?: string;
  institutionId?: string;
  completedLessons?: string[];
  isPlatformAdmin?: boolean;
  teacherApproved?: boolean;
  teacher_approved?: boolean;
}

const ACTIVE_INSTITUTION_STORAGE_KEY = 'zerot:activeInstitutionId';

let globalActiveInstitutionId: string | null =
  typeof window === 'undefined'
    ? null
    : window.sessionStorage.getItem(ACTIVE_INSTITUTION_STORAGE_KEY) ||
      window.localStorage.getItem(ACTIVE_INSTITUTION_STORAGE_KEY);
const authListeners = new Set<() => void>();

export function setActiveInstitutionId(id: string | null) {
  if (globalActiveInstitutionId !== id) {
    globalActiveInstitutionId = id;
    cfApi.setApiInstitutionScope(id);
    authListeners.forEach((listener) => listener());
  } else if (id !== null) {
    cfApi.setApiInstitutionScope(id);
  } else {
    cfApi.setApiInstitutionScope(null);
  }
}

function isApiNotFound(error: unknown) {
  return error instanceof Error && /not found/i.test(error.message);
}

export function useAuth(activeInstitutionId?: string | null) {
  const [user, setUser] = useState<User | null>(null);
  const [platformUser, setPlatformUser] = useState<PlatformUser | null>(null);
  const [institutionUser, setInstitutionUser] = useState<InstitutionUser | null>(null);
  const [profile, setProfile] = useState<MergedProfile | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedInstitutionId =
    activeInstitutionId !== undefined ? activeInstitutionId : globalActiveInstitutionId;
  const [currentInstitutionId, setCurrentInstitutionId] = useState<string | null>(resolvedInstitutionId);

  useEffect(() => {
    if (activeInstitutionId !== undefined) {
      setCurrentInstitutionId(activeInstitutionId);
      return;
    }

    setCurrentInstitutionId(globalActiveInstitutionId);
    const syncCurrentInstitution = () => setCurrentInstitutionId(globalActiveInstitutionId);
    authListeners.add(syncCurrentInstitution);
    return () => {
      authListeners.delete(syncCurrentInstitution);
    };
  }, [activeInstitutionId]);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (!mounted) return;

      setUser(firebaseUser);
      setLoading(true);
      setError(null);

      if (!firebaseUser) {
        if (!mounted) return;
        setPlatformUser(null);
        setInstitutionUser(null);
        setProfile(null);
        setInstitution(null);
        setLoading(false);
        return;
      }

      try {
        const baseUser = await cfApi.getCurrentUser();
        if (!mounted) return;

        let membership: InstitutionUser | null = null;
        let institutionRecord: Institution | null = null;

        if (currentInstitutionId) {
          const membershipPromise = cfApi
            .getInstitutionMembership(currentInstitutionId)
            .then((result) => result)
            .catch((membershipError) => {
              if (isApiNotFound(membershipError)) return null;
              throw membershipError;
            });

          const institutionPromise = cfApi
            .getInstitution(currentInstitutionId)
            .then((result) => result)
            .catch((institutionError) => {
              if (isApiNotFound(institutionError)) return null;
              throw institutionError;
            });

          [membership, institutionRecord] = await Promise.all([membershipPromise, institutionPromise]);
        }

        if (!mounted) return;

        const mergedProfile: MergedProfile = {
          uid: firebaseUser.uid,
          fullName: baseUser.fullName || baseUser.full_name || firebaseUser.displayName || '',
          email: baseUser.email || firebaseUser.email || '',
          phone: baseUser.phone || '',
          photoURL: baseUser.photoUrl || baseUser.photo_url || firebaseUser.photoURL || '',
          role: membership?.role,
          status: membership?.status,
          institution_id: membership?.institution_id || currentInstitutionId || undefined,
          institutionId: membership?.institutionId || currentInstitutionId || undefined,
          completedLessons: baseUser.completedLessons || baseUser.completed_lessons || [],
          isPlatformAdmin: Boolean(baseUser.isPlatformAdmin || baseUser.is_platform_admin),
          teacherApproved: membership?.teacherApproved ?? membership?.teacher_approved ?? true,
          teacher_approved: membership?.teacherApproved ?? membership?.teacher_approved ?? true,
        };

        setPlatformUser(baseUser);
        setInstitutionUser(membership);
        setProfile(mergedProfile);
        setInstitution(institutionRecord);
      } catch (loadError) {
        if (!mounted) return;
        setPlatformUser(null);
        setInstitutionUser(null);
        setProfile(null);
        setInstitution(null);
        setError(loadError instanceof Error ? loadError.message : 'Failed to load auth state');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [currentInstitutionId]);

  return useMemo(() => ({
    user,
    platformUser,
    institutionUser,
    profile,
    institution,
    loading,
    error,
    logout: firebaseLogout,
    isAuthenticated: !!user && !!platformUser,
    isActive: profile?.status === 'active',
    isPending: profile?.status === 'pending',
    isSuspended: profile?.status === 'suspended',
    isRejected: profile?.status === 'rejected',
    isOwner: profile?.role === 'owner',
    isAdmin: profile?.role === 'admin',
    canManageInstitution: resolveCanManageInstitution(profile?.role),
    isTeacher: profile?.role === 'teacher',
    isTeacherApproved: profile?.role !== 'teacher' || profile?.teacherApproved !== false,
    isStudent: profile?.role === 'student',
    isPlatformAdmin: profile?.isPlatformAdmin === true,
    institutionId: currentInstitutionId,
  }), [user, platformUser, institutionUser, profile, institution, loading, error, currentInstitutionId]);
}
