# Cloudflare Integration Setup Guide

This guide walks you through setting up Cloudflare D1 (Database) and R2 (Storage) for your zerot app while keeping Firebase for authentication.

## Architecture Overview

```
┌─────────────────┐
│  React App      │
│  (Firebase Auth)│
└────────┬────────┘
         │
         ├─────────────────────────────┐
         │                             │
    ┌────▼─────┐              ┌───────▼────┐
    │ Firebase  │              │ Cloudflare │
    │   Auth    │              │   Worker   │
    │           │              │            │
    └───────────┘              └───┬────┬───┘
                                   │    │
                          ┌────────▼┐ ┌─▼────────┐
                          │   D1    │ │    R2    │
                          │Database │ │ Storage  │
                          └─────────┘ └──────────┘
```

## Prerequisites

- Cloudflare account
- Wrangler CLI installed (`npm install -g @cloudflare/wrangler`)
- Node.js 18+

## Step 1: Cloudflare Account Setup

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Create a new Workers project or use existing one
3. Get your Account ID (shown in Cloudflare dashboard)

## Step 2: Set Up D1 Database

```bash
# Create a new D1 database
wrangler d1 create zerot-db

# This returns a database_id, copy it for wrangler.toml
```

Update `wrangler.toml` with your database ID:
```toml
[[d1_databases]]
binding = "DB"
database_name = "zerot-db"
database_id = "your-actual-database-id"
```

### Create Database Schema

Create a migration file for your database schema:

```bash
wrangler d1 migrations create zerot-db create_initial_schema
```

Edit the created migration file in `migrations/` folder:

```sql
-- Create users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  profile_picture TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create courses table (example)
CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  instructor_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES users(id)
);

-- Add more tables as needed
CREATE TABLE enrollments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);
```

Apply the migration:

```bash
wrangler d1 migrations apply zerot-db
```

## Step 3: Set Up R2 Storage

```bash
# Create an R2 bucket
wrangler r2 bucket create zerot-storage

# Optional: Create separate buckets for different purposes
wrangler r2 bucket create zerot-storage-prod
```

Update `wrangler.toml` with your bucket name (already configured).

## Step 4: Deploy Cloudflare Worker

```bash
# Development
wrangler dev

# Production
wrangler deploy
```

Your worker will be available at: `https://<account-name>.workers.dev`

## Step 5: Configure Client-Side API URL

Create a `.env` file in your project root:

```env
# Development
REACT_APP_API_URL=http://localhost:8787/api

# Production (replace with your actual worker URL)
REACT_APP_API_URL=https://your-worker.workers.dev/api
```

## Step 6: Update Your React Components

### Example: User Creation with Profile Picture

```typescript
import { createUser } from '@/services/firebase';
import { uploadFile, createRecord } from '@/services/cfApi';

async function handleUserSignup(email: string, name: string, profilePhoto: File) {
  try {
    // 1. Create Firebase auth user
    const firebaseUser = await createUser(email, password);
    
    // 2. Upload profile picture to R2
    const uploadResult = await uploadFile(profilePhoto, `profiles/${firebaseUser.uid}`);
    
    // 3. Create user record in D1 database
    await createRecord('users', {
      id: firebaseUser.uid,
      email,
      display_name: name,
      profile_picture: uploadResult.key,
    });
    
    return { success: true, userId: firebaseUser.uid };
  } catch (error) {
    console.error('Signup failed:', error);
    throw error;
  }
}
```

### Example: Fetching User Data

```typescript
import { readRecords, getFileMetadata } from '@/services/cfApi';
import { getAuth } from 'firebase/auth';

async function getUserProfile() {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) throw new Error('Not authenticated');
  
  // Fetch user data from D1
  const users = await readRecords('users');
  const userRecord = users.results.find(u => u.id === user.uid);
  
  // Get profile picture metadata from R2
  if (userRecord?.profile_picture) {
    const metadata = await getFileMetadata(userRecord.profile_picture);
    return { ...userRecord, profilePictureUrl: `https://zerot-storage.r2.cloudflarestorage.com/${userRecord.profile_picture}` };
  }
  
  return userRecord;
}
```

## Available API Endpoints

### Database Endpoints

- `POST /api/db/create` - Create record
- `GET /api/db/read` - Read records (query: `?table=users`)
- `PUT /api/db/update` - Update record
- `DELETE /api/db/delete` - Delete record
- `POST /api/db/query` - Execute custom SQL

### Storage Endpoints

- `POST /api/storage/upload` - Upload file
- `GET /api/storage/download` - Download file (query: `?key=filename`)
- `DELETE /api/storage/delete` - Delete file
- `GET /api/storage/list` - List files (query: `?prefix=folder/`)
- `GET /api/storage/metadata` - Get file metadata (query: `?key=filename`)

## Firebase Auth Integration

Keep your existing Firebase authentication setup:

```typescript
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';

// Users authenticate with Firebase
// But their data is stored in Cloudflare D1 + R2
```

When a user signs in:
1. Firebase handles authentication
2. Get the user's UID from Firebase
3. Fetch/store related data in D1 using the Firebase UID
4. Store files in R2 with paths organized by Firebase UID

## Environment Variables Setup

```env
# Firebase (keep existing)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
# etc

# Cloudflare
REACT_APP_API_URL=http://localhost:8787/api
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

## Troubleshooting

### D1 Connection Issues
- Ensure database_id in `wrangler.toml` is correct
- Run `wrangler d1 info zerot-db` to verify setup
- Check migration status with `wrangler d1 migrations list zerot-db`

### R2 Upload Failures
- Verify bucket name in `wrangler.toml`
- Check file size limits (usually 5GB per file)
- Ensure proper CORS configuration if needed

### API Not Responding
- Run `wrangler dev` to test locally
- Check browser console for CORS errors
- Verify API_BASE URL in `.env` file

## Next Steps

1. ✅ Create additional D1 tables for your specific data models
2. ✅ Update React components to use cfApi functions
3. ✅ Migrate existing Firestore data to D1 (if applicable)
4. ✅ Set up proper R2 bucket lifecycle policies for old files
5. ✅ Configure custom domain for your Worker

## Resources

- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Firebase Auth Docs](https://firebase.google.com/docs/auth)
