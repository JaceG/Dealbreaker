import { useState, useRef, useEffect } from 'react';
import {
	setList,
	getList,
	setAtomicValue,
	getAtomicValue,
} from '../utils';
import { DealbreakerState, Profile } from '../models/boardManagementModel';

export const useDataLoader = (
	dealbreaker: DealbreakerState,
	setDealbreaker: (state: DealbreakerState) => void,
	profiles: Profile[],
	setProfiles: (profiles: Profile[]) => void,
	currentProfileId: string,
	setCurrentProfileId: (id: string) => void,
	debugLog: (...args: any[]) => void,
	syncOfflineData: (forceSync?: boolean) => Promise<void>,
	boardLoadedRef: { current: boolean }
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

	// Load all data at app initialization
	useEffect(() => {
		const loadAllData = async () => {
			setIsLoaded(false);

			try {
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
				// Once the server's board is in, the phone's saved copy is older; don't let it replace it.
				if (
					savedDealbreaker &&
					Object.keys(savedDealbreaker).length > 0 &&
					!boardLoadedRef.current
				) {
					debugLog(
						'Loaded dealbreaker state from storage:',
						savedDealbreaker
					);

					setDealbreaker(savedDealbreaker);
				}

				// Load profiles
				const savedProfiles = await getList('profiles');
				if (savedProfiles && savedProfiles.length > 0) {
					debugLog('Loaded profiles from storage:', savedProfiles);
					// Profiles the board has but this list lacks are added by the effect below.
					setProfiles(savedProfiles);
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

	// Logout wipes the phone's profile list, but the board (saved to the server) keeps every profile, so list any it has.
	useEffect(() => {
		const missing = Object.keys(dealbreaker).filter(
			(id) => !profiles.some((profile) => profile.id === id)
		);
		if (missing.length > 0) {
			setProfiles([
				...profiles,
				...missing.map((id, i) => ({
					id,
					// Profiles saved before names went into the board come back numbered.
					name:
						dealbreaker[id]?.name ||
						`Profile ${profiles.length + i + 1}`,
				})),
			]);
		}
	}, [dealbreaker, profiles]);

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
	};
};
