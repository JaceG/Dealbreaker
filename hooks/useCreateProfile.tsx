import { useContext, useEffect, useState } from 'react';
import { showToast } from '../utils/functions';
import StoreContext from '../store';
import { router } from 'expo-router';
import {
	Profile,
	ErrorState,
	StoreContextType,
} from '../app/(tabs)/create-profile';
import * as SecureStore from 'expo-secure-store';

const useCreateProfile = () => {
	const { profiles, createProfile, isValidNoProfileItems } = useContext(
		StoreContext
	) as never as StoreContextType;

	// Debug component lifecycle
	useEffect(() => {
		console.log('CreateProfiles component mounted');

		return () => {
			console.log('CreateProfiles component unmounted');
		};
	}, []);

	const [name, setName] = useState<string>('');
	const [error, setError] = useState<ErrorState>({
		name: '',
	});

	// Reset form when component mounts
	useEffect(() => {
		console.log('Create Profile screen mounted - resetting form');
		setName('');
		setError({
			name: '',
		});
	}, []);

	async function handleSubmit() {
		if (validate()) {
			// Check if profile name already exists
			if (
				profiles.some(
					(p: Profile) => p.name.toLowerCase() === name.toLowerCase()
				)
			) {
				showToast('error', 'Profile name already exists');
				return;
			}
			// Check the count of flag if guest is user
			const userData = await SecureStore.getItemAsync('userData');
			const userDataObj = JSON.parse(userData as string);
			const role = userDataObj.role; // user, guest and admin
			if (role === 'guest') {
				console.log('Guest is creating profile');
				const allowedNumber = 2;
				const isValid = isValidNoProfileItems(allowedNumber);
				console.log('isValid', isValid);
				if (!isValid) {
					showToast(
						'error',
						`Guest only allowed to create 1 profile.`
					);
					return;
				}
			}
			// Create new profile with a unique ID
			const newProfileId = createProfile(name);

			if (newProfileId) {
				console.log(
					'Profile created successfully, attempting navigation...'
				);
				showToast('success', 'Profile created successfully');
				setName('');

				// Navigate back to tabs
				console.log('Navigating back to tabs');
				router.push('/(tabs)');
			} else {
				showToast('error', 'Failed to create profile');
			}
		} else showToast('error', 'Fix the following errors');
	}

	function handleNameChange(text: string): void {
		setName(text);
		handleValidation('name', text);
	}

	function handleValidation(
		type: keyof ErrorState,
		text: string = '',
		isShow: boolean = true,
		initialError: ErrorState | null = null
	): ErrorState {
		let newError: ErrorState = {
			name: initialError ? initialError.name : error.name,
		};
		newError[type] = '';
		if (!text && type === 'name') {
			newError[type] = `${type} is required`;
		}
		if (text && type === 'name' && text.toLowerCase() === 'main') {
			newError[type] = `Cannot use 'main' as a profile name`;
		}
		if (text && type === 'name' && text.length > 50) {
			newError[type] = `${type} too long`;
		}
		if (isShow) setError(newError);

		return newError;
	}

	function validate(): boolean {
		let newError = handleValidation('name', name, false, error);
		setError(newError);
		const errorList = Object.values(newError);
		return !errorList.find((item) => item);
	}

	return {
		name,
		setName,
		error,
		handleSubmit,
		handleNameChange,
		validate,
	};
};

export default useCreateProfile;
