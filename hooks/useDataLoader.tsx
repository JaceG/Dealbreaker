import { useState, useRef, useEffect } from 'react';
import {
	setList,
	getList,
	setAtomicValue,
	getAtomicValue,
} from '../utils';
import * as SecureStore from 'expo-secure-store';
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
	boardLoadedRef: { current: boolean },
	setBoardReady: (ready: boolean) => void,
	boardSyncRef: { current: { account: string | null; serverJson: string | null } }
) => {
	const [isLoaded, setIsLoaded] = useState(false);
	const isProfileMountRef = useRef(false);
	const isCurrentProfileMountRef = useRef(false);

	// The phone's copy is written by app/_layout once the change is on screen.
	const updateDealbreaker = (newState: DealbreakerState) => {
		setDealbreaker(newState);
	};

	// Load all data at app initialization
	useEffect(() => {
		const loadAllData = async () => {
			setIsLoaded(false);

			try {
				// The phone's copy before anything goes to the network, so it's on screen before the server's board can
				// arrive: with unsaved changes it must be there to win over it (useDealbreakerSync).
				const savedDealbreaker = await getList('dealbreaker');
				const lastProfileId = await getAtomicValue('currentProfileId');
				// The account whose changes in the copy the server doesn't have yet.
				const unsavedBy = await getAtomicValue('boardUnsaved');
				const userData = SecureStore.getItem('userData');
				const me: string | null = userData ? JSON.parse(userData).id : null;
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

					// A copy without this account's mark is what the server had; with it, app/_layout sends it as unsaved.
					boardSyncRef.current.account = me;
					if (!me || unsavedBy !== me) boardSyncRef.current.serverJson = JSON.stringify(savedDealbreaker);
					setDealbreaker(savedDealbreaker);
					// Open on the profile that was open last, so the saved board looks as it was left.
					if (lastProfileId && savedDealbreaker[lastProfileId]) {
						setCurrentProfileId(lastProfileId);
					}
					setBoardReady(true);
				}

				// Load profiles
				const savedProfiles = await getList('profiles');
				if (savedProfiles && savedProfiles.length > 0) {
					debugLog('Loaded profiles from storage:', savedProfiles);
					// Profiles the board has but this list lacks are added by the effect below.
					setProfiles(savedProfiles);
				}

				// Send flag notes queued offline.
				try {
					await syncOfflineData(true);
				} catch (syncError) {
					debugLog('Error during initial MongoDB sync:', syncError);
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
		// Logout and startup reset to Main before the board loads; those resets must not replace the saved profile.
		if (isCurrentProfileMountRef.current && boardLoadedRef.current) {
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
