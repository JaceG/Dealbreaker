import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import Constants from 'expo-constants';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

// Get API URL from Expo constants or environment variables
const API_BASE_URL =
	Constants.expoConfig?.extra?.apiUrl || 'http://localhost:4000';

// Initialize WebBrowser for auth session (needed for Expo)
WebBrowser.maybeCompleteAuthSession();

type User = {
	id: string;
	[key: string]: any;
} | null;

export const AuthProvider = ({
	children,
}: {
	children: React.ReactElement;
}) => {
	const [user, setUser] = useState<User>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [authToken, setAuthToken] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	async function clearSecureStore() {
		const keys = ['authToken', 'userData'];
		for (const key of keys) {
			await SecureStore.deleteItemAsync(key);
		}
	}
	const logout = async () => {
		await clearSecureStore();
		router.replace('/login');
	};

	useEffect(() => {
		checkAuthStatus();
		// clearSecureStore();
	}, []);

	const checkAuthStatus = async () => {
		try {
			setIsLoading(true);
			const token = await SecureStore.getItemAsync('authToken');
			const userData = await SecureStore.getItemAsync('userData');
			setIsLoading(false);
			if (token && userData) {
				setAuthToken(token);
				setUser(JSON.parse(userData));
				router.replace('/(tabs)');
				return;
			}
			router.replace('/login');
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: 'An unknown error occurred'
			);
			console.error('Error checking auth status:', error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				authToken,
				isLoading,
				error,
				checkAuthStatus,
				logout,
			}}>
			{children}
		</AuthContext.Provider>
	);
};

export default AuthContext;
