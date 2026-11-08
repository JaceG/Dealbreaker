import { deleteProfileHistory } from '../utils/api';
import {
	DealbreakerState,
	FlagItem,
	Profile,
} from '../models/boardManagementModel';

export const useProfileManager = (
	dealbreaker: DealbreakerState,
	updateDealbreaker: (newState: DealbreakerState) => void,
	profiles: Profile[],
	setProfiles: (profiles: Profile[]) => void,
	currentProfileId: string,
	setCurrentProfileId: (id: string) => void
) => {
	// A new person gets every card on main, all in Flags and all white: colors on a person are what you saw in them.
	const mainCardsForNewProfile = (): FlagItem[] =>
		[
			...(dealbreaker.main?.flag || []),
			...(dealbreaker.main?.dealbreaker || []),
		].map((item) => ({ ...item, flag: 'white' }));

	// Ensure a profile exists
	const ensureProfileExists = (profileId: string) => {
		if (!dealbreaker[profileId]) {
			const updatedDealbreaker = {
				...dealbreaker,
				[profileId]: { flag: mainCardsForNewProfile(), dealbreaker: [] },
			};
			updateDealbreaker(updatedDealbreaker);
			return true;
		}
		return false;
	};

	// Add item to a specific profile
	const addItemToProfile = (
		profileId: string,
		item: FlagItem,
		type: 'flag' | 'dealbreaker'
	) => {
		ensureProfileExists(profileId);
		const profile = dealbreaker[profileId] || { flag: [], dealbreaker: [] };
		updateDealbreaker({
			...dealbreaker,
			[profileId]: { ...profile, [type]: [...(profile[type] || []), item] },
		});
	};

	const isValidNoCardItems = (allowedCard: number) => {
		console.log('isValidNoCardItems', { allowedCard });
		const updatedDealbreaker = { ...dealbreaker };
		const flagProfileObject = updatedDealbreaker[profiles[0].id];
		const totalFlags =
			flagProfileObject.flag.length +
			flagProfileObject.dealbreaker.length;
		console.log('totalFlags', { totalFlags });
		return totalFlags < allowedCard;
	};
	const isValidNoProfileItems = (allowedProfile: number) => {
		console.log('isValidNoProfileItems', { allowedProfile });
		return profiles.length < allowedProfile;
	};
	const initializeProfile = (profileId: string, name?: string) => {
		updateDealbreaker({
			...dealbreaker,
			[profileId]: { name, flag: mainCardsForNewProfile(), dealbreaker: [] },
		});
	};
	// Add item to all profiles
	const addItemToAllProfiles = (
		item: FlagItem,
		type: 'flag' | 'dealbreaker'
	) => {
		const updatedDealbreaker = { ...dealbreaker };
		profiles.forEach((profile) => {
			const profileId = profile.id;
			if (!updatedDealbreaker[profileId]) {
				updatedDealbreaker[profileId] = {
					flag: [],
					dealbreaker: [],
				};
			}
			// Check if the item already exists to avoid duplicates
			if (profileId !== 'main') {
				type = 'flag';
			}
			const exists = updatedDealbreaker[profileId][type].some(
				(existingItem: FlagItem) => existingItem.id === item.id
			);
			if (!exists) {
				updatedDealbreaker[profileId][type] = [
					...updatedDealbreaker[profileId][type],
					item,
				];
			}
		});
		updateDealbreaker(updatedDealbreaker);
	};

	// Remove item from a specific profile
	const removeItemFromProfile = (
		profileId: string,
		itemId: string,
		type: 'flag' | 'dealbreaker'
	) => {
		if (dealbreaker[profileId]) {
			updateDealbreaker({
				...dealbreaker,
				[profileId]: {
					...dealbreaker[profileId],
					[type]: dealbreaker[profileId][type].filter(
						(item: FlagItem) => item.id !== itemId
					),
				},
			});
		}
	};

	// Remove a card from every profile on the board, from both columns
	const removeItemFromAllProfiles = (itemId: string) => {
		const updatedDealbreaker = { ...dealbreaker };
		Object.keys(updatedDealbreaker).forEach((profileId) => {
			const profile = updatedDealbreaker[profileId];
			updatedDealbreaker[profileId] = {
				...profile,
				flag: (profile.flag || []).filter((item: FlagItem) => item.id !== itemId),
				dealbreaker: (profile.dealbreaker || []).filter(
					(item: FlagItem) => item.id !== itemId
				),
			};
		});
		updateDealbreaker(updatedDealbreaker);
	};

	// Create a new profile
	const createProfile = (name: string) => {
		const newProfileId = `profile_${Date.now()}`;
		const profileName = name || `Profile ${profiles.length + 1}`;
		const updatedProfiles = [
			...profiles,
			{
				id: newProfileId,
				name: profileName,
			},
		];
		setProfiles(updatedProfiles);
		initializeProfile(newProfileId, profileName);
		return newProfileId;
	};

	// Delete a profile
	const deleteProfile = (profileId: string) => {
		if (profileId === 'main') {
			return false; // Cannot delete main profile
		}
		deleteProfileHistory(profileId);

		const updatedProfiles = profiles.filter(
			(profile) => profile.id !== profileId
		);
		setProfiles(updatedProfiles);

		// If the current profile was deleted, set current profile to main
		if (currentProfileId === profileId) {
			setCurrentProfileId('main');
		}

		// Delete the profile data from dealbreaker
		const updatedDealbreaker = { ...dealbreaker };
		delete updatedDealbreaker[profileId];
		updateDealbreaker(updatedDealbreaker);

		return true;
	};

	// Rename a profile
	const renameProfile = (profileId: string, newName: string) => {
		const updatedProfiles = profiles.map((profile) =>
			profile.id === profileId ? { ...profile, name: newName } : profile
		);
		setProfiles(updatedProfiles);
		if (dealbreaker[profileId]) {
			updateDealbreaker({
				...dealbreaker,
				[profileId]: { ...dealbreaker[profileId], name: newName },
			});
		}
		return true;
	};

	const setProfileEnded = (profileId: string, ended: boolean) => {
		if (profileId === 'main' || !dealbreaker[profileId]) return;
		updateDealbreaker({
			...dealbreaker,
			[profileId]: { ...dealbreaker[profileId], ended },
		});
	};

	return {
		ensureProfileExists,
		addItemToProfile,
		addItemToAllProfiles,
		removeItemFromProfile,
		removeItemFromAllProfiles,
		createProfile,
		deleteProfile,
		renameProfile,
		setProfileEnded,
		isValidNoCardItems,
		isValidNoProfileItems,
		initializeProfile,
	};
};
