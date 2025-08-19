# Dealbreaker

A modern React Native application for tracking relationship flags and dealbreakers with advanced board management, offline-first capabilities, and cloud synchronization.

## Overview

Dealbreaker is a sophisticated mobile application that helps users track and manage relationship flags (warning signs) and dealbreakers (non-negotiable issues) through an intuitive kanban-style board interface. The app features multi-profile support, offline-first architecture, real-time synchronization, and comprehensive history tracking.

## ✨ Key Features

### 🎯 Core Functionality
- **Flag & Dealbreaker Management**: Create, edit, and organize relationship warning signs and dealbreakers
- **Kanban Board Interface**: Interactive drag-and-drop board with smooth animations and transitions
- **Multi-Profile Support**: Create and manage multiple profiles for different relationships or situations
- **Flag Transition System**: Move flags between states with reason tracking and history logging

### 🔐 Authentication & Security
- **Google OAuth Integration**: Secure authentication with Google Sign-In
- **JWT Token Management**: Secure token storage using Expo SecureStore
- **Guest Mode**: Optional guest access for trying the app without registration

### 📱 User Experience
- **Offline-First Architecture**: Full functionality without internet connection
- **Real-Time Synchronization**: Automatic sync when online with conflict resolution
- **Responsive Design**: Optimized for both portrait and landscape orientations
- **Modern UI/UX**: Clean, intuitive interface with smooth animations

### 📊 Advanced Features
- **Comprehensive History Tracking**: Complete audit trail of all flag changes and transitions
- **Image Attachments**: Add photos to flag history entries with S3 cloud storage
- **Network Status Awareness**: Smart handling of online/offline states
- **Data Export/Import**: Backup and restore capabilities
- **Toast Notifications**: Real-time feedback for user actions

## 🏗️ Architecture

### Frontend Stack
- **React Native 0.76.9** with Expo SDK 52
- **TypeScript** for type safety and better development experience
- **Expo Router** for file-based navigation
- **Styled Components** for component styling
- **Context API + Custom Hooks** for state management

### Backend Integration
- **REST API** hosted on Render (`https://dealbreaker-api.onrender.com`)
- **MongoDB Atlas** for cloud data storage
- **AWS S3** for image storage and attachments
- **JWT Authentication** for secure API access

### Key Libraries
- **@react-native-google-signin/google-signin**: Google OAuth authentication
- **@react-native-async-storage/async-storage**: Local data persistence
- **@react-native-community/netinfo**: Network connectivity monitoring
- **react-native-gesture-handler**: Advanced touch interactions
- **expo-image-picker**: Camera and photo library access
- **react-native-toast-message**: User notifications

## 📁 Project Structure

```
Dealbreaker/
├── app/                           # Main application screens (Expo Router)
│   ├── (tabs)/                   # Tab-based navigation
│   │   ├── index.tsx             # Home screen with kanban board
│   │   ├── create-flag/          # Flag creation screen
│   │   └── create-profile/       # Profile creation screen
│   ├── login/                    # Authentication screens
│   ├── register/
│   └── _layout.tsx              # Root layout with providers
├── components/                   # Reusable UI components
│   ├── AppButton/               # Custom button component
│   ├── BoardManagementModals/   # Board interaction modals
│   ├── DealbreakerAlert/        # Transition confirmation
│   ├── EditItemModal/           # Flag editing interface
│   ├── FlagHistoryModal/        # History viewing modal
│   └── ...                     # Additional UI components
├── libs/board/                  # Kanban board library
│   ├── components/             # Board, Column, Card components
│   ├── assets/                 # Board-specific assets
│   └── constants/              # Board styling and configuration
├── hooks/                      # Custom React hooks
│   ├── boardManagement/        # Board operation hooks
│   ├── useAuthActions.tsx      # Authentication logic
│   ├── useNetworkSync.tsx      # Offline sync management
│   └── ...                    # Feature-specific hooks
├── context/                    # React Context providers
│   ├── Auth/                   # Authentication context
│   └── FlagContext/           # Flag management context
├── models/                     # TypeScript type definitions
├── utils/                      # Utility functions
│   ├── api/                   # API integration
│   ├── mongodbapi/           # MongoDB direct integration
│   └── storage/              # Local storage utilities
└── constants/                 # App-wide constants
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (macOS) or Android Emulator
- Expo Go app for physical device testing

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/JaceG/Dealbreaker.git
   cd Dealbreaker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file with necessary environment variables:
   ```
   EXPO_PUBLIC_OAUTH_IOS_CLIENT_ID=your_ios_client_id
   EXPO_PUBLIC_OAUTH_EXPO_CLIENT_ID=your_expo_client_id
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run on device/simulator**
   - iOS: `npm run ios` or scan QR code with Camera app
   - Android: `npm run android` or scan QR code with Expo Go
   - Web: `npm run web`

