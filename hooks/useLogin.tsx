import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { API_BASE_URL } from '../constants/api';
import { useAuth } from '../context/Auth';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { LoginHookReturn, UserData } from '../models/authModels';
import {
	FACE_ID_LOGIN,
	FACE_ID_READY,
	forgetFaceIdLogin,
} from '../utils/storage';

const useLogin = (): LoginHookReturn => {
	const [isLogin, setIsLogin] = useState(true);
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [localError, setLocalError] = useState('');
	const [showDevOptions, setShowDevOptions] = useState(false);
	// 'user', 'guest', 'google' or 'apple' while that sign-in waits on the server.
	const [signingInWith, setSigningInWith] = useState<string | null>(null);
	// True when a login is saved behind Face ID on this device.
	const [faceIdReady, setFaceIdReady] = useState(false);

	// Get auth functions from context
	const { isLoading, error, checkAuthStatus, loginAuth } =
		useAuth();

	useEffect(() => {
		SecureStore.getItemAsync(FACE_ID_READY)
			.then((ready) =>
				setFaceIdReady(
					!!ready && SecureStore.canUseBiometricAuthentication()
				)
			)
			.catch(() => setFaceIdReady(false));
	}, []);

	// Clear error when switching between login/register
	useEffect(() => {
		setLocalError('');
	}, [isLogin]);

	// Display error from context if available
	useEffect(() => {
		if (error) {
			setLocalError(error);
		}
	}, [error]);

	const handleSubmit = async (isGuest: boolean = false) => {
		if (isLoading) return;

		// Reset error state
		setLocalError('');

		// Basic validation
		if (!isGuest && isLogin && (!email || !password)) {
			setLocalError('Please enter both email and password');
			return;
		}

		if (!isGuest && !isLogin && (!name || !email || !password)) {
			setLocalError('Please fill in all fields');
			return;
		}

		try {
			let success;

			if (isLogin) {
				success = await login(
					email,
					password,
					isGuest ? 'guest' : 'user'
				);
			} else {
				// success = await register(name, email, password);
			}
			if (success) {
				setEmail('');
				setPassword('');
				await checkAuthStatus();
				router.replace('/(tabs)');
			}
		} catch (error: unknown) {
			console.error('Auth error:', error);
			setLocalError(
				error instanceof Error ? error.message : 'Authentication failed'
			);
		}
	};

	const socialLogin = async (
		email: string,
		password: string,
		role: string = 'user',
		type: string,
		social_id: string,
		social_name: string,
		idToken: string
	) => {
		try {
			let success;

			console.log(`Attempting social authentication for ${type}...`);

			// The server verifies idToken with Google or Apple and creates the user if new.
			success = await login(
				email,
				'social_login_placeholder', // Ignored by the server for social logins
				role,
				type,
				social_id,
				social_name,
				idToken
			);

			if (success) {
				setEmail('');
				setPassword('');
				await checkAuthStatus();
				router.replace('/(tabs)');
			}
			return success;
		} catch (error: unknown) {
			console.error('Social auth error:', error);
			setLocalError(
				error instanceof Error
					? error.message
					: 'Social authentication failed'
			);
			return false;
		}
	};

	// Toggle dev options with a secret tap
	const handleTitlePress = () => {
		// Track number of taps to reveal dev options after 5 taps
		if (!showDevOptions) {
			setShowDevOptions(true);
		}
	};

	const login = async (
		email: string,
		password: string,
		role: string = 'user',
		type?: string,
		social_id?: string,
		social_name?: string,
		idToken?: string
	) => {
		// A Face ID sign-in keeps its own spinner.
		setSigningInWith((current) => current ?? (type || role));
		try {
			console.log(
				`Attempting to login with API: ${API_BASE_URL}/api/auth/login`
			);
			console.log('Login payload:', {
				email,
				password: type ? 'social_login' : '••••••••',
				role,
				type,
				social_id,
				social_name,
			});

			const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email,
					password,
					role,
					type,
					social_id,
					social_name,
					idToken,
				}),
			}).catch((error) => {
				console.error('Network error during login:', error);
				throw new Error(
					'Network connection failed. Please check your internet connection.'
				);
			});

			console.log('Login response status:', response.status);

			if (!response) {
				throw new Error(
					'Server connection failed. Please try again later.'
				);
			}

			const data = await response.json();
			console.log('Login response data:', {
				...data,
				token: data.token ? '••••••••' : undefined,
			});

			if (!response.ok) {
				// Handle the errors array format from the backend
				if (data.errors && Array.isArray(data.errors)) {
					const errorMsg = data.errors[0].msg || 'Login failed';
					console.error('Login validation error:', errorMsg);
					throw new Error(errorMsg);
				}
				console.error(
					'Login error from server:',
					data.message || 'Unknown error'
				);
				throw new Error(
					data.message ||
						'Login failed. Please check your credentials.'
				);
			}

			await finishLogin(data.token);
			if (role !== 'guest') {
				// Email logins save the password: their server tokens expire after 24 hours. Google and Apple tokens last a year.
				await rememberForFaceId(
					type ? { token: data.token } : { email, password }
				);
			}
			return true;
		} catch (error) {
			console.error('Login error:', error);
			Alert.alert(
				'Login Error',
				error instanceof Error
					? error.message
					: 'Failed to login. Please try again.'
			);
			return false;
		} finally {
			setSigningInWith(null);
		}
	};

	// The backend only returns a token, so fetch the user, save both and sign in.
	const finishLogin = async (token: string) => {
		// Save token first
		await SecureStore.setItemAsync('authToken', token);

		// Now fetch user info
		console.log('Fetching user info with token');
		const userResponse = await fetch(`${API_BASE_URL}/api/auth/user`, {
			headers: {
				'Content-Type': 'application/json',
				'x-auth-token': token,
			},
		}).catch((error) => {
			console.error('Error fetching user data:', error);
			throw new Error('Failed to fetch user information after login');
		});
		console.log('User info response status:', userResponse.status);

		if (!userResponse.ok) {
			const errorData = await userResponse.json().catch(() => ({}));
			console.error('User info error:', errorData);
			throw new Error('Failed to fetch user information');
		}

		const userData = await userResponse.json();
		console.log('User data received:', {
			...userData,
			_id: userData._id ? '••••••••' : undefined,
		});

		// Transform MongoDB _id to id for consistency in the app
		const normalizedUserData: UserData = {
			...userData,
			id: userData._id, // Add id field based on MongoDB's _id
		};

		// Save user data
		await SecureStore.setItemAsync(
			'userData',
			JSON.stringify(normalizedUserData)
		);
		console.log('Login successful');
		loginAuth(normalizedUserData, token);
	};

	// Locks this login behind Face ID so the login screen can offer it after logout. Never blocks sign-in.
	const rememberForFaceId = async (saved: object) => {
		try {
			if (!SecureStore.canUseBiometricAuthentication()) return;
			// Delete first: updating a Face ID-locked item would ask for Face ID.
			await SecureStore.deleteItemAsync(FACE_ID_LOGIN);
			await SecureStore.setItemAsync(FACE_ID_LOGIN, JSON.stringify(saved), {
				requireAuthentication: true,
			});
			await SecureStore.setItemAsync(FACE_ID_READY, 'true');
		} catch (error) {
			console.log('Could not save the Face ID login:', error);
		}
	};

	const faceIdLogin = async () => {
		let saved;
		try {
			const value = await SecureStore.getItemAsync(FACE_ID_LOGIN, {
				requireAuthentication: true,
				authenticationPrompt: 'Sign in to Dealbreaker',
			});
			saved = value && JSON.parse(value);
		} catch (error) {
			console.log('Face ID cancelled or failed:', error);
			return;
		}
		if (!saved) {
			// Changing Face ID enrollment wipes the saved login; the next normal sign-in saves it again.
			await forgetFaceIdLogin();
			setFaceIdReady(false);
			Alert.alert(
				'Face ID',
				'Sign in once with your password, Google or Apple to turn Face ID back on.'
			);
			return;
		}
		setSigningInWith('faceid');
		let success = false;
		try {
			if (saved.password) {
				success = await login(saved.email, saved.password, 'user');
			} else {
				await finishLogin(saved.token);
				success = true;
			}
		} catch (error) {
			Alert.alert(
				'Login Error',
				error instanceof Error ? error.message : 'Face ID sign-in failed.'
			);
		} finally {
			setSigningInWith(null);
		}
		if (success) {
			await checkAuthStatus();
			router.replace('/(tabs)');
		}
	};
	return {
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
		login,
		isLoading,
		localError,
		setLocalError,
		showDevOptions,
		setShowDevOptions,
		socialLogin,
		signingInWith,
		faceIdReady,
		faceIdLogin,
	};
};

export default useLogin;
