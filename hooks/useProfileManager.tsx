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
	// Ensure a profile exists
	const ensureProfileExists = (profileId: string) => {
		if (!dealbreaker[profileId]) {
			// Get flags from main profile to copy them
			const mainFlags = dealbreaker.main?.flag || [];
			const mainDealbreakers = dealbreaker.main?.dealbreaker || [];

			const updatedDealbreaker = {
				...dealbreaker,
				[profileId]: {
					// Copy all flags from main profile to maintain shared items across profiles
					flag: JSON.parse(JSON.stringify(mainFlags)),
					dealbreaker: JSON.parse(JSON.stringify(mainDealbreakers)),
				},
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
		const updatedDealbreaker = { ...dealbreaker };
		updatedDealbreaker[profileId][type] = [
			...updatedDealbreaker[profileId][type],
			item,
		];
		updateDealbreaker(updatedDealbreaker);
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
			const updatedDealbreaker = { ...dealbreaker };
			updatedDealbreaker[profileId][type] = updatedDealbreaker[profileId][
				type
			].filter((item: FlagItem) => item.id !== itemId);
			updateDealbreaker(updatedDealbreaker);
		}
	};

	// Remove item from all profiles
	const removeItemFromAllProfiles = (
		itemId: string,
		type: 'flag' | 'dealbreaker'
	) => {
		const updatedDealbreaker = { ...dealbreaker };
		profiles.forEach((profile) => {
			const profileId = profile.id;
			if (updatedDealbreaker[profileId]) {
				updatedDealbreaker[profileId][type] = updatedDealbreaker[
					profileId
				][type].filter((item: FlagItem) => item.id !== itemId);
			}
		});
		updateDealbreaker(updatedDealbreaker);
	};

	// Create a new profile
	const createProfile = (name: string) => {
		const newProfileId = `profile_${Date.now()}`;
		const updatedProfiles = [
			...profiles,
			{
				id: newProfileId,
				name: name || `Profile ${profiles.length + 1}`,
			},
		];
		setProfiles(updatedProfiles);
		return newProfileId;
	};

	// Delete a profile
	const deleteProfile = (profileId: string) => {
		if (profileId === 'main') {
			return false; // Cannot delete main profile
		}

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
		isValidNoCardItems,
		isValidNoProfileItems,
	};
};
