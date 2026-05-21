# Quick Start: Firebase Auth + Cloudflare D1 + R2

## What You Now Have
✅ Firebase authentication (already configured)
✅ Cloudflare D1 database setup (SQLite)
✅ Cloudflare R2 storage setup (file uploads)
✅ Worker API endpoints connecting everything
✅ React client helpers for easy API calls

## Setup Steps (15 minutes)

### 1. Get Your Cloudflare Account ID
```bash
# Go to https://dash.cloudflare.com/
# Top right → Profile → Accounts → Copy Account ID
```

### 2. Create D1 Database
```bash
wrangler d1 create zerot-db
```
Copy the `database_id` from the output.

### 3. Create R2 Bucket
```bash
wrangler r2 bucket create zerot-storage
```

### 4. Update `wrangler.toml`
Replace `your-database-id-here` with your actual database ID:
```toml
[[d1_databases]]
binding = "DB"
database_name = "zerot-db"
database_id = "YOUR_ACTUAL_ID_HERE"  # ← Paste your ID here
```

### 5. Create `.env` File
```env
# Development (run wrangler dev on port 8787)
REACT_APP_API_URL=http://localhost:8787/api

# Production (after deployment)
# REACT_APP_API_URL=https://your-worker-subdomain.workers.dev/api
```

### 6. Create Database Schema
Run this SQL to set up your first tables:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  profile_picture TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  instructor_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES users(id)
);
```

Execute in your database:
```bash
wrangler d1 execute zerot-db --remote < schema.sql
```

### 7. Start Development Servers
```bash
# Starts both Vite (port 3000) + Cloudflare Worker (port 8787)
npm run dev:full
```

### 8. Test It Out
In your browser console:
```javascript
// Test D1 API
const response = await fetch('http://localhost:8787/api/db/read?table=users');
console.log(await response.json());

// Test R2 API
const formData = new FormData();
formData.append('file', new File(['test'], 'test.txt'));
const upload = await fetch('http://localhost:8787/api/storage/upload', {
  method: 'POST',
  body: formData
});
console.log(await upload.json());
```

## Using in Your React Components

### Upload Profile Picture + Create User
```typescript
import { uploadFile, createRecord } from '@/services/cfApi';

async function createUserProfile(email, name, photoFile) {
  // Upload photo to R2
  const { key } = await uploadFile(photoFile, `profiles/${email}`);
  
  // Save user to D1
  await createRecord('users', {
    id: crypto.randomUUID(),
    email,
    display_name: name,
    profile_picture: key,
  });
}
```

### Read User Data
```typescript
import { readRecords } from '@/services/cfApi';

async function getAllUsers() {
  const result = await readRecords('users');
  return result.results; // Array of user objects
}
```

### Get File from R2
```typescript
import { downloadFile } from '@/services/cfApi';

async function downloadProfilePicture(key) {
  const blob = await downloadFile(key);
  const url = URL.createObjectURL(blob);
  return url;
}
```

## Firebase Auth + Cloudflare Integration

```typescript
import { auth } from '@/lib/firebase';
import { createRecord } from '@/services/cfApi';

// When user signs up with Firebase:
const firebaseUser = await createUserWithEmailAndPassword(auth, email, password);

// Also create record in Cloudflare D1:
await createRecord('users', {
  id: firebaseUser.user.uid,  // Use Firebase UID as primary key
  email: firebaseUser.user.email,
  display_name: displayName,
});
```

## Deploy to Production

```bash
# Deploy Cloudflare Worker
wrangler deploy

# Build your React app
npm run build

# Deploy React app to your hosting (Vercel, Netlify, etc.)
# Update REACT_APP_API_URL in production build
```

## Common Issues & Fixes

**"Error: D1 database not found"**
- Check `database_id` in `wrangler.toml` is correct
- Run `wrangler d1 list` to verify database exists

**"CORS error when calling API"**
- Ensure `dev:full` is running (both servers)
- Check `.env` has correct `REACT_APP_API_URL`

**"File upload fails"**
- Verify R2 bucket exists: `wrangler r2 bucket list`
- Check file size is under 5GB

**"Can't see database tables"**
- Verify schema was executed: `wrangler d1 execute zerot-db --remote "SELECT * FROM sqlite_master;"`

## Full Documentation
See `CLOUDFLARE_SETUP.md` for complete details and more examples.

## API Reference
- Fetch from: `/api/db/*` or `/api/storage/*`
- Client helper functions in: `src/services/cfApi.ts`
- Example component: `src/components/UserManagementExample.tsx`
