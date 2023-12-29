
# MovieMatchApp

MovieMatchApp is a mobile application designed for movie and TV show enthusiasts. It provides a platform for users to discover new titles, create watchlists, and connect with friends over shared interests in movies and TV shows.

## Features

- **User Authentication**: Secure login and registration process using Firebase Authentication.
- **Profile Customization**: Users can set up and edit their profiles, including preferences for streaming services and genres.
- **Swipeable Cards**: Users can swipe through a deck of movie and TV show cards, swiping right to like (add to watchlist) and left to dislike.
- **Dynamic Watchlists**: Users can maintain a list of liked titles, which gets updated in real-time based on their interactions.
- **Friends Activity Feed**: A live feed shows friends' activities like recently watched shows or newly added titles to their watchlists.
- **Matches**: When two friends like the same title, a match is created, allowing them to plan watch parties or discuss the title.
- **Integration with TMDB API**: Fetches and displays up-to-date information about movies and TV shows.

## Development Process

The development of MovieMatchApp involved several key steps:

1. **Setting Up the Environment**: Utilizing React Native, Firebase for backend services, and TMDB API for fetching movie data.
2. **User Interface Design**: Crafting intuitive and engaging UI with a focus on user experience.
3. **Implementing Features**: Building out the app's functionalities, such as swipeable cards, user profiles, and matches.
4. **Testing**: Rigorous testing was conducted to ensure functionality and user experience, including using test data in Firestore.

## Usage Instructions

1. **Installation**: Download the app from the App Store or Google Play.
2. **Registration and Login**: Create an account or log in using existing credentials.
3. **Profile Setup**: Customize your profile by selecting preferred streaming services and genres.
4. **Exploring Titles**: Swipe through the deck of titles, like or dislike them based on your interest.
5. **Watchlist**: Access your watchlist to view titles you've liked.
6. **Matches and Friends Activity**: Check out matches with friends and their recent activities.

## Future Updates

- Chat functionality for matched titles.
- More personalized recommendations based on user preferences.
- Integration with additional streaming platforms.

## Contributions

Contributions to the MovieMatchApp are welcome. Please read our contribution guidelines before submitting a pull request.

## License

[MIT License](LICENSE.txt)

---

```
MovieMatchApp
├─ .git
├─ .gitignore
├─ .vscode
│  └─ .react
├─ App.js
├─ README.md
├─ assets
│  ├─ adaptive-icon.png
│  ├─ default_image.jpeg
│  ├─ favicon.png
│  ├─ fonts
│  │  ├─ WorkSans-Black.ttf
│  │  ├─ WorkSans-Bold.ttf
│  │  ├─ WorkSans-ExtraLight.ttf
│  │  ├─ WorkSans-Italic.ttf
│  │  ├─ WorkSans-Light.ttf
│  │  ├─ WorkSans-Medium.ttf
│  │  ├─ WorkSans-Regular.ttf
│  │  └─ WorkSans-Thin.ttf
│  ├─ header_default.png
│  ├─ icon.png
│  ├─ profile_default.jpg
│  ├─ splash.png
│  ├─ still_1.jpg
│  ├─ still_1.png
│  ├─ watchlist_1.jpg
│  └─ watchlist_1.png
├─ babel.config.js
├─ components
│  ├─ CategoryButton.jsx
│  ├─ CategoryTabs.jsx
│  ├─ NavigationBar.jsx
│  ├─ SearchIcon.jsx
│  └─ SwipeableCard.js
├─ context
│  └─ MoviesContext.js
├─ firebaseConfig.js
├─ metro.config.js
├─ navigation
│  └─ AppNavigator.js
├─ package-lock.json
├─ package.json
├─ screens
│  ├─ DetailScreen.js
│  ├─ ForgotPasswordScreen.js
│  ├─ HomeScreen.js
│  ├─ LoginScreen.js
│  ├─ MatchesScreen.js
│  ├─ MyCaveScreen.js
│  ├─ ProfileSetupScreen.js
│  └─ RegisterScreen.js
├─ services
│  └─ api.js
└─ utils

```