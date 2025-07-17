import { useContext, useMemo, useState, useEffect } from 'react';
import { RadioButtonProps } from 'react-native-radio-buttons-group';
import { showToast } from '../utils/functions';
import StoreContext from '../store';
import { router } from 'expo-router';
import {
	ErrorState,
	initialErrorState,
	FlagItem,
} from '../app/(tabs)/create-flag';
import * as SecureStore from 'expo-secure-store';

const useCreateFlag = () => {
	const { addItemToAllProfiles, isValidNoCardItems } =
		useContext<any>(StoreContext);
	const radioButtons: RadioButtonProps[] = useMemo(
		() => [
			{
				id: '1',
				label: 'Flag',
				value: 'flag',
				color: '#000',
				labelStyle: { color: '#000', fontSize: 20 },
			},
			{
				id: '2',
				label: 'Dealbreaker',
				value: 'dealbreaker',
				color: 'red',
				labelStyle: { color: 'red', fontSize: 20 },
			},
		],
		[]
	);

	const [title, setTitle] = useState<string>('');
	const [description, setDescription] = useState<string>('');
	const [error, setError] = useState<ErrorState>(initialErrorState);

	// Reset form when component mounts
	useEffect(() => {
		console.log('Create Flag screen mounted - resetting form');
		setTitle('');
		setDescription('');
		setSelectedId('1');
		setError(initialErrorState);
	}, []);

	// Debug component lifecycle
	useEffect(() => {
		console.log('CreateFlags component mounted');

		return () => {
			console.log('CreateFlags component unmounted');
		};
	}, []);

	async function handleSubmit() {
		const userData = await SecureStore.getItemAsync('userData');
		const userDataObj = JSON.parse(userData as string);
		const role = userDataObj.role; // user, guest and admin
		if (validate()) {
			const type = selectedId === '1' ? 'flag' : 'dealbreaker';

			// Create a unique ID with timestamp for better tracking
			const newItemId = Math.random() * 1000 + Date.now() / 1000000;

			// Create the new item
			const newItem: FlagItem = {
				id: newItemId.toString(),
				title,
				description,
				flag: 'white',
			};

			// Check the count of flag if guest is user
			if (role === 'guest') {
				console.log('Guest is creating flag');
				const allowedNumber = 5;
				const isValid = isValidNoCardItems(allowedNumber);
				console.log('isValid', isValid);
				if (!isValid) {
					showToast(
						'error',
						`Guest only allowed to create ${allowedNumber} cards.`
					);
					return;
				}
			}
			// Use the central function to add the item to all profiles
			addItemToAllProfiles(newItem, type);

			// Log before navigation to help with debugging
			console.log('Flag created successfully, attempting navigation...');
			showToast('success', 'Flag created successfully');

			// Reset form immediately
			setTitle('');
			setDescription('');
			setSelectedId('1');

			// Try both local and global navigation methods
			console.log('Attempting navigation via component props');
			router.push('/(tabs)');
		} else showToast('error', 'Fix the following errors');
	}

	const [selectedId, setSelectedId] = useState<string>('1');
	function handleTitleChange(text: string) {
		setTitle(text);
		handleValidation('title', text);
	}
	function handleDescriptionChange(text: string) {
		setDescription(text);
		handleValidation('description', text);
	}
	function handleValidation(
		type: keyof ErrorState,
		text: string = '',
		isShow: boolean = true,
		initialError: ErrorState | null = null
	): ErrorState {
		let newError: ErrorState = {
			title: initialError ? initialError.title : error.title,
			description: initialError
				? initialError.description
				: error.description,
		};
		newError[type] = '';
		if (!text && type === 'title') {
			newError[type] = `${type} is required`;
		}
		if (text && type === 'title' && text.length > 100) {
			newError[type] = `${type} too long`;
		}
		if (text && type === 'description' && text.length > 1000) {
			newError[type] = `${type} too long`;
		}
		if (isShow) setError(newError);

		return newError;
	}

	function validate(): boolean {
		let newError = handleValidation('title', title, false, error);
		newError = handleValidation(
			'description',
			description,
			false,
			newError
		);
		setError(newError);
		const errorList = Object.values(newError);
		return !errorList.find((item) => item);
	}
	return {
		radioButtons,
		title,
		description,
		error,
		handleSubmit,
		handleTitleChange,
		handleDescriptionChange,
		selectedId,
		setSelectedId,
	};
};

export default useCreateFlag;
