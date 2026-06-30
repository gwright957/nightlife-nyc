# NightLife NYC

Live bar & club vibe tracker for NYC — React Native (Expo) mobile app + Express/Prisma backend.

## Project structure

```
poppin/
├── mobile/          # Expo React Native app (TypeScript)
├── backend/         # Express API + Prisma + Resend + R2/S3
└── SETUP.md         # Full setup guide (Neon, Resend, storage, Apple, env vars)
```

## Quick start

### Backend

```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL and other keys (see SETUP.md)
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

### Mobile

```bash
cd mobile
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to your backend URL
npm start
```

## Build & deploy commands

| Task | Command |
|------|---------|
| Run in Expo Go | `cd mobile && npm start` |
| Generate native iOS project | `cd mobile && npx expo prebuild --platform ios` |
| Open in Xcode | `open mobile/ios/NightLifeNYC.xcworkspace` |
| EAS iOS build | `cd mobile && eas build --platform ios --profile production` |
| Submit to TestFlight | `cd mobile && eas submit --platform ios --profile production` |

See **SETUP.md** for NeonDB, Resend, R2/S3, Apple Developer, and all environment variables.
