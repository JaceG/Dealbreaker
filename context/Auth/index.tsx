import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import Constants from 'expo-constants';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

// Initialize WebBrowser for auth session (needed for Expo)
WebBrowser.maybeCompleteAuthSession();

export type User = {
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
		setTimeout(() => {
			try {
				router.replace('/login/');
			} catch (error) {
				console.log('Navigation error during logout:', error);
			}
		}, 100);
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
				// Add delay to ensure navigation is ready
				setTimeout(() => {
					try {
						router.replace('/(tabs)');
					} catch (error) {
						console.log('Navigation error to tabs:', error);
					}
				}, 100);
				return;
			}
			// Add delay to ensure navigation is ready
			setTimeout(() => {
				try {
					router.replace('/login/');
				} catch (error) {
					console.log('Navigation error to login:', error);
				}
			}, 100);
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

	function loginAuth(user: unknown, token: string) {
		setUser(user as User);
		setAuthToken(token);
	}

	function clearAuth() {
		setUser(null);
		setAuthToken('');
	}

	return (
		<AuthContext.Provider
			value={{
				user,
				authToken,
				isLoading,
				error,
				checkAuthStatus,
				logout,
				loginAuth,
				clearAuth,
			}}>
			{children}
		</AuthContext.Provider>
	);
};

export default AuthContext;
