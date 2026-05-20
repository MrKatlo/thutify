import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { PlatformUser, InstitutionUser } from '../types';

export interface MergedProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  isPlatformAdmin: boolean;
  role?: 'owner' | 'admin' | 'teacher' | 'student';
  status?: 'active' | 'pending' | 'suspended';
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
  const [loading, setLoading] = useState(true);

  const resolvedInstitutionId = activeInstitutionId !== undefined ? activeInstitutionId : globalActiveInstitutionId;
  const [currentInstId, setCurrentInstId] = useState(resolvedInstitutionId);

  useEffect(() => {
    if (activeInstitutionId !== undefined) {
      setCurrentInstId(activeInstitutionId);
      return;
    }

    // Set initial
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
    let unsubscribeGlobal: (() => void) | null = null;
    let unsubscribeMembership: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      // Clean up previous listeners
      if (unsubscribeGlobal) {
        unsubscribeGlobal();
        unsubscribeGlobal = null;
      }
      if (unsubscribeMembership) {
        unsubscribeMembership();
        unsubscribeMembership = null;
      }

      if (firebaseUser) {
        let globalData: PlatformUser | null = null;
        let membershipData: InstitutionUser | null = null;

        const updateMergedProfile = () => {
          if (globalData) {
            setProfile({
              uid: firebaseUser.uid,
              fullName: globalData.fullName || '',
              email: globalData.email || firebaseUser.email || '',
              phone: globalData.phone || '',
              isPlatformAdmin: !!globalData.isPlatformAdmin,
              role: membershipData?.role,
              status: membershipData?.status
            });
          } else {
            setProfile(null);
          }
          setLoading(false);
        };

        // 1. Subscribe to Global User record
        unsubscribeGlobal = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          (docSnap) => {
            if (docSnap.exists()) {
              globalData = docSnap.data() as PlatformUser;
            } else {
              // Fallback: If user doc doesn't exist yet, populate with auth defaults
              globalData = {
                uid: firebaseUser.uid,
                fullName: firebaseUser.displayName || '',
                email: firebaseUser.email || '',
                phone: firebaseUser.phoneNumber || '',
                isPlatformAdmin: false,
                createdAt: new Date(),
                updatedAt: new Date()
              };
            }
            updateMergedProfile();
          },
          (error) => {
            console.error("Global profile sync error:", error);
            setLoading(false);
          }
        );

        // 2. Subscribe to Institution Membership record if currentInstId is provided
        if (currentInstId) {
          const membershipDocId = `${firebaseUser.uid}_${currentInstId}`;
          unsubscribeMembership = onSnapshot(
            doc(db, 'institutionUsers', membershipDocId),
            (docSnap) => {
              if (docSnap.exists()) {
                membershipData = docSnap.data() as InstitutionUser;
              } else {
                membershipData = null;
              }
              updateMergedProfile();
            },
            (error) => {
              console.error("Institution membership sync error:", error);
              updateMergedProfile();
            }
          );
        } else {
          membershipData = null;
          // Trigger update instantly since no membership exists/is needed
          setTimeout(updateMergedProfile, 0);
        }

      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeGlobal) unsubscribeGlobal();
      if (unsubscribeMembership) unsubscribeMembership();
    };
  }, [currentInstId]);

  return {
    user,
    profile,
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
    institutionId: currentInstId
  };
}
