import { router } from 'expo-router';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearKeys } from '../utils/storage';
import { syncPendingChanges } from '../utils/api';
import { resetBoardLog, setBoardLogEnabled } from '../utils/boardLog';
import { useContext } from 'react';
import StoreContext from '../store';
import { useAuth } from '../context/Auth';
import { AuthActionsReturn } from '../models/authModels';

export const useAuthActions = (): AuthActionsReturn => {
	const { setDealbreaker, setProfiles, setCurrentProfileId, boardLoadedRef, resetBoardSync, setBoardReady } =
		useContext<any>(StoreContext);
	const { clearAuth } = useAuth() as any;

	const clearSecureStore = async () => {
		// Board changes the server doesn't have yet wait for this account's next sign-in (useDealbreakerSync), like queued
		// flag notes: an expired login signs out by itself, offline edits included.
		await AsyncStorage.multiGet(['dealbreaker', 'boardUnsaved'])
			.then(([[, copy], [, owner]]) =>
				owner && copy
					? AsyncStorage.setItem(`unsavedBoard_${owner}`, `{"at":${Date.now()},"board":${copy}}`)
					: undefined
			)
			.catch(console.log);
		// Stop saving, so the emptied board below never reaches the server.
		resetBoardSync();
		boardLoadedRef.current = false;
		setBoardReady(false);
		// The board log is per account: stop it and forget what it recorded.
		setBoardLogEnabled(false);
		await resetBoardLog();
		// Send queued offline notes while this account's token still works. Whatever can't be sent stays queued,
		// marked as this account's, and is only sent the next time this same account signs in.
		await syncPendingChanges().catch(() => {});
		for (const key of ['authToken', 'userData']) {
			await SecureStore.deleteItemAsync(key);
		}
		// Again, in case a board request landed during the awaits above (none can now: the account is gone), so
		// neither its board nor the emptied one below is saved, here or as the phone's copy.
		boardLoadedRef.current = false;
		setBoardReady(false);
		await clearKeys(['dealbreaker', 'boardUnsaved', 'profiles']);
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
