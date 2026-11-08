import { useState, useRef, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import {
	setList,
	getList,
	setAtomicValue,
	syncPendingChanges,
	showToast,
} from '../utils';
import { DealbreakerState, Profile } from '../models/boardManagementModel';

export const useNetworkSync = (
	setProfiles: (profiles: Profile[]) => void,
	setDealbreaker: (state: DealbreakerState) => void,
	debugLog: (...args: any[]) => void
) => {
	const [isOnline, setIsOnline] = useState(true);
	const syncInterval = useRef<ReturnType<typeof setInterval> | null>(null);

	// Function to sync offline data with the server
	const syncOfflineData = async (forceSync = false) => {
		try {
			// First handle pending changes to MongoDB
			const pendingChanges = await getList('pendingChanges');
			if (pendingChanges && pendingChanges.length > 0) {
				const result = await syncPendingChanges();

				if (result.success) {
					// Only clear pending changes if sync was truly successful (not offline)
					if (!result.offline) {
						await setList('pendingChanges', []);

						// Only show toast if this was a user-initiated sync (forceSync)
						if (forceSync) {
							showToast(
								'success',
								'Sync Complete',
								'Your changes have been synced with the server.'
							);
						}
					}
				} else if (forceSync) {
					// Only show errors for user-initiated syncs
					showToast(
						'error',
						'Sync Failed',
						result.message ||
							'Failed to sync changes with the server.'
					);
				}
			}
		} catch (error) {
			debugLog('Error syncing data:', error);

			// Only show errors for user-initiated syncs
			if (forceSync) {
				showToast(
					'error',
					'Sync Error',
					'There was a problem syncing with the server.'
				);
			}
		}
	};

	// Network and sync setup
	useEffect(() => {
		// Initial sync
		syncOfflineData();

		// Check network status and only sync periodically if online
		const networkCheck = NetInfo.addEventListener((state) => {
			setIsOnline(state.isConnected === true);
			// Offline mode follows the network both ways; queued history syncs once it's back.
			const offline =
				!state.isConnected || state.isInternetReachable === false;
			setAtomicValue('offlineMode', offline ? 'true' : 'false').then(() => {
				if (!offline) syncOfflineData();
			});
		});

		// Set up less frequent sync interval (every 5 minutes instead of every minute)
		syncInterval.current = setInterval(syncOfflineData, 300000);

		return () => {
			if (syncInterval.current) {
				clearInterval(syncInterval.current);
			}
			networkCheck?.(); // Clean up the network listener
		};
	}, []);

	return {
		isOnline,
		syncOfflineData,
	};
};
