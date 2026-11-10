import React, { useState, useEffect, useContext } from 'react';
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
import { EditProfileModalProps } from '../../models/modalModels';
import StoreContext from '../../store';
import { showToast } from '../../utils/functions';

import { colors, typeScale } from '../../libs/board/constants';
const EditProfileModal = ({
	visible,
	onClose,
	onSave,
	profileId,
	profileName,
	existingProfiles,
}: EditProfileModalProps) => {
	const [name, setName] = useState('');
	const [error, setError] = useState('');
	const { dealbreaker, setProfileEnded } = useContext(StoreContext) as any;
	const isEnded = !!dealbreaker?.[profileId]?.ended;

	const handleToggleEnded = () => {
		setProfileEnded(profileId, !isEnded);
		showToast(
			'success',
			isEnded ? 'Profile marked as active' : 'Profile marked as ended'
		);
		onClose();
	};

	// Initialize form values when the modal becomes visible or profileName changes
	useEffect(() => {
		if (visible && profileName) {
			setName(profileName);
			setError('');
		}
	}, [visible, profileName]);

	const handleNameChange = (text: string) => {
		setName(text);
		validateName(text);
	};

	const validateName = (value: string) => {
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
					<Text style={styles.modalTitle}>Edit Profile</Text>

					<View style={styles.inputContainer}>
						<Text style={styles.inputLabel}>Name:</Text>
						<AppInput
							value={name}
							onChangeText={handleNameChange}
							placeholder='Enter profile name'
						/>
						{error ? (
							<Text style={styles.errorText}>{error}</Text>
						) : null}
					</View>

					<AppButton
						title={isEnded ? 'Mark as Active' : 'Mark as Ended'}
						onPress={handleToggleEnded}
						variant='secondary'
					/>

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
		borderRadius: 10,
		padding: 20,
		shadowColor: colors.ink,
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 5,
	},
	modalViewHorizontal: {
		width: '70%',
		backgroundColor: colors.surface,
		borderRadius: 10,
		padding: 20,
		shadowColor: colors.ink,
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 5,
	},
	modalTitle: {
		...typeScale.heading,
		marginBottom: 15,
		textAlign: 'center',
	},
	inputContainer: {
		marginBottom: 15,
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
		gap: 20,
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

export default EditProfileModal;
