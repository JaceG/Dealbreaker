import {
	StyleSheet,
	Text,
	View,
	TextInput,
	Button,
	TouchableOpacity,
} from 'react-native';
import { color } from 'react-native-reanimated';
import { useMemo, useState, useContext, useCallback, useEffect } from 'react';
import { showToast } from '../../../utils/functions';
import { set } from 'react-native-reanimated';
import StoreContext from '../../../store';
import { router } from 'expo-router';
import { colors } from '../../../libs/board/constants';

// Type definitions
interface Profile {
	id: string;
	name: string;
}

interface StoreContextType {
	profiles: Profile[];
	createProfile: (name: string) => string | null;
}

interface ErrorState {
	name: string;
}

interface CreateUsersProps {
	navigation: {
		navigate: (screen: string, params?: any) => void;
		// Add other navigation methods as needed
	};
}

export default function CreateUsers({ navigation }: CreateUsersProps) {
	const { profiles, createProfile } = useContext(
		StoreContext
	) as StoreContextType;

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

	function handleSubmit(): void {
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

	return (
		<View style={styles.container}>
			<View style={styles.row}>
				<Text style={styles.text}>Name:</Text>
				<TextInput
					value={name}
					onChangeText={handleNameChange}
					style={styles.textInput}
					placeholder='Enter Name'
					placeholderTextColor={'white'}
				/>
				{error.name ? (
					<Text style={styles.errorText}>{error.name}</Text>
				) : null}
			</View>
			<View style={{ width: '100%', marginTop: 20 }}>
				<TouchableOpacity
					style={styles.button}
					onPress={() => {
						console.log(
							'Create button pressed - handling submission'
						);
						handleSubmit();
					}}
					activeOpacity={0.7}>
					<Text style={styles.buttonText}>CREATE PROFILE</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: 'white',
		padding: 10,
	},
	row: {
		flexDirection: 'column' as const,
		width: '100%',
		justifyContent: 'center',
		alignItems: 'flex-start' as const,
		marginBottom: 10,
	},
	textInput: {
		padding: 13,
		borderWidth: 1,
		borderColor: '#000',
		borderRadius: 5,
		width: '100%',
		color: '#000',
	},
	text: {
		fontSize: 20,
		marginBottom: 10,
		fontWeight: 'bold' as const,
		color: '#000',
	},
	description: {
		height: 120,
		textAlignVertical: 'top' as const,
		color: '#000',
	},
	radioButtonStyle: {
		flexDirection: 'row' as const,
		justifyContent: 'space-between' as const,
	},
	errorText: {
		color: '#000',
		fontSize: 16,
		marginTop: 3,
		marginBottom: 3,
	},
	button: {
		backgroundColor: colors.exodusFruit,
		paddingVertical: 15,
		paddingHorizontal: 20,
		borderRadius: 10,
		alignItems: 'center' as const,
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 2,
	},
	buttonText: {
		color: '#fff',
		fontSize: 18,
		fontWeight: 'bold' as const,
	},
});
