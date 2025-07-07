import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { clearKeys } from '../utils/storage';
import { useContext } from 'react';
import StoreContext from '../store';
import { useAuth } from '../context/Auth';
import { AuthActionsReturn } from '../models/authModels';

export const useAuthActions = (): AuthActionsReturn => {
	const { setDealbreaker } = useContext<any>(StoreContext);
	const { clearAuth } = useAuth() as any;

	const clearSecureStore = async () => {
		const keys = ['authToken', 'userData'];
		for (const key of keys) {
			await SecureStore.deleteItemAsync(key);
			await clearKeys(['dealbreaker', 'profiles']);
			clearAuth();
			setDealbreaker({
				main: {
					flag: [],
					dealbreaker: [],
				},
			});
		}
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
