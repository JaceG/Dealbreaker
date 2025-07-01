import { Dropdown } from 'react-native-element-dropdown';
import { StyleSheet, Modal, View, Text, Alert } from 'react-native';
import { useState, useContext, useEffect, useCallback, memo } from 'react';
import AppButton from '../AppButton';
import StoreContext from '../../store';

const SwitchProfileModal = memo(
	({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
		// Move all context usage to the top level of the component
		const {
			currentProfileId,
			setCurrentProfileId,
			profiles = [],
			ensureProfileExists,
			deleteProfile,
		} = useContext(StoreContext);

		const [selectedId, setSelectedId] = useState(null);
		const [isFocus, setIsFocus] = useState(false);
		const [data, setData] = useState([]);

		// Update dropdown data and selected value when modal becomes visible
		useEffect(() => {
			if (visible) {
				// Ensure profiles is an array before mapping
				if (Array.isArray(profiles)) {
					setData(
						profiles.map((p) => ({
							label: p.name || 'Unnamed',
							value: p.id,
						}))
					);
					setSelectedId(currentProfileId);
				} else {
					console.warn('Profiles is not an array:', profiles);
					setData([]);
				}
			}
		}, [profiles, currentProfileId, visible]);

		// Check if a profile can be deleted (not main and not the only profile)
		const canDeleteProfile = useCallback(
			(profileId) => {
				return (
					profileId !== 'main' &&
					Array.isArray(profiles) &&
					profiles.length > 1
				);
			},
			[profiles]
		);

		// Handle profile change with proper error handling
		const handleProfileChange = useCallback(() => {
			if (!selectedId || selectedId === currentProfileId) {
				onClose();
				return;
			}

			// Close modal first for better UX
			onClose();

			// Ensure profile exists before switching
			ensureProfileExists(selectedId);

			// Change the profile
			setCurrentProfileId(selectedId);
		}, [
			selectedId,
			currentProfileId,
			onClose,
			ensureProfileExists,
			setCurrentProfileId,
		]);

		// Handle profile deletion
		const handleDeleteProfile = useCallback(() => {
			// Extra protection - don't allow deleting main profile or if only one profile exists
			if (!canDeleteProfile(selectedId)) {
				console.log(
					'Prevented attempt to delete profile - either main or only profile'
				);
				return;
			}

			// Find the profile name to display in the confirmation
			const selectedProfile = profiles.find((p) => p.id === selectedId);
			if (!selectedProfile) return;

			// Show confirmation alert
			Alert.alert(
				'Delete Profile',
				`Are you sure you want to delete the "${selectedProfile.name}" profile? This action cannot be undone.`,
				[
					{
						text: 'Cancel',
						style: 'cancel',
					},
					{
						text: 'Delete',
						style: 'destructive',
						onPress: () => {
							// Final safety check before deletion
							if (!canDeleteProfile(selectedId)) {
								console.error(
									'Attempted to delete protected profile - prevented'
								);
								return;
							}

							// Close modal first
							onClose();

							// Delete the profile
							const success = deleteProfile(selectedId);

							if (success) {
								// Show success message
								Alert.alert(
									'Success',
									`Profile "${selectedProfile.name}" was deleted successfully.`
								);
							}
						},
					},
				]
			);
		}, [selectedId, profiles, canDeleteProfile, onClose, deleteProfile]);

		const handleDropdownChange = useCallback((item) => {
			setSelectedId(item.value);
			setIsFocus(false);
		}, []);

		return (
			<Modal visible={visible} animationType='slide'>
				<View style={styles.modalContainer}>
					<View style={styles.modalInnerContainer}>
						<Text style={styles.modalTitle}>Switch Profile</Text>
						<Dropdown
							data={data}
							style={[
								styles.dropdown,
								isFocus && { borderColor: 'blue' },
							]}
							placeholderStyle={styles.placeholderStyle}
							selectedTextStyle={styles.selectedTextStyle}
							inputSearchStyle={styles.inputSearchStyle}
							iconStyle={styles.iconStyle}
							search
							maxHeight={300}
							labelField='label'
							valueField='value'
							placeholder={!isFocus ? 'Select profile' : '...'}
							searchPlaceholder='Search...'
							value={selectedId}
							onFocus={() => setIsFocus(true)}
							onBlur={() => setIsFocus(false)}
							onChange={handleDropdownChange}
						/>
						<View style={styles.buttonContainer}>
							<AppButton
								title='Select Profile'
								onPress={handleProfileChange}
							/>
							{canDeleteProfile(selectedId) ? (
								<AppButton
									title='Delete Profile'
									onPress={handleDeleteProfile}
									color='#d9534f'
								/>
							) : null}
							<AppButton
								title='Close'
								onPress={onClose}
								color='#6c757d'
							/>
						</View>
					</View>
				</View>
			</Modal>
		);
	}
);

const styles = StyleSheet.create({
	container: {
		padding: 16,
	},
	dropdown: {
		height: 50,
		width: 200,
		borderColor: 'gray',
		borderWidth: 0.5,
		borderRadius: 8,
		paddingHorizontal: 8,
	},
	icon: {
		marginRight: 5,
	},
	label: {
		position: 'absolute',
		backgroundColor: 'white',
		left: 22,
		top: 8,
		zIndex: 999,
		paddingHorizontal: 8,
		fontSize: 14,
	},
	placeholderStyle: {
		fontSize: 16,
	},
	selectedTextStyle: {
		fontSize: 16,
	},
	iconStyle: {
		width: 20,
		height: 20,
	},
	inputSearchStyle: {
		height: 40,
		fontSize: 16,
	},
	modalContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		gap: 10,
	},
	buttonContainer: {
		flexDirection: 'column',
		width: '100%',
		justifyContent: 'center',
		alignItems: 'stretch',
		marginTop: 20,
		gap: 10,
	},
	modalInnerContainer: {
		justifyContent: 'center',
		alignItems: 'center',
		gap: 10,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: 'bold',
	},
});

export default SwitchProfileModal;
