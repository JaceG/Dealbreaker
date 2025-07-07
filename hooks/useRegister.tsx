import { useState, useEffect } from 'react';
import { useAuth } from '../context/Auth';
import { AuthContextType } from '../models/authModels';
import { API_BASE_URL } from '../constants/api';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { Alert } from 'react-native';

const useRegister = () => {
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
	}, []);

	// Display error from context if available
	useEffect(() => {
		if (error) {
			setLocalError(error);
		}
	}, [error]);

	const register = async (name: string, email: string, password: string) => {
		try {
			console.log(
				`Attempting to register with API: ${API_BASE_URL}/api/auth/register`
			);
			console.log('Register payload:', {
				name,
				email,
				password: '••••••••',
			});

			const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ name, email, password }),
			}).catch((error) => {
				console.error('Network error during registration:', error);
				throw new Error(
					'Network connection failed. Please check your internet connection.'
				);
			});

			console.log('Register response status:', response.status);

			if (!response) {
				throw new Error(
					'Server connection failed. Please try again later.'
				);
			}

			const data = await response.json();
			console.log('Register response data:', {
				...data,
				token: data.token ? '••••••••' : undefined,
			});

			if (!response.ok) {
				// Handle the errors array format from the backend
				if (data.errors && Array.isArray(data.errors)) {
					const errorMsg =
						data.errors[0].msg || 'Registration failed';
					console.error('Registration validation error:', errorMsg);
					throw new Error(errorMsg);
				}
				console.error(
					'Registration error from server:',
					data.message || 'Unknown error'
				);
				throw new Error(
					data.message || 'Registration failed. Please try again.'
				);
			}

			// The backend only returns a token, so we need to fetch user info
			const token = data.token;

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
				console.error(
					'Error fetching user data after registration:',
					error
				);
				throw new Error(
					'Failed to fetch user information after registration'
				);
			});

			console.log('User info response status:', userResponse.status);

			if (!userResponse.ok) {
				const errorData = await userResponse.json().catch(() => ({}));
				console.error('User info error after registration:', errorData);
				throw new Error('Failed to fetch user information');
			}

			const userData = await userResponse.json();
			console.log('User data received:', {
				...userData,
				_id: userData._id ? '••••••••' : undefined,
			});

			// Transform MongoDB _id to id for consistency in the app
			const normalizedUserData = {
				...userData,
				id: userData._id, // Add id field based on MongoDB's _id
			};

			// Save user data
			await SecureStore.setItemAsync(
				'userData',
				JSON.stringify(normalizedUserData)
			);

			console.log('Registration successful');
			loginAuth(normalizedUserData, token);
			return true;
		} catch (error: any) {
			console.error('Registration error:', error);
			Alert.alert(
				'Registration Error',
				error.message || 'Failed to register. Please try again.'
			);
			return false;
		}
	};

	const handleSubmit = async () => {
		if (isLoading) return;

		// Reset error state
		setLocalError('');

		// Basic validation
		if (!name?.trim() || !email?.trim() || !password) {
			setLocalError('Please fill in all fields');
			return;
		}

		try {
			let success;
			success = await register(name, email, password);
			if (success) {
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
	return {
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
	};
};

export default useRegister;
