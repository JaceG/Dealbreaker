import React, { useState, useEffect } from 'react';
import {
	View,
	Text,
	Image,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Alert,
} from 'react-native';
import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
// Uncomment these imports
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { colors, typeScale } from '../../libs/board/constants';
import useLogin from '../../hooks/useLogin';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import { User, useAuth } from '../../context/Auth';
import {
	GoogleSignin,
	statusCodes,
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
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
export interface AuthContextType {
	login: (email: string, password: string) => Promise<boolean>;
	register: (
		name: string,
		email: string,
		password: string
	) => Promise<boolean>;
	promptGoogleSignIn: () => Promise<boolean>;
	isLoading: boolean;
	error: string | null;
	createTestUser: () => Promise<boolean>;
	checkAuthStatus: () => Promise<boolean>;
	loginAuth: (user: unknown, token: string) => Promise<void>;
	clearAuth: () => void;
	user: User;
}

// Auth component that supports Google signin
const Auth: React.FC<AuthProps> = () => {
	const {
		isLogin,
		setIsLogin,
		name,
		setName,
		email,
		setEmail,
		password,
		setPassword,
		handleSubmit,
		handleTitlePress,
		isLoading,
		localError,
		socialLogin,
		signingInWith,
		faceIdReady,
		faceIdLogin,
	} = useLogin();
	// A sign-in in progress disables the form; the button that started it shows the spinner.
	const busy = isLoading || !!signingInWith;

	const { loginAuth } = useAuth();
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
					user.name || '',
					'user',
					'google',
					user.id,
					user.name || '',
					userInfo.data.idToken ?? ''
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
					displayName || 'Apple User',
					identityToken ?? ''
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
			behavior={Platform.OS === 'ios' ? undefined : 'height'}
			style={styles.container}>
			{/* On iOS the keyboard adds scroll room below the form instead of squeezing it up under the see-through header. */}
			<ScrollView
				contentContainerStyle={styles.scrollContainer}
				automaticallyAdjustKeyboardInsets>
				<View style={styles.formContainer}>
					<Image
						source={require('../../assets/icon.png')}
						style={styles.mark}
						accessibilityIgnoresInvertColors
					/>
					<TouchableOpacity
						onPress={handleTitlePress}
						activeOpacity={0.8}>
						<Text style={styles.title}>
							{isLogin ? 'Welcome back' : 'Create Account'}
						</Text>
					</TouchableOpacity>

					{!isLogin && (
						<AppInput
							style={styles.field}
							placeholder='Name'
							value={name}
							onChangeText={setName}
							autoCapitalize='words'
							editable={!busy}
						/>
					)}

					<AppInput
						style={styles.field}
						placeholder='Email'
						value={email}
						onChangeText={setEmail}
						keyboardType='email-address'
						autoCapitalize='none'
						editable={!busy}
					/>

					<AppInput
						style={styles.field}
						placeholder='Password'
						value={password}
						onChangeText={setPassword}
						secureTextEntry
						editable={!busy}
					/>

					{localError ? (
						<Text style={styles.errorText}>{localError}</Text>
					) : null}

					<View style={styles.button}>
						<AppButton
							title={isLogin ? 'Log in' : 'Register'}
							onPress={() => handleSubmit(false)}
							disabled={busy}
							loading={isLoading || signingInWith === 'user'}
						/>
					</View>

					{faceIdReady && (
						<View style={styles.button}>
							<AppButton
								title='Sign in with Face ID'
								variant='secondary'
								icon={
									<MaterialCommunityIcons
										name='face-recognition'
										size={20}
										color={colors.ink}
									/>
								}
								onPress={faceIdLogin}
								disabled={busy}
								loading={signingInWith === 'faceid'}
							/>
						</View>
					)}

					<View style={styles.button}>
						<AppButton
							title='Continue with Google'
							variant='secondary'
							icon={<AntDesign name='google' size={20} color={colors.ink} />}
							onPress={promptGoogleSignIn}
							disabled={busy}
							loading={signingInWith === 'google'}
						/>
					</View>

					{signingInWith === 'apple' ? (
						<View
							style={[
								styles.appleButton,
								styles.appleButtonBusy,
								styles.buttonDisabled,
							]}>
							<ActivityIndicator color={colors.ink} />
						</View>
					) : isAppleAvailable ? (
						<AppleAuthentication.AppleAuthenticationButton
							buttonType={
								AppleAuthentication
									.AppleAuthenticationButtonType.SIGN_IN
							}
							buttonStyle={
								AppleAuthentication
									.AppleAuthenticationButtonStyle.WHITE_OUTLINE
							}
							cornerRadius={8}
							style={[
								styles.appleButton,
								busy ? styles.buttonDisabled : null,
							]}
							onPress={() => !busy && promptAppleSignIn()}
						/>
					) : (
						<Text style={styles.note}>
							Apple Sign-In not available on this device/platform
						</Text>
					)}
					{/* 
          {showDevOptions && (
            <TouchableOpacity
              style={[
                styles.testUserButton,
                isLoading ? styles.buttonDisabled : null,
              ]}
              onPress={handleCreateTestUser}
              disabled={isLoading}
            >
              <Text style={styles.testUserButtonText}>Create Test User</Text>
            </TouchableOpacity>
          )} */}
					<AppButton
						title='Try it without an account'
						variant='link'
						onPress={() => handleSubmit(true)}
						disabled={busy}
						loading={isLoading || signingInWith === 'guest'}
					/>
					<View style={styles.switchRow}>
						<Text style={styles.switchText}>Don't have an account?</Text>
						<AppButton
							title='Sign up'
							variant='link'
							onPress={() => router.push('/register')}
							disabled={busy}
						/>
					</View>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.paper,
	},
	scrollContainer: {
		flexGrow: 1,
		justifyContent: 'center',
	},
	formContainer: {
		padding: 20,
	},
	mark: {
		width: 64,
		height: 64,
		borderRadius: 15,
		alignSelf: 'center',
		marginBottom: 16,
	},
	title: {
		...typeScale.title,
		marginBottom: 22,
		textAlign: 'center',
		color: colors.ink,
	},
	field: {
		marginBottom: 12,
	},
	button: {
		marginBottom: 12,
	},
	buttonDisabled: {
		opacity: 0.5,
	},
	switchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	switchText: {
		...typeScale.body,
		color: colors.ink,
	},
	errorText: {
		...typeScale.body,
		color: colors.danger,
		textAlign: 'center',
		marginBottom: 12,
	},
	note: {
		...typeScale.label,
		color: colors.muted,
		textAlign: 'center',
		marginBottom: 12,
	},
	// Apple draws its own button and fixes its outline at 1pt; height and corners match the shared button.
	appleButton: {
		width: '100%',
		height: 48,
		marginBottom: 12,
	},
	// Matches the white Apple button while its sign-in runs.
	appleButtonBusy: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.ink,
		borderRadius: 8,
		justifyContent: 'center',
	},
});

export default Auth;
