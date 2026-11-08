import { router } from 'expo-router';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { clearKeys } from '../utils/storage';
import { syncPendingChanges } from '../utils/api';
import { useContext } from 'react';
import StoreContext from '../store';
import { useAuth } from '../context/Auth';
import { AuthActionsReturn } from '../models/authModels';

export const useAuthActions = (): AuthActionsReturn => {
	const { setDealbreaker, setProfiles, setCurrentProfileId, boardLoadedRef } =
		useContext<any>(StoreContext);
	const { clearAuth } = useAuth() as any;

	const clearSecureStore = async () => {
		// Stop saving first, so the emptied board below never reaches the server.
		boardLoadedRef.current = false;
		// Send queued offline notes while this account's token still works. Whatever can't be sent stays queued,
		// marked as this account's, and is only sent the next time this same account signs in.
		await syncPendingChanges().catch(() => {});
		for (const key of ['authToken', 'userData']) {
			await SecureStore.deleteItemAsync(key);
		}
		await clearKeys(['dealbreaker', 'profiles']);
		clearAuth();
		setDealbreaker({ main: { flag: [], dealbreaker: [] } });
		// The in-memory profile list would otherwise bring old profiles back on the next sign-in.
		setProfiles([{ id: 'main', name: 'Main Profile' }]);
		setCurrentProfileId('main');
	};

	const logout = async () => {
		await clearSecureStore();
		setTimeout(() => {
			try {
				router.replace('/login/');
			} catch (error) {
				console.log('Navigation error during logout:', error);
				// Fallback - try again after a longer delay
				setTimeout(() => {
					router.replace('/login/');
				}, 500);
			}
		}, 200);
	};

	const confirmLogout = () =>
		Alert.alert('Log Out', 'Are you sure you want to log out?', [
			{ text: 'Cancel', style: 'cancel' },
			{ text: 'Log Out', style: 'destructive', onPress: logout },
		]);

	return {
		logout,
		confirmLogout,
		clearSecureStore,
	};
};
