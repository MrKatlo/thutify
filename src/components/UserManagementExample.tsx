/**
 * Example: User Management with Firebase Auth + Cloudflare D1 + R2
 * Shows how to integrate all three services
 */

import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createRecord, uploadFile, readRecords } from '@/services/cfApi';

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  profile_picture?: string;
  created_at: string;
}

export function UserManagementExample() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Handle user signup
   * 1. Create Firebase Auth user
   * 2. Upload profile picture to R2
   * 3. Create user record in D1
   */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Step 1: Create Firebase authentication user
      const firebaseUser = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Firebase user created:', firebaseUser.user.uid);

      // Step 2: Upload profile picture if provided
      let profilePictureKey = null;
      if (profileImage) {
        const uploadResult = await uploadFile(
          profileImage,
          `profiles/${firebaseUser.user.uid}/profile-${Date.now()}`
        );
        profilePictureKey = uploadResult.key;
        console.log('Profile picture uploaded:', profilePictureKey);
      }

      // Step 3: Create user record in D1 database
      const createResult = await createRecord('users', {
        id: firebaseUser.user.uid,
        email,
        display_name: name,
        profile_picture: profilePictureKey,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      console.log('User record created in D1:', createResult);

      // Clear form
      setEmail('');
      setPassword('');
      setName('');
      setProfileImage(null);

      // Refresh user list
      await loadUsers();

      alert('User created successfully!');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMsg);
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load all users from D1 database
   */
  const loadUsers = async () => {
    try {
      const result = await readRecords('users');
      const formattedUsers: UserProfile[] = result.results.map((u: any) => ({
        id: u.id,
        email: u.email,
        display_name: u.display_name,
        profile_picture: u.profile_picture,
        created_at: u.created_at,
      }));
      setUsers(formattedUsers);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  /**
   * Get public URL for profile picture
   */
  const getProfilePictureUrl = (picturePath: string) => {
    // Cloudflare R2 public URL format
    return `https://zerot-storage.r2.cloudflarestorage.com/${picturePath}`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">User Management</h1>

      {/* Signup Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-semibold mb-4">Create New User</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Profile Picture</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Creating user...' : 'Create User'}
          </button>
        </form>
      </div>

      {/* Users List */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Users</h2>
          <button
            onClick={loadUsers}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          >
            Refresh
          </button>
        </div>

        {users.length === 0 ? (
          <p className="text-gray-500">No users found</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map((user) => (
              <div key={user.id} className="border border-gray-200 p-4 rounded-lg">
                {user.profile_picture && (
                  <img
                    src={getProfilePictureUrl(user.profile_picture)}
                    alt={user.display_name}
                    className="w-20 h-20 rounded-full mb-3 object-cover"
                  />
                )}
                <h3 className="font-semibold">{user.display_name}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Joined: {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManagementExample;
