# VibeBoiler

A production-ready full-stack boilerplate featuring a React web app (Vite) and React Native mobile app (Expo), powered by Firebase services and Neon Postgres.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web App | React 19, Vite 6, TypeScript |
| Mobile App | React Native (Expo SDK 52), Expo Router |
| Backend | Firebase Cloud Functions (Node.js 20) |
| Auth | Firebase Auth (Web: JS SDK, Mobile: REST API) |
| SQL Database | Neon Postgres + Drizzle ORM |
| NoSQL Database | Firebase Firestore |
| File Storage | Firebase Storage |
| Hosting | Firebase Hosting |
| Monorepo | pnpm workspaces |
| CI/CD | GitHub Actions |
| Web Testing | Vitest + React Testing Library, Playwright (E2E) |
| Mobile Testing | Jest + jest-expo, Maestro (E2E) |

## Project Structure

```
vibeboiler/
├── apps/
│   ├── web/                    # React + Vite web application
│   │   ├── src/
│   │   │   ├── pages/          # Login, Signup, ForgotPassword, Home
│   │   │   ├── components/     # AuthGuard, etc.
│   │   │   ├── hooks/          # useAuth
│   │   │   └── lib/            # Firebase SDK initialization
│   │   ├── e2e/                # Playwright E2E tests
│   │   └── __tests__/          # Vitest unit tests
│   └── mobile/                 # React Native Expo app
│       ├── app/                # Expo Router file-based routing
│       │   ├── (auth)/         # Login, Signup, ForgotPassword screens
│       │   └── (app)/          # Authenticated screens
│       ├── src/
│       │   ├── services/       # Firebase REST API auth client
│       │   ├── contexts/       # AuthContext provider
│       │   └── components/     # Reusable components
│       ├── maestro/            # Maestro E2E test flows
│       └── __tests__/          # Jest unit tests
├── packages/
│   └── shared/                 # Shared types, utils, validation
├── functions/                  # Firebase Cloud Functions
│   ├── src/
│   │   ├── api/                # HTTP endpoint handlers
│   │   ├── db/                 # Drizzle schema, connection, migrations
│   │   └── middleware/         # Auth verification
│   └── drizzle/migrations/     # SQL migration files
├── .github/workflows/          # CI/CD pipelines (7 workflows)
├── firebase.json               # Firebase project configuration
├── firestore.rules             # Firestore security rules
└── storage.rules               # Storage security rules
```

## Prerequisites

Install these tools before starting:

