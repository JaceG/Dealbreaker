import { useState, useRef, useEffect } from 'react';
import {
	setList,
	getList,
	setAtomicValue,
	getAtomicValue,
	syncPendingChanges,
	showToast,
	fetchAllUserData,
	getSecureItem,
} from '../utils';
import {
	DealbreakerState,
	FlagItem,
	Profile,
} from '../models/boardManagementModel';

export const useDataLoader = (
	dealbreaker: DealbreakerState,
	setDealbreaker: (state: DealbreakerState) => void,
	profiles: Profile[],
	setProfiles: (profiles: Profile[]) => void,
	currentProfileId: string,
	setCurrentProfileId: (id: string) => void,
	debugLog: (...args: any[]) => void,
	syncOfflineData: (forceSync?: boolean) => Promise<void>
) => {
	const [isLoaded, setIsLoaded] = useState(false);
	const isProfileMountRef = useRef(false);
	const isCurrentProfileMountRef = useRef(false);

	// Update dealbreaker state and save to storage
	const updateDealbreaker = (newState: DealbreakerState) => {
		setDealbreaker(newState);
		setList('dealbreaker', newState);
		debugLog('Saved dealbreaker state to storage:', newState);
	};

	// Function to synchronize flags across all profiles
	const synchronizeProfileFlags = () => {
		debugLog('Synchronizing flags across all profiles...');

		// First collect all unique flags from all profiles
		const allUniqueFlags = new Map();
		const allUniqueDealbreakers = new Map();

		// Iterate through all profiles to find unique items by ID
		Object.keys(dealbreaker).forEach((profileId) => {
			const profile = dealbreaker[profileId];

			// Process flags
			if (profile.flag && Array.isArray(profile.flag)) {
				profile.flag.forEach((flag: FlagItem) => {
					if (flag && flag.id && !allUniqueFlags.has(flag.id)) {
						allUniqueFlags.set(flag.id, flag);
					}
				});
			}

			// Process dealbreakers
			if (profile.dealbreaker && Array.isArray(profile.dealbreaker)) {
				profile.dealbreaker.forEach((db: FlagItem) => {
					if (db && db.id && !allUniqueDealbreakers.has(db.id)) {
						allUniqueDealbreakers.set(db.id, db);
					}
				});
			}
		});

		// Now ensure each profile has all the unique items
		const updatedDealbreaker = { ...dealbreaker };
		let hasChanges = false;

		Object.keys(updatedDealbreaker).forEach((profileId) => {
			const profile = updatedDealbreaker[profileId];

			// Ensure the profile has the correct structure
			if (!profile.flag) profile.flag = [];
			if (!profile.dealbreaker) profile.dealbreaker = [];

			// Add any missing flags
			allUniqueFlags.forEach((flag, flagId) => {
				const exists = profile.flag.some(
					(f: FlagItem) => f.id === flagId
				);
				if (!exists) {
					debugLog(
						`Adding missing flag ${flagId} to profile ${profileId}`
					);
					profile.flag.push(JSON.parse(JSON.stringify(flag)));
					hasChanges = true;
				}
			});

			// Add any missing dealbreakers
			allUniqueDealbreakers.forEach((db, dbId) => {
				const exists = profile.dealbreaker.some(
					(d: FlagItem) => d.id === dbId
				);
				if (!exists) {
					debugLog(
						`Adding missing dealbreaker ${dbId} to profile ${profileId}`
					);
					profile.dealbreaker.push(JSON.parse(JSON.stringify(db)));
					hasChanges = true;
				}
			});
		});

		// Update if changes were made
		if (hasChanges) {
			debugLog('Updating dealbreaker state with synchronized flags');
			updateDealbreaker(updatedDealbreaker);
			return true;
		}

		debugLog('No changes needed for flag synchronization');
		return false;
	};

	// Load all data at app initialization
	useEffect(() => {
		const loadAllData = async () => {
			setIsLoaded(false);

			try {
				// Enable offline mode by default
				await setAtomicValue('offlineMode', 'true');

				// Force sync with MongoDB first to ensure latest data
				debugLog('Forcing initial sync with MongoDB...');
				try {
					await syncOfflineData(true); // Pass true to indicate it's a force sync
					debugLog('Initial MongoDB sync complete');
				} catch (syncError) {
					debugLog('Error during initial MongoDB sync:', syncError);
				}

				// Load dealbreaker data
				const savedDealbreaker = await getList('dealbreaker');
				if (
					savedDealbreaker &&
					Object.keys(savedDealbreaker).length > 0
				) {
					debugLog(
						'Loaded dealbreaker state from storage:',
						savedDealbreaker
					);

					setDealbreaker(savedDealbreaker);

					// After loading data, synchronize flags across all profiles
					setTimeout(() => {
						synchronizeProfileFlags();
					}, 1000);
				}

				// Load profiles
				const savedProfiles = await getList('profiles');
				if (savedProfiles && savedProfiles.length > 0) {
					debugLog('Loaded profiles from storage:', savedProfiles);

					// Check if profiles are missing from the profiles list
					if (savedDealbreaker) {
						const dealbreakerProfileIds =
							Object.keys(savedDealbreaker);

						// Filter out profile IDs that aren't in the profiles list
						const missingProfileIds = dealbreakerProfileIds.filter(
							(id) =>
								!savedProfiles.some(
									(profile: Profile) => profile.id === id
								)
						);

						if (missingProfileIds.length > 0) {
							debugLog(
								'Found missing profiles:',
								missingProfileIds
							);

							// Create new profiles array with the missing profiles
							const updatedProfiles = [...savedProfiles];

							// Add the missing profiles
							missingProfileIds.forEach((id) => {
								// For missing IDs, create a profile with a friendly name
								const friendlyName =
									id === 'Jenny'
										? 'Jenny'
										: id.startsWith('profile_')
										? `Profile ${
												updatedProfiles.length + 1
										  }`
										: id;

								updatedProfiles.push({
									id,
									name: friendlyName,
								});
							});

							debugLog(
								'Regenerated profiles list:',
								updatedProfiles
							);
							setProfiles(updatedProfiles);

							// Also save the updated profiles list back to storage
							await setList('profiles', updatedProfiles);
						} else {
							setProfiles(savedProfiles);
						}
					} else {
						setProfiles(savedProfiles);
					}
				}

				// Load current profile ID
				const savedCurrentProfileId = await getAtomicValue(
					'currentProfileId'
				);
				if (savedCurrentProfileId) {
					debugLog(
						'Loaded current profile ID from storage:',
						savedCurrentProfileId
					);

					// Force use main profile on startup to ensure we see flags
					debugLog('Forcing switch to main profile on startup');
					setCurrentProfileId('main');
					await setAtomicValue('currentProfileId', 'main');
				}

				setIsLoaded(true);
			} catch (error) {
				debugLog('Error loading data:', error);
				setIsLoaded(true); // Set to true even on error to allow app to function
			}
		};

		loadAllData();
	}, []);

	// Save profiles when they change
	useEffect(() => {
		if (isProfileMountRef.current) {
			setList('profiles', profiles);
			debugLog('Saved profiles to storage:', profiles);
		} else {
			isProfileMountRef.current = true;
		}
	}, [profiles]);

	// Save current profile ID when it changes
	useEffect(() => {
		if (isCurrentProfileMountRef.current) {
			setAtomicValue('currentProfileId', currentProfileId);
			debugLog('Saved current profile ID to storage:', currentProfileId);
		} else {
			isCurrentProfileMountRef.current = true;
		}
	}, [currentProfileId]);

	return {
		isLoaded,
		updateDealbreaker,
		synchronizeProfileFlags,
	};
};
