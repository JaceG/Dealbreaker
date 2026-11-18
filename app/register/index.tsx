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
import { AntDesign } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
// Uncomment these imports
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { colors, radius, typeScale } from '../../libs/board/constants';
import useRegister from '../../hooks/useRegister';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
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

	const { socialLogin, signingInWith } = useLogin();
	// A sign-in in progress disables the form; the button that started it shows the spinner.
	const busy = isLoading || !!signingInWith;
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
						<Text style={styles.title}>Register</Text>
					</TouchableOpacity>

					<AppInput
						style={styles.field}
						placeholder='Name'
						value={name}
						onChangeText={setName}
						autoCapitalize='words'
						editable={!busy}
					/>

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
							title='Register'
							onPress={handleSubmit}
							disabled={busy}
							loading={isLoading}
						/>
					</View>
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
									.AppleAuthenticationButtonType.SIGN_UP
							}
							buttonStyle={
								AppleAuthentication
									.AppleAuthenticationButtonStyle.WHITE_OUTLINE
							}
							cornerRadius={radius.small}
							style={[
								styles.appleButton,
								busy ? styles.buttonDisabled : null,
							]}
							onPress={() => !busy && promptAppleSignIn()}
						/>
					) : (
						Platform.OS === 'ios' && (
							<Text style={styles.note}>
								Apple Sign-In not available on this
								device/platform
							</Text>
						)
					)}
					<View style={styles.switchRow}>
						<Text style={styles.switchText}>Already have an account?</Text>
						<AppButton
							title='Sign in'
							variant='link'
							onPress={() => router.replace('/login')}
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
		backgroundColor: colors.blush,
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
		borderRadius: radius.card,
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
	// On white: the red is 4.8:1 there, and only 4.0:1 on the tint behind the form.
	errorText: {
		...typeScale.body,
		color: colors.danger,
		textAlign: 'center',
		marginBottom: 12,
		padding: 10,
		backgroundColor: colors.surface,
		borderRadius: radius.small,
		overflow: 'hidden',
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
		borderRadius: radius.small,
		justifyContent: 'center',
	},
});

export default Auth;
