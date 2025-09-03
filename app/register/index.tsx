import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Alert,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
// Uncomment these imports
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../context/Auth';
import { router } from 'expo-router';
import { API_BASE_URL } from '../../constants/api';
import * as SecureStore from 'expo-secure-store';
import { AuthContextType } from '../../models/authModels';
import { colors } from '../../libs/board/constants';
import useRegister from '../../hooks/useRegister';
import {
	GoogleSignin,
	statusCodes,
} from '@react-native-google-signin/google-signin';
import useLogin from '../../hooks/useLogin';
import {
	EXPO_PUBLIC_OAUTH_IOS_CLIENT_ID,
	EXPO_PUBLIC_OAUTH_EXPO_CLIENT_ID,
} from '@env';

// Initialize WebBrowser for auth session
WebBrowser.maybeCompleteAuthSession();

// Define types for component props
interface AuthProps {
	navigation: any; // Replace with proper navigation type if available
	onLogin?: () => void;
}

// Define types for Auth context

// Auth component that supports Google signin
const Auth: React.FC<AuthProps> = () => {
	const {
		name,
		setName,
		email,
		setEmail,
		password,
		setPassword,
		localError,
		handleTitlePress,
		handleSubmit,
		isLoading,
	} = useRegister();

	const { socialLogin } = useLogin();
	const [isAppleAvailable, setIsAppleAvailable] = useState(false);

	// Configure Google Sign-In and check Apple availability
	useEffect(() => {
		GoogleSignin.configure({
			iosClientId: EXPO_PUBLIC_OAUTH_IOS_CLIENT_ID,
			webClientId: EXPO_PUBLIC_OAUTH_EXPO_CLIENT_ID,
		});

		// Check if Apple Authentication is available
		const checkAppleAuth = async () => {
			const isAvailable = await AppleAuthentication.isAvailableAsync();
			setIsAppleAvailable(isAvailable);
		};

		checkAppleAuth();
	}, []);

	const promptGoogleSignIn = async () => {
		try {
			await GoogleSignin.hasPlayServices();
			const userInfo = await GoogleSignin.signIn();

			if (userInfo?.data?.user) {
				const { user } = userInfo.data;
				await socialLogin(
					user.email,
					'social_login_placeholder', // Placeholder password for social login
					'user',
					'google',
					user.id,
					user.name || ''
				);
			}
		} catch (error: any) {
			console.error('Google sign-in error:', error);

			if (error.code === statusCodes.SIGN_IN_CANCELLED) {
				// User cancelled the login flow
				console.log('User cancelled Google sign-in');
			} else if (error.code === statusCodes.IN_PROGRESS) {
				Alert.alert('Error', 'Google sign-in is already in progress');
			} else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
				Alert.alert('Error', 'Google Play Services not available');
			} else {
				Alert.alert('Error', 'Failed to sign in with Google');
			}
		}
	};

	const promptAppleSignIn = async () => {
		try {
			const credential = await AppleAuthentication.signInAsync({
				requestedScopes: [
					AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
					AppleAuthentication.AppleAuthenticationScope.EMAIL,
				],
			});

			// Handle successful Apple sign-in
			if (credential) {
				const { user, email, fullName, identityToken } = credential;

				// Create a display name from fullName if available
				let displayName = '';
				if (fullName) {
					const parts = [];
					if (fullName.givenName) parts.push(fullName.givenName);
					if (fullName.familyName) parts.push(fullName.familyName);
					displayName = parts.join(' ');
				}

				// Use email or create a placeholder if not provided
				const userEmail = email || `${user}@privaterelay.appleid.com`;

				await socialLogin(
					userEmail,
					'social_login_placeholder', // Placeholder password for social login
					'user',
					'apple',
					user,
					displayName || 'Apple User'
				);
			}
		} catch (error: any) {
			console.error('Apple sign-in error:', error);

			if (error.code === 'ERR_REQUEST_CANCELED') {
				// User cancelled the sign-in flow
				console.log('User cancelled Apple sign-in');
			} else {
				Alert.alert('Error', 'Failed to sign in with Apple');
			}
		}
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			style={styles.container}>
			<ScrollView contentContainerStyle={styles.scrollContainer}>
				<View style={styles.formContainer}>
					<TouchableOpacity
						onPress={handleTitlePress}
						activeOpacity={0.8}>
						<Text style={styles.title}>Register</Text>
					</TouchableOpacity>

					<TextInput
						style={styles.input}
						placeholder='Name'
						value={name}
						onChangeText={setName}
						autoCapitalize='words'
						editable={!isLoading}
					/>

					<TextInput
						style={styles.input}
						placeholder='Email'
						value={email}
						onChangeText={setEmail}
						keyboardType='email-address'
						autoCapitalize='none'
						editable={!isLoading}
					/>

					<TextInput
						style={styles.input}
						placeholder='Password'
						value={password}
						onChangeText={setPassword}
						secureTextEntry
						editable={!isLoading}
					/>

					{localError ? (
						<Text style={styles.errorText}>{localError}</Text>
					) : null}

					<TouchableOpacity
						style={[
							styles.button,
							isLoading ? styles.buttonDisabled : null,
						]}
						onPress={handleSubmit}
						disabled={isLoading}>
						{isLoading ? (
							<ActivityIndicator color='#fff' />
						) : (
							<Text style={styles.buttonText}>Register</Text>
						)}
					</TouchableOpacity>
					<TouchableOpacity
						style={[
							styles.googleButton,
							isLoading ? styles.buttonDisabled : null,
						]}
						onPress={promptGoogleSignIn}
						disabled={isLoading}>
						<View style={styles.googleButtonContent}>
							<AntDesign
								name='google'
								size={20}
								color='#4285F4'
							/>
							<Text style={styles.googleButtonText}>
								Continue with Google
							</Text>
						</View>
					</TouchableOpacity>

					{isAppleAvailable ? (
						<AppleAuthentication.AppleAuthenticationButton
							buttonType={
								AppleAuthentication
									.AppleAuthenticationButtonType.SIGN_UP
							}
							buttonStyle={
								AppleAuthentication
									.AppleAuthenticationButtonStyle.BLACK
							}
							cornerRadius={10}
							style={styles.appleButton}
							onPress={promptAppleSignIn}
						/>
					) : (
						Platform.OS === 'ios' && (
							<Text
								style={{
									textAlign: 'center',
									color: '#666',
									marginBottom: 15,
								}}>
								Apple Sign-In not available on this
								device/platform
							</Text>
						)
					)}
					<TouchableOpacity
						style={styles.switchButton}
						onPress={() => router.replace('/login')}
						disabled={isLoading}>
						<Text style={styles.switchButtonText}>
							Already have an account? Sign In
						</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	scrollContainer: {
		flexGrow: 1,
		justifyContent: 'center',
	},
	formContainer: {
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 20,
		textAlign: 'center',
		color: '#333',
	},
	input: {
		backgroundColor: '#fff',
		padding: 15,
		borderRadius: 10,
		marginBottom: 15,
		borderWidth: 1,
		borderColor: '#ddd',
	},
	button: {
		backgroundColor: colors.exodusFruit,
		padding: 15,
		borderRadius: 10,
		alignItems: 'center',
		marginBottom: 15,
	},
	buttonDisabled: {
		opacity: 0.7,
	},
	buttonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: 'bold',
	},
	googleButton: {
		backgroundColor: '#fff',
		padding: 15,
		borderRadius: 10,
		alignItems: 'center',
		marginBottom: 15,
		borderWidth: 1,
		borderColor: '#ddd',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 3.84,
		elevation: 5,
	},
	googleButtonContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	googleButtonText: {
		color: '#333',
		fontSize: 16,
		fontWeight: '500',
		marginLeft: 10,
	},
	appleButton: {
		width: '100%',
		height: 44,
		marginBottom: 15,
	},
	testUserButton: {
		backgroundColor: '#28a745',
		padding: 15,
		borderRadius: 10,
		alignItems: 'center',
		marginBottom: 15,
	},
	testUserButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '500',
	},
	switchButton: {
		alignItems: 'center',
	},
	switchButtonText: {
		color: colors.exodusFruit,
		fontSize: 14,
	},
	errorText: {
		color: 'red',
		textAlign: 'center',
		marginBottom: 15,
	},
});

export default Auth;
