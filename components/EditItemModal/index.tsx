import React, { useState, useEffect } from 'react';
import {
	Modal,
	View,
	StyleSheet,
	ScrollView,
	Text,
	Alert,
	useWindowDimensions,
} from 'react-native';
import AppButton from '../AppButton';
import AppInput from '../AppInput';
import { EditItemModalProps } from '../../models/modalModels';

import { colors, radius, typeScale } from '../../libs/board/constants';
const EditItemModal = ({
	visible,
	onClose,
	onSave,
	item,
}: EditItemModalProps) => {
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [error, setError] = useState({
		title: '',
		description: '',
	});

	// Initialize form values when the modal becomes visible or item changes
	useEffect(() => {
		if (visible && item) {
			setTitle(item.title || '');
			setDescription(item.description || '');
			setError({
				title: '',
				description: '',
			});
		}
	}, [visible, item]);

	const handleTitleChange = (text: string) => {
		setTitle(text);
		validateField('title', text);
	};

	const handleDescriptionChange = (text: string) => {
		setDescription(text);
		validateField('description', text);
	};

	const validateField = (field: string, value: string) => {
		let errorMessage = '';

		if (field === 'title') {
			if (!value.trim()) {
				errorMessage = 'Title is required';
			} else if (value.length > 100) {
				errorMessage = 'Title is too long (max 100 characters)';
			}
		} else if (field === 'description') {
			if (value.length > 1000) {
				errorMessage = 'Description is too long (max 1000 characters)';
			}
		}

		setError((prev) => ({
			...prev,
			[field]: errorMessage,
		}));

		return !errorMessage;
	};

	const handleSave = () => {
		// Validate all fields
		const isTitleValid = validateField('title', title);
		const isDescriptionValid = validateField('description', description);

		if (isTitleValid && isDescriptionValid) {
			// Show confirmation dialog
			Alert.alert(
				'Save Changes',
				'This will update the item across all profiles. Continue?',
				[
					{
						text: 'Cancel',
						style: 'cancel',
					},
					{
						text: 'Save',
						onPress: () => {
							// Call the onSave callback with updated values
							onSave({
								...item,
								title,
								description,
							});
							onClose();
						},
					},
				]
			);
		}
	};

	const { width, height } = useWindowDimensions();
	const isPortrait = height >= width;

	return (
		<Modal
			animationType='slide'
			transparent={true}
			visible={visible}
			supportedOrientations={[
				'portrait',
				'portrait-upside-down',
				'landscape',
				'landscape-left',
				'landscape-right',
			]}
			onRequestClose={onClose}>
			{/* A scroll view lets the popup move above the keyboard, and a tap outside the fields closes the keyboard. */}
			<ScrollView
				style={styles.backdrop}
				contentContainerStyle={styles.centeredView}
				keyboardShouldPersistTaps='handled'
				automaticallyAdjustKeyboardInsets>
				<View
					style={
						isPortrait
							? styles.modalView
							: styles.modalViewHorizontal
					}>
					<Text style={styles.modalTitle}>Edit Item</Text>

					<View style={styles.inputContainer}>
						<Text style={styles.inputLabel}>Title:</Text>
						<AppInput
							value={title}
							onChangeText={handleTitleChange}
							placeholder='Enter title'
						/>
						{error.title ? (
							<Text style={styles.errorText}>{error.title}</Text>
						) : null}
					</View>

					<View style={styles.inputContainer}>
						<Text style={styles.inputLabel}>Description:</Text>
						<AppInput
							value={description}
							onChangeText={handleDescriptionChange}
							placeholder='Enter description'
							multiline={true}
							numberOfLines={4}
						/>
						{error.description ? (
							<Text style={styles.errorText}>
								{error.description}
							</Text>
						) : null}
					</View>

					<View
						style={
							isPortrait
								? styles.buttonContainer
								: styles.buttonContainerHorizontal
						}>
						<View style={styles.buttonWrapper}>
							<AppButton
								title='Cancel'
								onPress={onClose}
								variant='secondary'
							/>
						</View>
						<View style={styles.buttonWrapper}>
							<AppButton
								title='Save'
								onPress={handleSave}
							/>
						</View>
					</View>
				</View>
			</ScrollView>
		</Modal>
	);
};

const styles = StyleSheet.create({
	backdrop: {
		backgroundColor: colors.scrim,
	},
	centeredView: {
		flexGrow: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 20,
	},
	modalView: {
		width: '90%',
		backgroundColor: colors.surface,
		borderRadius: radius.card,
		padding: 20,
	},
	modalViewHorizontal: {
		width: '80%',
		height: '80%',
		backgroundColor: colors.surface,
		borderRadius: radius.card,
		padding: 10,
	},
	modalTitle: {
		...typeScale.heading,
		marginBottom: 15,
		textAlign: 'center',
	},
	inputContainer: {
		marginBottom: 10,
	},
	inputLabel: {
		...typeScale.label,
		marginBottom: 6,
	},
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 20,
		gap: 15,
	},
	buttonContainerHorizontal: {
		flexDirection: 'row',
		justifyContent: 'center',
		marginTop: 20,
		gap: 15,
	},
	buttonWrapper: {
		flex: 1,
	},
	errorText: {
		...typeScale.label,
		color: colors.danger,
		marginTop: 5,
	},
});

export default EditItemModal;
