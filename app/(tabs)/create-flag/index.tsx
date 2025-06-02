import React, {
	useMemo,
	useState,
	useContext,
	useEffect,
	useCallback,
} from 'react';
import {
	StyleSheet,
	Text,
	View,
	TextInput,
	TouchableOpacity,
} from 'react-native';
import RadioGroup, { RadioButtonProps } from 'react-native-radio-buttons-group';
import { showToast } from '../../../utils/functions';
import StoreContext from '../../../store';
import {
	useFocusEffect,
	CommonActions,
	StackActions,
} from '@react-navigation/native';
import { router } from 'expo-router';

// Types from app/_layout.tsx
interface FlagItem {
	id: string;
	[key: string]: any;
}

interface ErrorState {
	title: string;
	description: string;
}

const initialErrorState: ErrorState = {
	title: '',
	description: '',
};

const CreateFlags: React.FC<{}> = () => {
	// Context type is not strongly typed in store, so use 'any' for now
	const { addItemToAllProfiles } = useContext<any>(StoreContext);
	const radioButtons: RadioButtonProps[] = useMemo(
		() => [
			{
				id: '1',
				label: 'Flag',
				value: 'flag',
				color: '#fff',
				labelStyle: { color: '#fff', fontSize: 20 },
			},
			{
				id: '2',
				label: 'Dealbreaker',
				value: 'dealbreaker',
				color: '#fff',
				labelStyle: { color: '#fff', fontSize: 20 },
			},
		],
		[]
	);

	const [title, setTitle] = useState<string>('');
	const [description, setDescription] = useState<string>('');
	const [error, setError] = useState<ErrorState>(initialErrorState);

	// Reset form when screen is focused
	useFocusEffect(
		useCallback(() => {
			console.log('Create Flag screen focused - resetting form');
			setTitle('');
			setDescription('');
			setSelectedId('1');
			setError(initialErrorState);

			return () => {
				// Clean up when screen is unfocused
			};
		}, [])
	);

	// Debug component lifecycle
	useEffect(() => {
		console.log('CreateFlags component mounted');

		return () => {
			console.log('CreateFlags component unmounted');
		};
	}, []);

	function handleSubmit() {
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
			// router.push({
			// 	pathname: 'index',
			// });
			// setTimeout(() => {
			// 	// Try with global navigation utility
			// 	console.log(
			// 		'Attempting navigation via global navigation utility'
			// 	);
			// 	// router.push('(tabs)/index');

			// 	// Last resort - try reset
			// 	setTimeout(() => {
			// 		console.log('Final attempt with reset');
			// 		// reset({
			// 		// 	index: 0,
			// 		// 	routes: [{ name: '(tabs)/index' }],
			// 		// });
			// 	}, 300);
			// }, 300);
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

	return (
		<View style={styles.container}>
			<View style={styles.row}>
				<Text style={styles.text}>Flag Name:</Text>
				<TextInput
					value={title}
					onChangeText={handleTitleChange}
					style={styles.textInput}
					placeholder='Enter Name'
					placeholderTextColor={'white'}
				/>
				{error.title ? (
					<Text style={styles.errorText}>{error.title}</Text>
				) : null}
			</View>
			<View style={styles.row}>
				<Text style={styles.text}>Description:</Text>
				<TextInput
					value={description}
					onChangeText={handleDescriptionChange}
					style={{ ...styles.textInput, ...styles.description }}
					multiline={true}
					placeholder='Enter Description'
					placeholderTextColor={'white'}
				/>
				{error.description ? (
					<Text style={styles.errorText}>{error.description}</Text>
				) : null}
			</View>
			<View>
				<RadioGroup
					containerStyle={styles.radioButtonStyle}
					radioButtons={radioButtons}
					onPress={setSelectedId}
					selectedId={selectedId}
				/>
			</View>
			<View style={{ width: '100%', marginTop: 20 }}>
				<TouchableOpacity
					style={styles.button}
					onPress={handleSubmit}
					activeOpacity={0.7}>
					<Text style={styles.buttonText}>CREATE FLAG</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#eb4d4b',
		padding: 10,
	},
	row: {
		flexDirection: 'column',
		width: '100%',
		justifyContent: 'center',
		alignItems: 'flex-start',
		marginBottom: 10,
	},
	textInput: {
		padding: 13,
		borderWidth: 1,
		borderColor: '#fff',
		borderRadius: 5,
		width: '100%',
	},
	text: {
		fontSize: 20,
		marginBottom: 10,
		fontWeight: 'bold',
		color: '#fff',
	},
	description: {
		height: 120,
		textAlignVertical: 'top',
		color: '#fff',
	},
	radioButtonStyle: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	errorText: {
		color: '#fff',
		fontSize: 16,
		marginTop: 3,
		marginBottom: 3,
	},
	button: {
		backgroundColor: '#fff',
		paddingVertical: 15,
		paddingHorizontal: 20,
		borderRadius: 10,
		alignItems: 'center',
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 2,
	},
	buttonText: {
		color: '#eb4d4b',
		fontSize: 18,
		fontWeight: 'bold',
	},
});

export default CreateFlags;
