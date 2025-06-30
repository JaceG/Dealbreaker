import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Modal, TextInput, Alert } from 'react-native';
import AppButton from '../AppButton';
import { colors } from '../../libs/board/constants';

const EditProfileModal = ({
	visible,
	onClose,
	onSave,
	profileId,
	profileName,
	existingProfiles,
}) => {
	const [name, setName] = useState('');
	const [error, setError] = useState('');

	// Initialize form values when the modal becomes visible or profileName changes
	useEffect(() => {
		if (visible && profileName) {
			setName(profileName);
			setError('');
		}
	}, [visible, profileName]);

	const handleNameChange = (text) => {
		setName(text);
		validateName(text);
	};

	const validateName = (value) => {
		// Name cannot be empty
		if (!value.trim()) {
			setError('Profile name is required');
			return false;
		}

		// Name cannot be "main" (case insensitive) if this isn't already the main profile
		if (profileId !== 'main' && value.trim().toLowerCase() === 'main') {
			setError('Cannot use "main" as a profile name');
			return false;
		}

		// Name cannot be an existing profile name (except the current one)
		if (
			existingProfiles &&
			existingProfiles.some(
				(p) =>
					p.id !== profileId &&
					p.name.toLowerCase() === value.trim().toLowerCase()
			)
		) {
			setError('Profile name already exists');
			return false;
		}

		// Name length restriction
		if (value.length > 50) {
			setError('Profile name too long (max 50 characters)');
			return false;
		}

		// Clear error when valid
		setError('');
		return true;
	};

	const handleSave = () => {
		// Validate name
		if (!validateName(name)) {
			return;
		}

		// Check if new name is the same as old name
		if (name.trim() === profileName) {
			onClose();
			return;
		}

		// Show confirmation dialog
		Alert.alert(
			'Rename Profile',
			`Are you sure you want to rename "${profileName}" to "${name.trim()}"?`,
			[
				{
					text: 'Cancel',
					style: 'cancel',
				},
				{
					text: 'Rename',
					onPress: () => {
						// Call the onSave callback with the profileId and new name
						onSave(profileId, name.trim());
						onClose();
					},
				},
			]
		);
	};

	return (
		<Modal
			animationType='slide'
			transparent={true}
			visible={visible}
			onRequestClose={onClose}>
			<View style={styles.centeredView}>
				<View style={styles.modalView}>
					<Text style={styles.modalTitle}>Edit Profile Name</Text>

					<View style={styles.inputContainer}>
						<Text style={styles.inputLabel}>Name:</Text>
						<TextInput
							style={styles.nameInput}
							value={name}
							onChangeText={handleNameChange}
							placeholder='Enter profile name'
						/>
						{error ? (
							<Text style={styles.errorText}>{error}</Text>
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
	nameInput: {
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 5,
		padding: 10,
		fontSize: 16,
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

export default EditProfileModal;
