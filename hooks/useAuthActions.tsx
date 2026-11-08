import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { clearKeys } from '../utils/storage';
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

	return {
		logout,
		clearSecureStore,
	};
};
