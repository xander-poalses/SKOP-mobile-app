# SKOP | Kick the Urge

<p align="center">
  <img src="assets/images/SKOP-WordLogo-withSloganExpanded.svg" alt="SKOP, kick the urge" width="1200" />
</p>

SKOP is a cross-platform nicotine support app for people who want to stop smoking, stop vaping, or reduce before a target quit date. It combines a quit plan, progress and spending tracking, support guidance, and a swipe-controlled distraction game called Breakout.

The name **SKOP** comes from the Afrikaans word for "kick". The app supports phone and tablet layouts in portrait and landscape.

## Contents

- [Why SKOP](#why-skop)
- [Inspiration cards](#inspiration-cards)
- [Core features](#core-features)
- [App mockups](#app-mockups)
- [How the app works](#how-the-app-works)
- [Tech stack](#tech-stack)
- [Run the project](#run-the-project)
- [Tests and checks](#tests-and-checks)
- [Known limitations](#known-limitations)
- [Future roadmap](#future-roadmap)
- [Demonstration video](#demonstration-video)

## Why SKOP

Nicotine urges do not last the same amount of time for every person. Many quit apps centre on a cold-turkey streak, which can leave out people who want to reduce first. SKOP supports three paths: already quit, ready to quit, and cut down first. Breakout remains available in each path as a distraction when the user needs it.

## Inspiration cards

This project started from three inspiration cards:

- **Habit Builder:** reinterpreted as helping a person break a nicotine habit and build a quit plan.
- **Timer/Clock:** used for streaks, target-date countdowns, game time, and session records.
- **Landscape Support:** used across the app and made part of Breakout, which is played in landscape.

## Core features

- Email and password accounts with Firebase Authentication and email verification
- Age-aware account flow with youth support and guardian consent for users aged 13 to 17
- Cigarette, vaping, or combined nicotine plans
- Already quit, ready to quit, and cut-down journeys
- Quit streaks and target-date countdowns
- Estimated money saved after a confirmed quit
- Daily, weekly, or monthly spending check-ins
- Local check-in caching and Firestore sync
- Optional local check-in reminders
- Breakout game with swipe controls, generated routes, scoring, levels, and session recording
- Session insights, recent sessions, time totals, and urge guidance
- Responsive phone and tablet layouts in portrait and landscape

## App mockups

<p align="center">
  <img src="Mockups/LandingScreen.png" alt="SKOP landing screen mockup" />
</p>

<br />

<p align="center">
  <img src="Mockups/GameScreens.png" alt="SKOP Breakout game mockup" />
</p>

<br />

<p align="center">
  <img src="Mockups/MainScreens.png" alt="SKOP home and insights screen mockups" />
</p>

<br />

<p align="center">
  <img src="Mockups/OnboardingScreens.png" alt="SKOP onboarding screen mockups" />
</p>

## How the app works

1. The user creates and verifies an account.
2. Onboarding records age support needs, nicotine product, quit approach, target or quit date, and a spending baseline.
3. The home screen shows a streak or target countdown, spending progress, and SKOP sessions.
4. A user can open Breakout during an urge and guide the marker through a generated route in landscape.
5. The insights screen summarises sessions, time in SKOP, recent activity, and support guidance.
6. Firestore stores account data while AsyncStorage supports local caching and later sync.

## Tech stack

| Area | Technology |
| --- | --- |
| App | React Native 0.88 and React 19.3 |
| Tooling | Expo SDK 58 |
| Navigation | Expo Router 58 |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore |
| Local cache | AsyncStorage |
| Notifications | Expo Notifications 58, local reminders only |
| Testing | Jest and Jest Expo |
| Language | TypeScript |

## Run the project

### Requirements

- Node.js 22.13 or newer on the Node 22 line, Node 24.3 or newer, or Node 26 and newer
- npm
- Expo Go with SDK 58 support, or an SDK 58 development build
- An Android or iOS device on the same network as the development computer

SKOP uses the Expo CLI installed inside the project. A global `expo-cli` install is not required.

### Install

```bash
git clone https://github.com/241322/SKOP-mobile-app.git
cd SKOP-mobile-app
npm install
```

The Firebase client configuration required by the app is included in the repository. No `.env` file or Firebase service account is needed to assess the app. Firebase client keys identify the Firebase project, while Firebase Authentication and Firestore rules control access to user data.

### Expo Go

```bash
npm run mobile
```

Scan the QR code with Expo Go. If Metro has stale cached files, run:

```bash
npm run mobile:clear
```

The project uses LAN mode. Keep the phone and development computer on the same network.

### Web

```bash
npm run web
```

Expo opens the web app at `http://localhost:8081`.

### Troubleshooting

- If Expo reports stale files or an old asset, stop Metro and run `npm run mobile:clear`.
- If Expo returns `TypeError: fetch failed`, confirm that `https://api.expo.dev` opens on the development computer, then restart the terminal and Metro.
- The computer and phone must be on the same network when using Expo Go over LAN.
- SKOP uses local notifications, which Expo Go supports. It does not request an Expo push token or use remote push notifications.
- SKOP imports only the local notification files it needs because some Expo Go builds do not include the topic-subscription native module loaded by the package entry point.
- If Expo Go reports an SDK mismatch, update Expo Go. During the SDK 58 store rollout, use an SDK 58 development build until the matching Expo Go version reaches the device's app store.

## Firebase behaviour

- Accounts use email and password authentication.
- New accounts must verify their email before profile data can be stored or read.
- User profiles, SKOP sessions, and spending check-ins are stored in Firestore.
- AsyncStorage keeps local session and check-in data available while the device is offline.
- Cached data syncs after authentication and network access return.
- Firestore rules restrict each signed-in user to their own profile, sessions, and check-ins.
- Firebase Admin credentials and private signing keys are not stored in this repository.

## Tests and checks

```bash
npm test
npm run lint
npx tsc --noEmit
npx expo-doctor
npx expo export --platform all --clear
```

The Jest suite covers journey date rules, age groups, spending calculations, completed check-in periods, and streak calculations. Expo Doctor checks SDK package compatibility. The export command verifies Android, iOS, and web bundles.

## Platform notes

- **Android:** tested through Expo Go on a Samsung S23 FE before the SDK 58 upgrade, including portrait and landscape layouts. The SDK 58 Android bundle exports without errors and supports Android 7 and newer.
- **Web:** supported through React Native Web and Expo Router static web output. The SDK 58 web bundle exports without errors.
- **iOS:** configured through Expo and React Native with tablet support. The SDK 58 iOS bundle exports without errors and supports iOS 16.4 and newer, but runtime testing has not been completed because an Apple test device and macOS build machine were not available.
- **Tablets:** responsive layouts are provided for portrait and landscape widths.
- **Breakout:** the game asks the device to use landscape while a session is active.

## Known limitations

- Remote push notifications are not available in Expo Go on Android from SDK 53 onward. SKOP does not use remote push notifications. Local check-in reminders remain available.
- The SDK 58 Expo Go store rollout may lag behind the SDK release. A development build is needed until the installed Expo Go app supports SDK 58.
- iOS runtime behaviour still needs testing on Apple hardware.
- On resizable iOS 27 devices, orientation locking may not force Breakout into landscape. The game still needs testing on that device class.
- Guardian consent is a guardian self-attestation flow. It does not verify government identity or replace legal review.
- Guidance in SKOP is educational and does not replace support from a doctor or pharmacist.

## Future roadmap

### Product ideas

- Add a choice of short distraction games so users can pick the activity that holds their attention.
- Add breathing, grounding, and timed focus activities alongside Breakout.
- Add more check-in views for long-term spending patterns without treating missing check-ins as zero spend.
- Add opt-in milestones that support progress without punishing a reset or missed check-in.
- Expand cigarette, vaping, and combined guidance with review from healthcare and cessation professionals.
- Add Afrikaans and other South African language options.
- Add accessibility settings for text size, contrast, reduced motion, haptics, and game speed.
- Add encrypted data export and account portability tools.

### Cost-dependent work

- Release and test native iOS builds when Apple hardware and an Apple Developer membership are available.
- Use development builds for notification and store-release testing outside Expo Go.
- Add SMS sign-in or multi-factor authentication when Firebase phone authentication and SMS costs can be supported.
- Move guardian approval and sensitive account actions to verified backend workflows when paid Cloud Functions and a consent verification service are available.
- Add crash reporting and product analytics once a privacy review and service budget are in place.

These items are plans, not current app features.

## Demonstration video

**Google Drive link:** <a href="https://drive.google.com/drive/folders/1UdhAVl4E9IVHsXVWEz2zs6hKrmolM5Fb?usp=sharing" target="_blank"> Click Me </a>


## Project structure

```text
app/                 Expo Router screens and layouts
components/skop/     Shared SKOP components
constants/           Theme values and app constants
context/             Authentication and session state
lib/                 Firebase data, domain logic, sync, and reminders
assets/              Icons, images, fonts, and game assets
__tests__/           Jest domain tests
firestore.rules      Firestore access and validation rules
```

## Assessment details

- **Student:** Xander Poalses
- **Student number:** 241322
- **Course:** DV300
- **Assessment:** Theme 3 Summative Assessment, Final Mobile Application
- **Institution:** Open Window
- **Submission:** 19 August 2026

## Brand credit

The SKOP wordmark uses <a href="https://fonts.adobe.com/fonts/droog" target="_blank" rel="noopener noreferrer">Droog</a>, designed by Rian Hughes and published by Device Fonts through Adobe Fonts. The letterforms are stored as vector paths inside the logo artwork. The Droog font files are not bundled with the app.

## Repository

[github.com/241322/SKOP-mobile-app](https://github.com/241322/SKOP-mobile-app)
