# 🎬 MovieMatchApp

<p align="center">
  <img src="https://github.com/ebarcly/MovieMatchApp/blob/7fe7f5e3305af203298703614bb7cbb1c4018da6/assets/app_logo.png" alt="MovieMatchApp Logo" width="200"/>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#installation">Installation</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#roadmap">Roadmap</a> •
  <a href="#license">License</a>
</p>

## 🎯 About

MovieMatchApp is your go-to platform for discovering and sharing movies and TV shows with friends. Think Tinder meets IMDb – swipe through titles, match with friends who share your taste, and never miss out on great content again!

## ✨ Features

### Current Features

- 🔐 **Secure Authentication** - Firebase-powered user authentication
- 👤 **Profile Customization** - Personalized streaming preferences and genre selection
- 🎴 **Interactive Swiping** - Tinder-style card swiping for movies/shows
- 📋 **Smart Watchlists** - Real-time updated lists of liked content
- 👥 **Social Features** - Friend activity feed and matching system
- 🎥 **TMDB Integration** - Rich, up-to-date movie and show information

### 🚧 Under Development

- 💬 In-app chat system
- 🎯 Advanced recommendation algorithm
- 📱 Cross-platform streaming service integration

## 🚀 Getting Started

### Prerequisites

- **Node.js 20** (pinned via `.nvmrc`; Expo SDK 53 officially supports 18/20). On Windows use [nvm-windows](https://github.com/coreybutler/nvm-windows): `nvm install 20 && nvm use 20`.
- **npm** (ships with Node).
- **Expo Go** on your phone (iOS App Store / Google Play) — simplest path. Scanning the QR on the Metro console launches the app.
- **No Expo CLI global install needed** — use `npx expo ...`.

### Installation

```bash
git clone https://github.com/ebarcly/MovieMatchApp.git
cd MovieMatchApp
npm install
cp .env.example .env
```

Then fill in `.env` with your TMDB key and Firebase web config (see [Environment](#environment) below).

### Running the app

```bash
npx expo start --tunnel
```

- Scan the QR code with **Expo Go** on your phone (fastest and works over any network).
- Press `a` to open in an Android emulator (requires Android Studio).
- `--tunnel` is useful on Windows when your phone and dev machine are on different Wi-Fi networks; drop it if you're on the same LAN for faster HMR.

### Platform notes

- **Windows**: no iOS simulator available. Use Expo Go or an Android emulator (Android Studio → Device Manager). Metro works fine on Windows; if you hit Windows Defender slowdowns on `node_modules`, exclude the project directory from real-time scanning.
- **macOS**: `i` opens the iOS simulator (requires Xcode).

### Environment

All secrets are read from `.env` at build time and exposed via `app.config.js` under `expo.extra`. Variable names use the `EXPO_PUBLIC_*` prefix (see `.env.example`). Never commit `.env`.

- TMDB key: [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
- Firebase web config: Firebase Console → Project Settings → General → Your apps → Web app

### Scripts

| Command                                                        | What it does                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------- |
| `npm start`                                                    | `npx expo start` (alias for Metro + QR)                       |
| `npx expo start --tunnel`                                      | Metro with ngrok tunnel (easiest on Windows / mixed networks) |
| `npx eslint .`                                                 | Lint all source                                               |
| `npx prettier --check .`                                       | Verify formatting                                             |
| `npx prettier --write .`                                       | Auto-format                                                   |
| `npx firebase deploy --only firestore:rules,firestore:indexes` | Ship Firestore rules/indexes (requires `firebase login`)      |

## 🤝 Contributing

I'm actively looking for contributors! Whether you're a developer, designer, or movie enthusiast, there are many ways to help:

### Areas We Need Help With

- Implementing chat functionality

- Enhancing recommendation algorithm

- UI/UX improvements

- Adding more streaming service integrations

- Writing tests

- Documentation

### How to Contribute

1. Fork the repository

2. Create your feature branch

```bash
git checkout -b feature/AmazingFeature
```

3. Make your changes

4. Commit your changes

```bash
git commit -m 'Add some AmazingFeature'
```

5. Push to the branch

```bash
git push origin feature/AmazingFeature
```

6. Open a Pull Request

```bash
git checkout -b feature/AmazingFeature
```

7. Describe your changes and submit the pull request.

Check out our Contributing Guidelines for more details.

<!-- ## 📅 Roadmap
- [ ] Implement in-app chat system
- [ ] Advanced recommendation algorithm
- [ ] Cross-platform streaming service integration
- [ ] User feedback and rating system
- [ ] Enhanced search functionality
- [ ] Dark mode and accessibility features
- [ ] More social features (e.g., group watch)
- [ ] Performance optimizations
- [ ] Bug fixes and maintenance
- [ ] Regular updates with new features based on user feedback
- [ ] Expand to web and desktop platforms
- [ ] Collaborate with streaming services for exclusive content
- [ ] Explore partnerships with movie studios for early access to content
- [ ] Community-driven features and suggestions -->

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

🙏 Acknowledgments
TMDB for their comprehensive movie database

Our amazing contributors and supporters

<p align="center">
Made with ❤️ by Enrique Barclay and the MovieMatchApp team
</p>
