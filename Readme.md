# Dealbreaker

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A React Native mobile application for managing relationship flags and dealbreakers, built with Expo.

## Description

Dealbreaker is a mobile application that allows users to create and manage red, yellow, and white flags or dealbreakers in relationships. Users can add custom flags with descriptions, categorize them, and organize them across different profiles.

## Features

- Create and manage flags/dealbreakers with detailed descriptions
- Multiple profile support to track flags for different people
- Offline support with data syncing when online
- Cloud storage and synchronization
- Navigation drawer interface
- Form validation
- Toast notifications
- Responsive UI design
- Image uploading capability
- Network status monitoring

## Technologies Used

- React Native
- Expo
- React Navigation (Drawer)
- React Native Radio Buttons Group
- React Native Toast Message
- React Native Reanimated
- React Native Gesture Handler
- Expo Image Picker
- AsyncStorage for local data persistence
- Axios for API requests
- MongoDB (backend database)
- Express.js (backend API)
- Mongoose (MongoDB ODM)
- NetInfo for network connectivity detection
- Styled Components

## Backend API

The application includes a Node.js backend API (dealbreaker-api) that provides:
- MongoDB integration for cloud data storage
- RESTful API endpoints for data synchronization
- Flag history tracking

## Prerequisites

- Node.js
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS) or Android Emulator (for Android)
- MongoDB Atlas account (for backend)

## Installation

1. Clone the repository

```bash
git clone https://github.com/JaceG/Dealbreaker.git
cd Dealbreaker
```

2. Install dependencies

```bash
npm install
# or
yarn install
```

3. Configure environment variables
   - Create a `.env` file in the root directory
   - Set up your backend API connection variables

4. Start the development server

```bash
npm start
# or
yarn start
```

5. Setup the backend API (optional for full functionality)

```bash
cd dealbreaker-api
npm install
npm start
```

## Usage

After starting the development server:

1. Use the Expo Go app on your mobile device to scan the QR code, or

2. Press 'i' for iOS simulator or 'a' for Android emulator

3. Use the drawer navigation to switch between screens:
   - Flags List: View all your created flags
   - Create Flag: Add new flags or dealbreakers
   - Create Profile: Manage different profiles

## Available Scripts

- `npm start` or `yarn start`: Start the Expo development server
- `npm run android` or `yarn android`: Start the Android development build
- `npm run ios` or `yarn ios`: Start the iOS development build
- `npm run web` or `yarn web`: Start the web development build

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

Project Link: [https://github.com/JaceG/Dealbreaker](https://github.com/JaceG/Dealbreaker)
