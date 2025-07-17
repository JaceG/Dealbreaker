import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { API_BASE_URL } from '../constants/api';
import { useAuth } from '../context/Auth';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {
	AuthContextType,
	LoginHookReturn,
	UserData,
	LoginApiResponse,
	UserApiResponse,
} from '../models/authModels';

const useLogin = (): LoginHookReturn => {
	const [isLogin, setIsLogin] = useState(true);
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [localError, setLocalError] = useState('');
	const [showDevOptions, setShowDevOptions] = useState(false);

	// Get auth functions from context
	const { isLoading, error, checkAuthStatus, loginAuth } =
		useAuth() as AuthContextType;

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
		role: string = 'user'
	) => {
		try {
			console.log(
				`Attempting to login with API: ${API_BASE_URL}/api/auth/login`
			);
			console.log('Login payload:', { email, password: '••••••••' });

			const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email, password, role }),
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

			// The backend only returns a token, so we need to fetch user info
			const token = data.token;
			console.log('Token:', token);
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
			console.log('User info response:', userData);
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
	};
};

export default useLogin;
