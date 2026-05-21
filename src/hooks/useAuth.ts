import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import * as cfApi from '../services/cfApi';
import { Institution } from '../types';

export interface MergedProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  photoURL?: string;
  isPlatformAdmin: boolean;
  role?: 'owner' | 'admin' | 'teacher' | 'student';
  status?: 'active' | 'pending' | 'suspended';
  institution_id?: string;
  completedLessons?: string[];
}

let globalActiveInstitutionId: string | null = null;
const authListeners = new Set<() => void>();

export function setActiveInstitutionId(id: string | null) {
  if (globalActiveInstitutionId !== id) {
    globalActiveInstitutionId = id;
    authListeners.forEach(listener => listener());
  }
}

export function useAuth(activeInstitutionId?: string | null) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MergedProfile | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);

  const resolvedInstitutionId = activeInstitutionId !== undefined ? activeInstitutionId : globalActiveInstitutionId;
  const [currentInstId, setCurrentInstId] = useState(resolvedInstitutionId);

  useEffect(() => {
    if (activeInstitutionId !== undefined) {
      setCurrentInstId(activeInstitutionId);
      return;
    }

    setCurrentInstId(globalActiveInstitutionId);

    const handleGlobalUpdate = () => {
      setCurrentInstId(globalActiveInstitutionId);
    };
    authListeners.add(handleGlobalUpdate);
    return () => {
      authListeners.delete(handleGlobalUpdate);
    };
  }, [activeInstitutionId]);

  useEffect(() => {
    let isMounted = true;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const [platformUser, membershipData, instData] = await Promise.all([
            cfApi.getCurrentUser(),
            currentInstId ? cfApi.getInstitutionMembership(currentInstId) : Promise.resolve(null),
            currentInstId ? cfApi.getInstitution(currentInstId) : Promise.resolve(null)
          ]);

          if (isMounted) {
            setProfile({
              uid: firebaseUser.uid,
              fullName: platformUser?.full_name || firebaseUser.displayName || '',
              email: platformUser?.email || firebaseUser.email || '',
              phone: platformUser?.phone || '',
              photoURL: platformUser?.photo_url || firebaseUser.photoURL || '',
              isPlatformAdmin: !!platformUser?.is_platform_admin,
              role: membershipData?.role,
              status: membershipData?.status,
              institution_id: currentInstId || undefined,
              completedLessons: platformUser?.completed_lessons || []
            });
            setInstitution(instData);
          }
        } catch (err) {
          console.error('Error loading auth profile:', err);
          if (isMounted) {
            setProfile(null);
            setInstitution(null);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      } else {
        setProfile(null);
        setInstitution(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
    };
  }, [currentInstId]);

  return {
    user,
    profile,
    institution,
    loading,
    isAuthenticated: !!user && !!profile,
    isActive: profile?.status === 'active' || !!profile?.isPlatformAdmin,
    isPending: profile?.status === 'pending' && !profile?.isPlatformAdmin,
    isSuspended: profile?.status === 'suspended' && !profile?.isPlatformAdmin,
    isAdmin: profile?.role === 'admin' || profile?.role === 'owner' || !!profile?.isPlatformAdmin,
    isOwner: profile?.role === 'owner',
    isTeacher: profile?.role === 'teacher',
    isStudent: profile?.role === 'student',
    isPlatformAdmin: !!profile?.isPlatformAdmin,
    institutionId: currentInstId,
  };
}