- **Node.js** >= 20.x ([nodejs.org](https://nodejs.org))
- **pnpm** >= 9.x (`npm install -g pnpm`)
- **Firebase CLI** (`npm install -g firebase-tools`)
- **Expo CLI** (`npm install -g expo-cli`)
- **EAS CLI** (`npm install -g eas-cli`)
- **Git** >= 2.x

For mobile E2E testing:
- **Maestro** ([maestro.mobile.dev](https://maestro.mobile.dev))

For web E2E testing:
- Playwright browsers are installed automatically

## Initial Setup

### 1. Clone & Install

```bash
git clone https://github.com/your-org/vibeboiler.git
cd vibeboiler
pnpm install
```

### 2. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com) and create a new project
2. Enable the following services:
   - **Authentication**: Go to Authentication > Sign-in method > Enable Email/Password
   - **Firestore Database**: Create database in production mode
   - **Storage**: Set up Cloud Storage
   - **Hosting**: Set up hosting
   - **Functions**: Upgrade to Blaze (pay-as-you-go) plan (required for Functions)
3. Register a **Web App** in Project Settings:
   - Go to Project Settings > General > Your apps > Add app (Web)
   - Copy the Firebase config values
4. Generate a **Service Account Key**:
   - Go to Project Settings > Service accounts
   - Click "Generate new private key"
   - Save the JSON file (DO NOT commit this file)

5. Update `.firebaserc`:
```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

6. Login to Firebase locally:
```bash
firebase login
```

### 3. Neon Postgres Setup

1. Create an account at [neon.tech](https://neon.tech)
2. Create a new project and database
3. Copy the connection string from the Dashboard (format: `postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`)
4. Run initial migration:
```bash
# Generate migration from schema
pnpm db:generate

# Apply migration to Neon
NEON_DATABASE_URL="your-connection-string" pnpm db:migrate
```

### 4. Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your Firebase and Neon credentials:

```env
# Firebase (Web)
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase (Mobile)
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...

# Neon Postgres
NEON_DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require
```

### 5. Expo / EAS Setup

1. Create an Expo account at [expo.dev](https://expo.dev)
2. Login to EAS:
```bash
eas login
```
3. Configure the project:
```bash
cd apps/mobile
eas init
```
   - This will create your project on expo.dev and set `extra.eas.projectId` in `app.json`
   - Copy the project ID — you'll need it as a GitHub secret (`EAS_PROJECT_ID`)
4. Update `apps/mobile/app.json`:
   - Set `ios.bundleIdentifier` to your actual bundle ID (e.g., `com.yourcompany.vibeboiler`)
   - Set `android.package` to your actual package name
5. Update `apps/mobile/eas.json`:
   - Set `submit.production.ios.appleId` to your Apple ID
   - Set `submit.production.ios.ascAppId` to your App Store Connect App ID
   - Set `submit.production.ios.appleTeamId` to your Apple Team ID
6. **Run the first builds locally** (required before CI/CD can submit):
```bash
cd apps/mobile
# First iOS build — sets up credentials and registers the app with Apple
eas build --platform ios --profile production
# First Android build — generates the AAB for initial Play Store upload
eas build --platform android --profile production
```
   - EAS will walk you through credentials setup (signing certificates, keystores, etc.)
   - These first builds must complete before CI/CD workflows can submit to the stores

### 6. Apple Developer Portal Setup (iOS)

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/year)
2. Go to [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/):
   - **Identifiers**: Register a new App ID
     - Platform: iOS
     - Bundle ID: `com.yourcompany.vibeboiler` (must match `app.json`)
     - Enable capabilities: Push Notifications (if needed)
   - **Certificates**: EAS handles certificates automatically with `eas credentials`
3. Go to [App Store Connect](https://appstoreconnect.apple.com/):
   - Create a new app
   - Select your Bundle ID
   - Fill in app name, primary language, and SKU
   - Note the App Store Connect App ID for `eas.json`
4. Generate an App-Specific Password:
   - Go to [appleid.apple.com](https://appleid.apple.com) > Sign-In and Security > App-Specific Passwords
   - Generate a new password for CI/CD submissions

### 7. Google Play Console Setup (Android)

1. Register for a [Google Play Developer account](https://play.google.com/console/) ($25 one-time)
2. Create a new app in the Play Console:
   - Set default language and app name
   - Complete the app content questionnaire (privacy policy, ads, content rating, target audience)
3. Set up automated publishing:
   - Go to Setup > API access
   - Link to a Google Cloud project
   - Create a Service Account (or reuse the Firebase service account):
     - Go to Google Cloud Console > IAM & Admin > Service Accounts
     - Create a new service account (or use the existing Firebase service account email, e.g., `firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com`)
     - Grant role: "Service Account User"
     - Create a JSON key and download it
   - **Invite the service account to Play Console** (required):
     - Go to Play Console > Users and permissions > Invite new users
     - Enter the service account email address (e.g., `firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com`)
     - Under "App permissions", select your app
     - Grant the following permissions: **Releases** (manage production/testing releases), **Store presence** (edit store listing)
     - Click "Invite user" and confirm
4. Create an initial release manually:
   - Use the AAB from the first local Android build (see [Expo / EAS Setup](#5-expo--eas-setup) step 6)
   - Upload the AAB to the "Internal testing" track in the Play Console
   - This first upload must be manual; subsequent uploads are automated via CI/CD

### 8. GitHub Repository & Secrets Setup

1. Push your code to GitHub:
```bash
git remote set-url origin https://github.com/your-org/vibeboiler.git
git push -u origin main
```

2. Go to **Settings > Secrets and variables > Actions** and add these repository secrets:

| Secret | Description |
|--------|-------------|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON (entire file content) |
| `FIREBASE_API_KEY` | Firebase Web API key |
| `FIREBASE_AUTH_DOMAIN` | e.g., `your-project.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `FIREBASE_STORAGE_BUCKET` | e.g., `your-project.appspot.com` |
| `FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `FIREBASE_APP_ID` | Firebase Web App ID |
| `NEON_DATABASE_URL` | Neon Postgres connection string |
| `EXPO_TOKEN` | Expo access token (from expo.dev > Account Settings > Access Tokens) |
| `EAS_PROJECT_ID` | Expo project ID (from `eas init` or expo.dev project settings) |
| `APPLE_ID` | Your Apple ID email |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password for App Store submissions |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` | Google Play service account JSON key (can be the same as `FIREBASE_SERVICE_ACCOUNT` if the Firebase service account has Google Play Console permissions) |

## Local Development

### Web App

```bash
# Start Vite dev server on http://localhost:3000
pnpm dev:web
```

### Mobile App

```bash
# Start Expo dev server
cd apps/mobile
pnpm start

# Run on iOS Simulator
pnpm ios

# Run on Android Emulator
pnpm android
```

### Firebase Functions (local)

```bash
# Watch mode - rebuild on changes
pnpm dev:functions

# Start Firebase Emulators (Auth, Firestore, Functions, Storage, Hosting)
pnpm firebase:emulators
```

### Database

```bash
# Generate migrations after schema changes
pnpm db:generate

# Apply migrations
NEON_DATABASE_URL="your-connection-string" pnpm db:migrate

# Open Drizzle Studio (visual DB browser)
NEON_DATABASE_URL="your-connection-string" pnpm --filter @vibeboiler/functions db:studio
```

## Testing

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run specific package tests
pnpm test:web
pnpm test:mobile
pnpm test:functions

# Watch mode (web)
pnpm --filter @vibeboiler/web test:watch
```

### E2E Tests - Web (Playwright)

```bash
# Install browsers (first time)
pnpm --filter @vibeboiler/web exec playwright install

# Run E2E tests
pnpm test:e2e
```

### E2E Tests - Mobile (Maestro)

```bash
# Install Maestro (macOS)
curl -Ls "https://get.maestro.mobile.dev" | bash

# Start your app in a simulator/emulator, then:
cd apps/mobile
maestro test maestro/login-flow.yaml
```

## CI/CD Pipelines

All pipelines are defined in `.github/workflows/`:

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `ci.yml` | Pull Request to `main` | Lint, type-check, unit tests (all packages), E2E tests (web) |
| `deploy-web.yml` | Push to `main` (apps/web changed) | Build & deploy web app to Firebase Hosting |
| `deploy-functions.yml` | Push to `main` (functions changed) | Build & deploy Firebase Functions |
| `deploy-rules.yml` | Push to `main` (rules changed) | Deploy Firestore & Storage security rules |
| `db-migrate.yml` | Push to `main` (schema/migrations changed) | Run Drizzle migrations on Neon Postgres |
| `build-ios.yml` | Push to `main` (mobile changed) | EAS Build iOS + submit to App Store |
| `build-android.yml` | Push to `main` (mobile changed) | EAS Build Android + submit to Play Store |

### Workflow triggers

- **On PR**: The `ci.yml` workflow runs automatically on every pull request to `main`. All checks must pass before merging.
- **On merge**: The deploy/build workflows run only when relevant files change, using `paths` filters to avoid unnecessary builds.

## Architecture Decisions

### Why Firebase REST API for Mobile Auth?

The mobile app uses the Firebase Auth REST API directly instead of the Firebase JS SDK. This avoids:
- Heavy Firebase SDK dependency in the React Native bundle
- Native module linking issues with Expo managed workflow
- Allows full control over token storage (using `expo-secure-store`)

### Why Neon Postgres + Firestore?

- **Neon Postgres** (via Drizzle ORM): For relational data (user profiles, structured data requiring joins, complex queries)
- **Firestore**: For real-time data, document-based data, and features that benefit from Firebase's real-time listeners

### Why Separate GitHub Actions Workflows?

Each workflow is independent so that:
- Only relevant deployments trigger on merge (path-based filtering)
- Failures are isolated (a failed function deploy doesn't block web deployment)
- Each workflow can have its own concurrency settings and retry logic

## Environment Variables Reference

| Variable | Used By | Description |
|----------|---------|-------------|
| `VITE_FIREBASE_API_KEY` | Web | Firebase API key (exposed to client) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Web | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Web | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Web | Firebase Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Web | Firebase Cloud Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Web | Firebase app ID |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Mobile | Firebase API key for Expo |
| `NEON_DATABASE_URL` | Functions | Neon Postgres connection string |
| `GOOGLE_APPLICATION_CREDENTIALS` | Functions (local) | Path to Firebase service account JSON |

## License

MIT