## 📱 Usage Guide

### Getting Started
1. **Authentication**: Sign in with Google or use guest mode
2. **Create Profile**: Set up your first profile for tracking flags
3. **Add Flags**: Create warning signs or dealbreakers with descriptions
4. **Manage Board**: Drag flags between columns to change status
5. **View History**: Access complete history of flag changes and transitions

### Key Workflows

#### Creating a Flag
1. Navigate to "Create Flag" tab
2. Enter flag name and description
3. Select type (Flag or Dealbreaker)
4. Submit to add to your board

#### Managing Flags
1. View flags on the kanban board (Home tab)
2. Drag flags between columns to change status
3. Add reasons when transitioning flags
4. Attach images to provide context
5. Edit or delete flags as needed

#### Profile Management
1. Create multiple profiles for different relationships
2. Switch between profiles to view different flag sets
3. Edit profile names and settings
4. Data automatically syncs across devices

## 🔧 Development

### Key Concepts

#### Offline-First Architecture
The app is designed to work seamlessly offline:
- All data stored locally using AsyncStorage
- Background sync when network is available
- Conflict resolution for concurrent changes
- Pending changes queue for offline operations

#### State Management
- Context API for global state (auth, flags, profiles)
- Custom hooks for business logic encapsulation
- Local storage integration for persistence
- Real-time updates across components

#### Board Management
- Custom kanban board implementation
- Drag-and-drop with gesture handling
- Smooth animations and transitions
- Column-based organization (flags → dealbreakers)

### API Integration

The app integrates with a Node.js backend API:
- **Authentication**: JWT token-based auth
- **Data Sync**: RESTful endpoints for CRUD operations
- **History Tracking**: Comprehensive audit logging
- **File Upload**: S3 integration for image attachments

### Build & Deployment

#### EAS Build Configuration
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

#### Building for Production
```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production

# Submit to app stores
eas submit --platform all
```

## 🛠️ Technologies & Dependencies

### Core Framework
- **React Native 0.76.9**: Latest stable RN with new architecture support
- **Expo SDK 52**: Latest Expo with modern tooling
- **TypeScript 5.8**: Full type safety throughout the application

### State Management & Navigation
- **Expo Router 4.0**: File-based routing system
- **React Context API**: Global state management
- **React Navigation 7.1**: Tab and stack navigation

### UI & Styling
- **Styled Components 5.3**: CSS-in-JS styling
- **React Native Gesture Handler 2.20**: Advanced touch interactions
- **React Native Reanimated** (via Expo): Smooth animations

### Data & Storage
- **AsyncStorage 1.23**: Local data persistence
- **Expo SecureStore 14.0**: Secure token storage
- **Axios 1.8**: HTTP client for API communication

### Authentication & Security
- **Google Sign-In 15.0**: OAuth authentication
- **Expo Auth Session 6.0**: OAuth flow management
- **JWT**: Token-based authentication

### Media & Files
- **Expo Image Picker 16.0**: Camera and photo library access
- **Expo File System 18.0**: File operations and caching

### Development Tools
- **TypeScript**: Static type checking
- **Babel 7.25**: JavaScript compilation
- **Metro**: React Native bundler

## 🚀 Deployment

The app is configured for deployment using:
- **Expo Application Services (EAS)**: Build and submission pipeline
- **Render**: Backend API hosting
- **MongoDB Atlas**: Cloud database
- **AWS S3**: File storage for attachments

## 📋 Current Status

This is **Dealbreaker v3**, representing the third iteration of the application with significant architectural improvements:
- ✅ Modern React Native and Expo SDK
- ✅ TypeScript implementation throughout
- ✅ Offline-first architecture with sync
- ✅ Advanced board management system
- ✅ Google OAuth integration
- ✅ Multi-profile support
- ✅ Comprehensive history tracking
- ✅ Cloud backend integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, questions, or contributions, please open an issue on GitHub or contact the development team.