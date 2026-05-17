import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const localRole = (localStorage.getItem('user_role') || 'admin') as UserRole;
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            // Respect the database role, fallback to localRole if not specified
            setProfile({ ...data, role: data.role || localRole });
            setIsMockMode(false);
          } else {
            // Default new user to the role they selected when registering
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              role: localRole,
              photoURL: firebaseUser.photoURL || '',
              createdAt: serverTimestamp(),
            };
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
              setIsMockMode(false);
            } catch (setErr) {
              console.warn("Failed to write user profile to firestore, using local mock:", setErr);
              setIsMockMode(true);
            }
            setProfile(newProfile);
          }
        } catch (error) {
          console.warn("Firestore read failed (likely due to rules or uninitialized DB). Falling back to mock profile:", error);
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
        }
      } else {
        setProfile(null);
        setIsMockMode(false);
      }
      setLoading(false);
    });
  }, []);

  return { user, profile, loading, isMockMode };
}
