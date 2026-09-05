# Bloom

Bloom is a private, delayed-sharing diary for friends. Each circle stays sealed
until its bloom date. Members write daily entries while sealed, then read the
shared timeline, reactions, comments, and photos together after blooming.

## Stack

- Mobile: React Native, Expo SDK 54, Expo Router, TypeScript
- API: ASP.NET Core on .NET 10
- Persistence: Entity Framework Core with PostgreSQL
- Authentication: Google Sign-In only
- Media: project-local filesystem storage; PostgreSQL stores media metadata and relative paths

Push workers, cloud media storage, keepsakes/share links, and AI summaries are outside the current product scope.

## Repository layout

```text
apps/mobile/       Expo mobile application
backend/src/       .NET API, application, domain, contracts, infrastructure
backend/tests/     Unit, integration, and architecture test projects
backend/deploy/    Production Docker Compose manifest and deployment guide
docs/              Product and implementation documentation
.github/workflows/ CI/CD workflows for the API and Android builds
```

## Prerequisites

- Node.js 22 and npm
- .NET SDK 10
- Docker Desktop or Docker Engine with Compose
- Google OAuth client IDs for the mobile platform and API

## Local development

The easiest local setup uses three terminals: one for PostgreSQL, one for the
.NET API, and one for Expo.

### Quick start (Windows PowerShell)

From the repository root:

```powershell
# Terminal 1: PostgreSQL
docker compose up -d postgres

# Terminal 2: API
dotnet run --project .\backend\src\Bloom.Api\Bloom.Api.csproj --launch-profile http

# Terminal 3: mobile app
Copy-Item .\apps\mobile\.env.example .\apps\mobile\.env
Set-Location .\apps\mobile
npm install
npm run start
```

Before opening the mobile app, fill in the Google client IDs in
`apps/mobile/.env`. The API development configuration is in
`backend/src/Bloom.Api/appsettings.json`; use environment variables for local
overrides instead of committing secrets.

### Quick start (macOS/Linux)

```bash
# Terminal 1: PostgreSQL
docker compose up -d postgres

# Terminal 2: API
dotnet run --project backend/src/Bloom.Api/Bloom.Api.csproj --launch-profile http

# Terminal 3: mobile app
cp apps/mobile/.env.example apps/mobile/.env
cd apps/mobile
npm install
npm run start
```

Once Expo starts, press `a` for an Android emulator, `i` for an iOS
simulator, or scan the QR code with Expo Go. For a physical phone, change
`EXPO_PUBLIC_API_URL` to the development computer's LAN IP before starting
Expo.

### 1. Start PostgreSQL

From the repository root:

```bash
docker compose up -d postgres
```

The local compose file exposes PostgreSQL on `localhost:5432` with the development credentials configured in `backend/src/Bloom.Api/appsettings.json`.

### 2. Configure and run the API

For local development, either edit the development values in
`backend/src/Bloom.Api/appsettings.json` or override them with environment
variables. Never commit production secrets.

Important settings include:

```text
Google__IosClientId
Google__AndroidClientId
Google__WebClientId
Bloom__SessionSigningKey          # at least 32 characters
ConnectionStrings__BloomDb
ImageStorage__RootPath
Bloom__ApplyMigrationsOnStartup
```

Run the API on its configured local port (`5052`):

```bash
dotnet run --project backend/src/Bloom.Api/Bloom.Api.csproj --launch-profile http
```

The API base URL is `http://localhost:5052/api/v1`; health is available at
`http://localhost:5052/health`.

The repository contains EF Core migrations. For a local database, set
`Bloom__ApplyMigrationsOnStartup=true` for one startup, then set it back to
`false`. Production migration guidance is in
[`backend/deploy/README.md`](backend/deploy/README.md).

### 3. Configure and run the mobile app

```bash
cd apps/mobile
Copy-Item .env.example .env       # PowerShell
# cp .env.example .env           # macOS/Linux
npm install
npm run start
```

Set these values in `apps/mobile/.env`:

```text
EXPO_PUBLIC_API_URL=http://localhost:5052/api/v1
EXPO_PUBLIC_STRICT_BASE_URL=false
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
```

During development, Bloom automatically maps `localhost` to the Expo/Metro
host. On an Android emulator it falls back to `10.0.2.2`; on a physical phone
it uses the development computer's LAN address. Set
`EXPO_PUBLIC_STRICT_BASE_URL=true` only when the configured URL must be used
exactly as written. If host detection is unavailable on a physical device, set
`EXPO_PUBLIC_DEV_HOST` to the computer's LAN IP.

The phone and development computer must be on the same network, and the API
port must be allowed through the computer firewall.

Useful mobile commands:

```bash
npm run typecheck
npm run android
npm run ios
npm run web
```

`npm run android` first synchronizes the generated Android project and then
updates the existing development app. It does not intentionally uninstall the
app, so its saved session is retained. Avoid uninstalling the app or clearing
its device storage when you want to keep the local sign-in.

Google OAuth must include the app's configured native package/bundle IDs and
scheme (`com.bestfriends.bloom`). The web client ID must not be used as the
Android or iOS client ID.

## Testing and builds

Run backend verification from `backend/`:

```bash
dotnet build Bloom.slnx --no-restore
dotnet test Bloom.slnx --no-build --no-restore
```

Mobile changes are checked automatically by `.github/workflows/verify-mobile.yml`
on pull requests and pushes to `main`. It runs TypeScript validation and an
Android JavaScript bundle export without consuming an EAS build.

The manually triggered `.github/workflows/build-mobile-android.yml` workflow
uses EAS to create an APK artifact and a GitHub Release. Configure the selected
GitHub Environment with:

- `EXPO_TOKEN`
- `BLOOM_MOBILE_API_URL`
- `BLOOM_GOOGLE_ANDROID_CLIENT_ID`
- `BLOOM_GOOGLE_IOS_CLIENT_ID` (when needed)
- `BLOOM_GOOGLE_WEB_CLIENT_ID` (when needed)

The workflow only asks for `uat` or `prod`; no version input is required.
`app.json` supplies the user-facing app version and EAS remotely increments the
Android `versionCode` for every build. GitHub Release tags and APK filenames are
generated from both values, for example `mobile-v0.1.0-uat.12` and
`bloom-v0.1.0-uat-12.apk`. UAT releases
are automatically marked as prereleases, while production releases are marked
as full releases.

## Backend deployment

The backend deployment workflow builds a Docker image and deploys it to the
selected GitHub Environment. Follow
[`backend/deploy/README.md`](backend/deploy/README.md) for VPS setup, ports,
`.env` configuration, PostgreSQL persistence, upload storage, and Nginx/reverse
proxy considerations.

The default deployment ports are:

- Bloom API: host `28100` -> container `8080`
- Bloom PostgreSQL: host `28101` -> container `5432`

Uploaded files are stored on the host path configured by `BLOOM_UPLOADS_PATH`.
PostgreSQL data is stored on the host path configured by `POSTGRES_DATA_PATH`.

## Security notes

- Do not commit `.env`, signing keys, database passwords, refresh tokens, or Google private credentials.
- Use a random `Bloom__SessionSigningKey` with at least 32 characters.
- Keep upload and PostgreSQL directories backed up and access-controlled.
- Keep `Bloom__ApplyMigrationsOnStartup=false` after an intentional migration.
