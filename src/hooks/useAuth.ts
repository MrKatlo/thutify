import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      // Clean up previous profile listener if any
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        // Attach real-time snapshot listener to their Firestore user profile document
        unsubscribeProfile = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              setProfile(data);
              setIsMockMode(false);
            } else {
              // If the profile document doesn't exist in Firestore yet (e.g. during registration),
              // set a local fallback profile state based on their chosen role,
              // but DO NOT write or overwrite anything to Firestore!
              const localRole = (localStorage.getItem('user_role') || 'student') as UserRole;
              setProfile({
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                role: localRole,
                photoURL: firebaseUser.photoURL || '',
                createdAt: new Date(),
              });
              setIsMockMode(false);
            }
            setLoading(false);
          },
          (error) => {
            console.warn("Firestore listener failed. Falling back to local mock:", error);
            const localRole = (localStorage.getItem('user_role') || 'admin') as UserRole;
            setProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Mock User',
              role: localRole,
              photoURL: firebaseUser.photoURL || '',
              createdAt: new Date(),
            });
            setIsMockMode(true);
            setLoading(false);
          }
        );
      } else {
        setProfile(null);
        setIsMockMode(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  return { user, profile, loading, isMockMode };
}
