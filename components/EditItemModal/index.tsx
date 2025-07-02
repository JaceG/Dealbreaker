import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Modal, TextInput, Alert } from 'react-native';
import AppButton from '../AppButton';
import { colors } from '../../libs/board/constants';
import { EditItemModalProps } from '../../models/modalModels';

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

	return (
		<Modal
			animationType='slide'
			transparent={true}
			visible={visible}
			onRequestClose={onClose}>
			<View style={styles.centeredView}>
				<View style={styles.modalView}>
					<Text style={styles.modalTitle}>Edit Item</Text>

					<View style={styles.inputContainer}>
						<Text style={styles.inputLabel}>Title:</Text>
						<TextInput
							style={styles.titleInput}
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
						<TextInput
							style={styles.descriptionInput}
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

					<View style={styles.buttonContainer}>
						<View style={styles.buttonWrapper}>
							<AppButton
								title='Cancel'
								onPress={onClose}
								color='#6c757d'
							/>
						</View>
						<View style={styles.buttonWrapper}>
							<AppButton
								title='Save'
								onPress={handleSave}
								color={colors.exodusFruit}
							/>
						</View>
					</View>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	centeredView: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modalView: {
		width: '90%',
		backgroundColor: 'white',
		borderRadius: 10,
		padding: 20,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 5,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 15,
		textAlign: 'center',
	},
	inputContainer: {
		marginBottom: 15,
	},
	inputLabel: {
		fontSize: 16,
		fontWeight: 'bold',
		marginBottom: 5,
	},
	titleInput: {
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 5,
		padding: 10,
		fontSize: 16,
	},
	descriptionInput: {
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 5,
		padding: 10,
		fontSize: 16,
		height: 100,
		textAlignVertical: 'top',
	},
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 20,
		gap: 15,
	},
	buttonWrapper: {
		flex: 1,
	},
	errorText: {
		color: 'red',
		fontSize: 14,
		marginTop: 5,
	},
});

export default EditItemModal;
