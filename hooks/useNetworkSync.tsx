import { useState, useRef, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import {
	setList,
	getList,
	setAtomicValue,
	syncPendingChanges,
	showToast,
	fetchAllUserData,
	getSecureItem,
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

			// If forcing sync, then also pull data from MongoDB
			if (forceSync) {
				debugLog('Forcing fetch of data from MongoDB...');
				try {
					// Get the user ID from secure storage
					const userId = await getSecureItem('userId');
					if (userId) {
						const mongoData = await fetchAllUserData(userId);

						if (
							mongoData.profiles &&
							mongoData.profiles.length > 0
						) {
							await setList('profiles', mongoData.profiles);
							setProfiles(mongoData.profiles);
							debugLog('Profiles synced from MongoDB');
						}

						if (
							mongoData.flags &&
							Object.keys(mongoData.flags).length > 0
						) {
							await setList('dealbreaker', mongoData.flags);
							setDealbreaker(mongoData.flags);
							debugLog('Flags synced from MongoDB');
						}

						debugLog('Successfully synced all data from MongoDB');
					} else {
						debugLog('Cannot sync data: No user ID found');
					}
				} catch (fetchError) {
					debugLog('Error fetching data from MongoDB:', fetchError);
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
			if (state.isConnected && !state.isInternetReachable) {
				// If we have a network connection but can't reach the internet, enable offline mode
				setAtomicValue('offlineMode', 'true');
			}
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
