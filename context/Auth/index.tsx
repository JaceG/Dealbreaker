import React, { createContext, useState, useContext, useEffect } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { API_BASE_URL } from '../../constants/api';
import { resetBoardLog, setBoardLogEnabled } from '../../utils/boardLog';

interface AuthContextType {
	user: User;
	authToken: string | null;
	isLoading: boolean;
	error: string | null;
	checkAuthStatus: () => Promise<void>;
	logout: () => Promise<void>;
	loginAuth: (user: unknown, token: string) => void;
	clearAuth: () => void;
	updateUserName: (name: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};

// Initialize WebBrowser for auth session (needed for Expo)
WebBrowser.maybeCompleteAuthSession();

export type User = {
	id: string;
	[key: string]: any;
} | null;

export const diagnosticsActive = (user: User) =>
	!!user?.diagnosticsUntil && new Date(user.diagnosticsUntil).getTime() > Date.now();

export const boardLogAllowed = (user: User) => !!user?.developer || diagnosticsActive(user);

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
		setBoardLogEnabled(false);
		await resetBoardLog();
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
				refreshDeveloperFlag(token);
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

	// The saved user predates server-side switches (developer, diagnostics), so read them fresh on launch and
	// whenever the app comes back to the foreground; support can turn diagnostics on while the app is open.
	// Only those fields are taken; a failed request leaves the saved user as it was.
	async function refreshDeveloperFlag(token: string) {
		try {
			const response = await fetch(`${API_BASE_URL}/api/auth/user`, {
				headers: { 'x-auth-token': token },
			});
			if (!response.ok) return;
			const fresh = await response.json();
			// Only for the account it was asked for: a slow reply mustn't land on whoever signed in since.
			if (!fresh?._id) return;
			const switches = {
				developer: !!fresh?.developer,
				diagnosticsUntil: fresh?.diagnosticsUntil || null,
			};
			setUser((current) =>
				current && (current.id === fresh._id || current._id === fresh._id) ? { ...current, ...switches } : current
			);
			const saved = await SecureStore.getItemAsync('userData');
			const savedUser = saved ? JSON.parse(saved) : null;
			if (savedUser && (savedUser.id === fresh._id || savedUser._id === fresh._id)) {
				await SecureStore.setItemAsync('userData', JSON.stringify({ ...savedUser, ...switches }));
			}
		} catch {
			// Offline or the server is asleep: keep the saved values.
		}
	}

	useEffect(() => {
		const subscription = AppState.addEventListener('change', (state) => {
			if (state === 'active' && authToken) refreshDeveloperFlag(authToken);
		});
		return () => subscription.remove();
	}, [authToken]);

	// The board log follows the signed-in account: always for developers, and for anyone else while support has
	// diagnostics switched on. A different account starts from an empty log; diagnostics stop at their end time.
	const lastUserIdRef = React.useRef<string | undefined>(undefined);
	useEffect(() => {
		const id = user?.id || user?._id;
		if (lastUserIdRef.current && id !== lastUserIdRef.current) resetBoardLog();
		lastUserIdRef.current = id;
		setBoardLogEnabled(boardLogAllowed(user));
		if (!user?.developer && diagnosticsActive(user)) {
			const msLeft = new Date(user!.diagnosticsUntil).getTime() - Date.now();
			const timer = setTimeout(() => setBoardLogEnabled(false), Math.min(msLeft, 2 ** 31 - 1));
			return () => clearTimeout(timer);
		}
	}, [user]);

	function loginAuth(user: unknown, token: string) {
		setUser(user as User);
		setAuthToken(token);
	}

	function updateUserName(name: string) {
		setUser((user) => {
			return { ...user, name } as User;
		});
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
				updateUserName,
			}}>
			{children}
		</AuthContext.Provider>
	);
};

export default AuthContext;
