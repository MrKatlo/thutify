# Project Structure After Cloudflare Integration

```
zerot/
├── wrangler.toml                    # ← NEW: Cloudflare worker config
├── .env                             # ← NEW: Environment variables (create this)
├── QUICK_START.md                   # ← NEW: Quick setup guide
├── CLOUDFLARE_SETUP.md              # ← NEW: Full setup documentation
├── package.json                     # UPDATED: Added npm scripts
├── firebase-applet-config.json      # (existing)
├── firebase.json                    # (existing)
├── firestore.rules                  # (existing)
├── index.html                       # (existing)
├── tsconfig.json                    # (existing)
├── vite.config.ts                   # (existing)
│
├── src/
│   ├── worker.ts                    # ← NEW: Cloudflare worker main file
│   ├── App.tsx                      # (existing)
│   ├── main.tsx                     # (existing)
│   ├── index.css                    # (existing)
│   ├── types.ts                     # (existing)
│   │
│   ├── lib/
│   │   ├── firebase.ts              # (existing - keep for auth)
│   │   └── utils.ts                 # (existing)
│   │
│   ├── services/
│   │   ├── d1Service.ts             # ← NEW: D1 database service
│   │   ├── r2Service.ts             # ← NEW: R2 storage service
│   │   ├── cfApi.ts                 # ← NEW: Client-side API helpers
│   │   └── (other existing files)
│   │
│   ├── components/
│   │   ├── UserManagementExample.tsx # ← NEW: Example component
│   │   ├── Dashboard.tsx             # (existing)
│   │   └── (other existing components)
│   │
│   ├── hooks/
│   │   ├── useAuth.ts               # (existing)
│   │   └── useRouter.ts             # (existing)
│   │
│   └── layout/
│       └── (existing)

├── migrations/                       # ← To be created for D1 schema migrations
│   └── 0001_create_initial_schema.sql
│
└── node_modules/
    ├── wrangler/                    # ← NEW: Cloudflare CLI
    ├── @cloudflare/workers-types/   # ← NEW: TypeScript types
    ├── sql.js/                      # ← NEW: SQL library
    ├── concurrently/                # ← NEW: Run multiple processes
    └── (existing dependencies)
```

## What Each New File Does

### `wrangler.toml`
Configuration file for Cloudflare Workers, D1, and R2.
- Specifies D1 database binding
- Specifies R2 bucket binding
- Defines worker route and environment variables

### `src/worker.ts`
Main Cloudflare Worker file - this is your backend.
- Handles HTTP requests to `/api/*` routes
- Connects to D1 database and R2 storage
- Returns JSON responses to your React app

### `src/services/d1Service.ts`
TypeScript class for database operations.
- `create()` - Insert records
- `read()` - Query records
- `update()` - Modify records
- `delete()` - Remove records
- `query()` - Execute custom SQL

### `src/services/r2Service.ts`
TypeScript class for file storage operations.
- `uploadFile()` - Save files to R2
- `downloadFile()` - Retrieve files from R2
- `deleteFile()` - Remove files
- `listFiles()` - Browse storage
- `getFileMetadata()` - Get file info

### `src/services/cfApi.ts`
Client-side helper functions for your React components.
- Calls the Cloudflare Worker API
- Handles requests/responses
- Makes it easy to use from any component

Example usage:
```typescript
import { uploadFile, createRecord } from '@/services/cfApi';

// Upload a file
const result = await uploadFile(file, 'my-key');

// Create a database record
await createRecord('users', { email, name });
```

### `src/components/UserManagementExample.tsx`
Complete example component showing:
- User signup with Firebase Auth
- Profile picture upload to R2
- User record creation in D1
- List all users from database
- Display profile pictures

## Firebase Auth (Keep Existing)

Your existing Firebase setup continues to work:
- `src/lib/firebase.ts` - Still handles authentication
- Firebase Authentication for login/signup
- Firebase Auth provides user UIDs used as primary keys in D1

The flow:
```
1. User signs up with Firebase Email/Password
   → Firebase creates auth user
   
2. Get Firebase UID
   → Use this as ID in D1 database
   
3. Upload profile picture
   → Saves to R2 storage
   
4. Create user record in D1
   → Stores email, name, profile_picture_key
   
5. Next time user logs in
   → Fetch user profile from D1
   → Get profile picture from R2
```

## NPM Scripts

```bash
# Development
npm run dev          # Run Vite only (localhost:3000)
npm run dev:worker   # Run Cloudflare Worker only (localhost:8787)
npm run dev:full     # Run both simultaneously (recommended)

# Production
npm run build        # Build React app
npm run build:worker # Dry-run deploy to preview
npm run deploy       # Deploy Cloudflare Worker to production
npm run lint         # Check TypeScript
npm run clean        # Remove build artifacts
```

## Next Actions

1. ✅ Review this structure
2. ✅ Read `QUICK_START.md` for setup steps
3. ✅ Create Cloudflare account
4. ✅ Run `wrangler d1 create zerot-db`
5. ✅ Run `wrangler r2 bucket create zerot-storage`
6. ✅ Update `wrangler.toml` with your IDs
7. ✅ Create `.env` file with API URL
8. ✅ Run `npm run dev:full` to start development

That's it! You now have:
- 🔐 Firebase for authentication
- 💾 Cloudflare D1 for database
- 📦 Cloudflare R2 for file storage
- ⚡ Cloudflare Workers as backend
