# NightLife NYC — Setup Guide

Complete step-by-step instructions to configure NeonDB, Resend email OTP, video storage, Apple Developer, and all environment variables.

---

## 1. NeonDB (Postgres) + Prisma Migrations

### Create a Neon project

1. Go to [https://neon.tech](https://neon.tech) and sign up / log in.
2. Click **New Project** → choose a name (e.g. `nightlife-nyc`) and region close to your backend host.
3. On the project dashboard, copy the **connection string** (use the **pooled** connection string for serverless backends like Render/Railway).

   Format:
   ```
   postgresql://USER:PASSWORD@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

### Configure the backend

```bash
cd backend
cp .env.example .env
```

Paste your Neon connection string into `.env`:

```env
DATABASE_URL="postgresql://..."
```

### Run migrations

```bash
npm install
npm run db:generate
npm run db:deploy    # production / first deploy
# OR for local dev with migration history:
npm run db:migrate   # runs `prisma migrate dev`

npm run db:seed      # seeds 10 NYC venues
```

### Verify

```bash
npm run db:studio    # opens Prisma Studio in browser
npm run dev          # API at http://localhost:3001
curl http://localhost:3001/health
```

---

## 2. Email OTP Verification (Resend)

Auth uses **email + 6-digit OTP** sent via Resend (no phone numbers).

### Set up Resend

1. Sign up at [https://resend.com](https://resend.com).
2. Create an API key under **API Keys**.
3. For production, verify a sending domain under **Domains**.
4. For quick testing, use Resend's sandbox sender: `onboarding@resend.dev` (can only send to the email on your Resend account until a domain is verified).

### Configure backend `.env`

```env
RESEND_API_KEY="re_xxxxxxxx"
EMAIL_FROM="NightLife NYC <onboarding@resend.dev>"
REWARD_CLAIM_EMAIL="gavinwright957@gmail.com"
```

### API flow

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/send-otp` | `{ "email": "you@example.com" }` |
| `POST /api/auth/verify-otp` | `{ "email": "you@example.com", "code": "123456" }` |
| `POST /api/auth/register` | `{ "email", "username", "fullName", "birthday" }` for new users |

Rate limit: max **3** code sends per email per **15 minutes**.

---

## 3. Reward Claim Emails

When a user taps **Claim Reward** in the app, the backend sends an email to `REWARD_CLAIM_EMAIL` with their username, email, and reward tier.

---

## 4. Cloudflare R2 or AWS S3 (Video Storage)

Videos are **not** stored in Postgres — only the URL is saved. The backend generates **signed PUT URLs** for direct upload from the mobile app.

### Option A: Cloudflare R2 (recommended)

1. Cloudflare Dashboard → **R2** → **Create bucket** (e.g. `nightlife-videos`).
2. **Manage R2 API Tokens** → Create token with Object Read & Write on that bucket.
3. Note: Account ID, Access Key ID, Secret Access Key.
4. Enable **Public access** on the bucket (or connect a custom domain) for playback URLs.
5. Copy the public bucket URL (e.g. `https://pub-xxx.r2.dev`).

```env
STORAGE_PROVIDER="r2"
S3_BUCKET="nightlife-videos"
S3_REGION="auto"
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."
S3_ENDPOINT="https://ACCOUNT_ID.r2.cloudflarestorage.com"
S3_PUBLIC_URL="https://pub-xxx.r2.dev"
```

### Option B: AWS S3

1. Create an S3 bucket with appropriate CORS for mobile PUT uploads.
2. Create an IAM user with `s3:PutObject` permission.
3. Configure:

```env
STORAGE_PROVIDER="s3"
S3_BUCKET="nightlife-videos"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY=""
S3_ENDPOINT=""
S3_PUBLIC_URL="https://nightlife-videos.s3.us-east-1.amazonaws.com"
```

### CORS example (R2 / S3)

Allow `PUT` from your app origins:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## 5. Apple Developer + EAS Submit Requirements

Before `eas submit` works for TestFlight, you need:

### Apple Developer Program

- Enroll at [https://developer.apple.com/programs/](https://developer.apple.com/programs/) ($99/year).

### Bundle ID

- The app uses `com.nightlife.nyc` (set in `mobile/app.config.ts`).
- Register it in [Certificates, Identifiers & Profiles → Identifiers](https://developer.apple.com/account/resources/identifiers/list).

### App Store Connect app record

1. Go to [App Store Connect](https://appstoreconnect.apple.com).
2. **My Apps → + → New App**.
3. Platform: iOS, Bundle ID: `com.nightlife.nyc`, SKU: e.g. `nightlife-nyc`.

### Values for `eas.json`

| Field | Where to find it |
|-------|------------------|
| `appleId` | Your Apple ID email |
| `appleTeamId` | [Membership details](https://developer.apple.com/account) → Team ID |
| `ascAppId` | App Store Connect → your app → **App Information → Apple ID** (numeric) |

### EAS project setup

```bash
cd mobile
npm install -g eas-cli
eas login
eas init          # creates EAS project, updates app.config.ts extra.eas.projectId
```

Update `mobile/eas.json` submit section with your Apple credentials.

---

## 6. All Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `PORT` | No | Default `3001` |
| `NODE_ENV` | No | `development` or `production` |
| `JWT_SECRET` | Yes | Long random string for auth tokens |
| `JWT_EXPIRES_IN` | No | Default `30d` |
| `RESEND_API_KEY` | Yes | Resend API key (OTP + reward emails) |
| `EMAIL_FROM` | Yes | Sender address for Resend |
| `REWARD_CLAIM_EMAIL` | Yes | Inbox for reward claim notifications |
| `STORAGE_PROVIDER` | Yes | `r2` or `s3` |
| `S3_BUCKET` | Yes | Bucket name |
| `S3_REGION` | Yes | Region (`auto` for R2) |
| `S3_ACCESS_KEY_ID` | Yes | Storage access key |
| `S3_SECRET_ACCESS_KEY` | Yes | Storage secret key |
| `S3_ENDPOINT` | R2 only | R2 endpoint URL |
| `S3_PUBLIC_URL` | Yes | Public base URL for video playback |
| `RESEND_API_KEY` | Yes | Resend API key |
| `REWARD_CLAIM_EMAIL` | Yes | `gavinwright957@gmail.com` |
| `EMAIL_FROM` | Yes | Verified sender address |
| `CORS_ORIGIN` | No | Default `*` |

### Mobile (`mobile/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Yes | Backend URL (see below) |

**Local dev tips:**

| Scenario | `EXPO_PUBLIC_API_URL` |
|----------|------------------------|
| iOS Simulator | `http://localhost:3001` |
| Physical device | `http://YOUR_LAN_IP:3001` (e.g. `http://192.168.1.42:3001`) |
| Production | `https://your-api.onrender.com` |

---

## Build & Run Commands

### Backend

```bash
cd backend
npm run dev          # development with hot reload
npm run build && npm start   # production
```

Deploy to **Render** or **Railway**: set root to `backend`, build `npm install && npm run db:deploy && npm run build`, start `npm start`.

### Mobile — Expo Go (quick dev)

```bash
cd mobile
cp .env.example .env
npm start
# Scan QR with Expo Go app
```

> Camera, location, and secure store work best in a **development build**, not Expo Go.

### Mobile — Native iOS (Xcode)

```bash
cd mobile
npx expo prebuild --platform ios
open ios/NightLifeNYC.xcworkspace
```

Build and run from Xcode on simulator or device.

### Mobile — EAS Build (TestFlight)

```bash
cd mobile
eas build --platform ios --profile production
```

### Mobile — EAS Submit (TestFlight)

```bash
cd mobile
eas submit --platform ios --profile production
```

Or submit a specific build:

```bash
eas submit --platform ios --latest
```

---

## App Features Summary

| Feature | Points |
|---------|--------|
| Submit rating (location-verified) | +10 |
| Submit video (optional, max 10s) | +25 |
| Reward tier 1 | 5 videos → 1 free drink |
| Reward tier 2 | 7 videos → 2 free drinks |
| Reward tier 3 | 10 videos → 3 free drinks |

Location check-in radius: **75 meters** (Haversine, verified client + server).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| OTP not received | Check `RESEND_API_KEY`; sandbox sender only delivers to your Resend account email |
| `Network request failed` on device | Use LAN IP, not `localhost` |
| Video upload fails | Check R2/S3 CORS and credentials |
| Location check-in never triggers | Grant location permission; must be within 75m of a seeded venue |
| EAS submit fails | Confirm bundle ID, Team ID, and ASC app record match |
