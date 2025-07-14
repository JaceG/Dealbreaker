import React from 'react';
import {
	StyleSheet,
	Text,
	View,
	TextInput,
	TouchableOpacity,
	useWindowDimensions,
} from 'react-native';
import RadioGroup from 'react-native-radio-buttons-group';
import { colors } from '../../../libs/board/constants';
import useCreateFlag from '../../../hooks/useCreateFlag';

// Types from app/_layout.tsx
export interface FlagItem {
	id: string;
	[key: string]: any;
}

export interface ErrorState {
	title: string;
	description: string;
}

export const initialErrorState: ErrorState = {
	title: '',
	description: '',
};

const CreateFlags: React.FC<{}> = () => {
	const {
		radioButtons,
		title,
		description,
		error,
		handleSubmit,
		handleTitleChange,
		handleDescriptionChange,
		selectedId,
		setSelectedId,
	} = useCreateFlag();
	// Context type is not strongly typed in store, so use 'any' for now
	const { width, height } = useWindowDimensions();
	const isPortrait = height >= width;
	return (
		<View
			style={isPortrait ? styles.container : styles.horizontalContainer}>
			<View style={styles.horizontalRow}>
				<View style={styles.flexRow}>
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
				{!isPortrait ? (
					<View>
						<RadioGroup
							containerStyle={styles.radioButtonStyle}
							radioButtons={radioButtons}
							onPress={setSelectedId}
							selectedId={selectedId}
						/>
					</View>
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
			{isPortrait ? (
				<View>
					<RadioGroup
						containerStyle={styles.radioButtonStyle}
						radioButtons={radioButtons}
						onPress={setSelectedId}
						selectedId={selectedId}
					/>
				</View>
			) : null}
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
	horizontalContainer: {
		flex: 1,
		backgroundColor: '#fff',
		width: '100%',
		paddingHorizontal: 70,
		paddingTop: 10,
		alignItems: 'center',
	},
	container: {
		flex: 1,
		backgroundColor: '#fff',
		width: '100%',
		alignItems: 'center',
		padding: 10,
	},
	row: {
		flexDirection: 'column',
		width: '100%',
		justifyContent: 'center',
		alignItems: 'flex-start',
		marginBottom: 10,
	},
	flexRow: {
		flex: 1,
	},
	horizontalRow: {
		flexDirection: 'row',
		width: '100%',
		justifyContent: 'space-between',
		alignItems: 'flex-end',
		marginBottom: 10,
	},
	textInput: {
		padding: 13,
		borderWidth: 1,
		borderColor: '#000',
		borderRadius: 5,
		width: '100%',
	},
	text: {
		fontSize: 20,
		marginBottom: 10,
		fontWeight: 'bold',
		color: '#000',
	},
	description: {
		height: 70,
		textAlignVertical: 'top',
		color: '#000',
	},
	radioButtonStyle: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingTop: 10,
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
		alignItems: 'center',
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 2,
	},
	buttonText: {
		color: '#fff',
		fontSize: 18,
		fontWeight: 'bold',
	},
});

export default CreateFlags;
