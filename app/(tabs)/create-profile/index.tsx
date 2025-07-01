import {
	StyleSheet,
	Text,
	View,
	TextInput,
	TouchableOpacity,
} from 'react-native';
import { colors } from '../../../libs/board/constants';
import useCreateProfile from '../../../hooks/useCreateProfile';

// Type definitions
export interface Profile {
	id: string;
	name: string;
}

export interface StoreContextType {
	profiles: Profile[];
	createProfile: (name: string) => string | null;
}

export interface ErrorState {
	name: string;
}

export interface CreateUsersProps {
	navigation: {
		navigate: (screen: string, params?: any) => void;
		// Add other navigation methods as needed
	};
}

export default function CreateUsers({ navigation }: CreateUsersProps) {
	const { name, error, handleSubmit, handleNameChange } = useCreateProfile();
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
