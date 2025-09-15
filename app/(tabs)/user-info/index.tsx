import {
	View,
	Text,
	useWindowDimensions,
	StyleSheet,
	TextInput,
	Button,
	Modal,
	Alert,
} from 'react-native';
import { colors } from '../../../libs/board/constants';
import { useAuth } from '../../../context/Auth';
import { useState, useEffect } from 'react';

export const UserInfo = () => {
	const { user } = useAuth();
	const [name, setName] = useState('');
	const [isEditing, setIsEditing] = useState(false);
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
	const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
	const handleNameChange = (text: string) => {
		setName(text);
	};
	const handleEdit = () => {
		setIsEditing((prev) => !prev);
	};
	const handleSave = () => {
		// If user is trying to change password, validate password fields
		if (currentPassword || newPassword || confirmPassword) {
			// Validate that all password fields are filled
			if (!currentPassword.trim()) {
				alert('Please enter your current password');
				return;
			}
			if (!newPassword.trim()) {
				alert('Please enter a new password');
				return;
			}
			if (!confirmPassword.trim()) {
				alert('Please confirm your new password');
				return;
			}
			if (newPassword !== confirmPassword) {
				alert('New password and confirmation do not match');
				return;
			}
			if (newPassword === currentPassword) {
				alert('New password must be different from current password');
				return;
			}
		}

		// TODO: Implement actual save logic for name and password changes
		console.log('Save - validation passed');

		// Clear password fields after successful save
		setCurrentPassword('');
		setNewPassword('');
		setConfirmPassword('');
	};

	const handleDeleteAccount = () => {
		setShowDeleteConfirmation(true);
	};

	const handleConfirmDelete = () => {
		if (deleteConfirmationText.toLowerCase() !== 'delete my account') {
			alert(
				'Please type "delete my account" exactly to confirm deletion'
			);
			return;
		}

		// TODO: Implement actual account deletion logic
		console.log('Account deletion confirmed');
		setShowDeleteConfirmation(false);
		setDeleteConfirmationText('');
	};

	const handleCancelDelete = () => {
		setShowDeleteConfirmation(false);
		setDeleteConfirmationText('');
	};
	useEffect(() => {
		setName(user?.name || '');
	}, [user]);
	console.log(user);
	const { width, height } = useWindowDimensions();
	const isPortrait = height >= width;
	return (
		<View
			style={isPortrait ? styles.container : styles.horizontalContainer}>
			<Text style={styles.textHeader}>Personal Info</Text>
			<View style={styles.seperator}></View>
			<View style={styles.row}>
				<Text style={styles.text}>Email:</Text>
				<Text style={styles.textMuted}>
					{user?.email || 'No email found'}
				</Text>
			</View>
			<View style={styles.row}>
				<Text style={styles.text}>Name:</Text>
				<View style={styles.inputContainer}>
					{!isEditing ? (
						<Text style={styles.textMuted}>
							{user?.name || 'No name found'}
						</Text>
					) : (
						<TextInput
							value={name}
							onChangeText={handleNameChange}
							style={styles.textInput}
							placeholder='Enter Name'
							placeholderTextColor={'white'}
						/>
					)}
					<Button
						title={isEditing ? 'Save New Name' : 'Edit'}
						onPress={handleEdit}
					/>
				</View>
			</View>
			<Text style={styles.textHeader}>Change Password</Text>
			<View style={styles.seperator}></View>
			<View style={styles.row}>
				<Text style={styles.text}>Current Password:</Text>
				<TextInput
					value={currentPassword}
					onChangeText={setCurrentPassword}
					style={styles.passwordTextInput}
					placeholder='Enter Current Password'
					placeholderTextColor={'white'}
					secureTextEntry={true}
				/>
			</View>
			<View style={styles.row}>
				<Text style={styles.text}>New Password:</Text>
				<TextInput
					value={newPassword}
					onChangeText={setNewPassword}
					style={styles.passwordTextInput}
					placeholder='Enter New Password'
					placeholderTextColor={'white'}
					secureTextEntry={true}
				/>
			</View>
			<View style={styles.row}>
				<Text style={styles.text}>Confirm Password:</Text>
				<TextInput
					value={confirmPassword}
					onChangeText={setConfirmPassword}
					style={styles.passwordTextInput}
					placeholder='Enter Confirm Password'
					placeholderTextColor={'white'}
					secureTextEntry={true}
				/>
			</View>
			<View style={styles.passwordButtonContainer}>
				<Button title='Save New Password' onPress={handleSave} />
			</View>

			<Text style={styles.dangerHeader}>Danger Zone</Text>
			<View style={styles.seperator}></View>
			<View style={styles.deleteSection}>
				<Text style={styles.deleteWarningText}>
					⚠️ Warning: This action cannot be undone. Deleting your
					account will permanently remove all your data, profiles, and
					flags.
				</Text>
				<Button
					title='Delete Account'
					onPress={handleDeleteAccount}
					color='#dc3545'
				/>
			</View>

			{/* Delete Confirmation Modal */}
			<Modal
				visible={showDeleteConfirmation}
				transparent={true}
				animationType='slide'>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Delete Account</Text>
						<Text style={styles.modalWarning}>
							⚠️ This action is permanent and cannot be undone!
						</Text>
						<Text style={styles.modalDescription}>
							All your data, profiles, and flags will be
							permanently deleted.
						</Text>
						<Text style={styles.modalInstruction}>
							Type "delete my account" below to confirm:
						</Text>
						<TextInput
							value={deleteConfirmationText}
							onChangeText={setDeleteConfirmationText}
							style={styles.confirmationInput}
							placeholder='Type "delete my account"'
							placeholderTextColor={'#999'}
						/>
						<View style={styles.modalButtons}>
							<Button
								title='Cancel'
								onPress={handleCancelDelete}
								color='#6c757d'
							/>
							<Button
								title='Delete Account'
								onPress={handleConfirmDelete}
								color='#dc3545'
							/>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: 'white',
		padding: 10,
	},
	horizontalContainer: {
		flex: 1,
		backgroundColor: '#fff',
		width: '100%',
		paddingHorizontal: 70,
		paddingTop: 10,
		alignItems: 'center',
	},
	seperator: {
		width: '100%',
		height: 1,
		backgroundColor: '#CCC',
		marginVertical: 10,
	},
	row: {
		flexDirection: 'row' as const,
		width: '100%',
		justifyContent: 'space-between' as const,
		alignItems: 'flex-start' as const,
		marginBottom: 10,
	},
	inputContainer: {
		flexDirection: 'row' as const,
		justifyContent: 'space-between' as const,
		alignItems: 'center' as const,
		width: '50%',
	},
	textInput: {
		padding: 13,
		borderWidth: 1,
		borderColor: '#000',
		borderRadius: 5,
		flex: 1,
		color: '#000',
	},
	passwordTextInput: {
		padding: 13,
		borderWidth: 1,
		borderColor: '#000',
		borderRadius: 5,
		width: '50%',
		color: '#000',
	},
	text: {
		fontSize: 20,
		marginBottom: 10,
		fontWeight: 'bold' as const,
		color: '#000',
	},
	textHeader: {
		fontSize: 20,
		marginBottom: 10,
		textAlign: 'center' as const,
		fontWeight: 'bold' as const,
		color: '#000',
	},
	textMuted: {
		fontSize: 20,
		marginBottom: 10,
		fontWeight: 'normal' as const,
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
	passwordButtonContainer: {
		width: '100%',
		justifyContent: 'flex-end' as const,
		marginTop: 10,
	},
	dangerHeader: {
		fontSize: 20,
		marginBottom: 10,
		marginTop: 30,
		textAlign: 'center' as const,
		fontWeight: 'bold' as const,
		color: '#dc3545',
	},
	deleteSection: {
		backgroundColor: '#fff5f5',
		padding: 15,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#fecaca',
		marginBottom: 20,
	},
	deleteWarningText: {
		fontSize: 14,
		color: '#dc2626',
		marginBottom: 15,
		lineHeight: 20,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center' as const,
		alignItems: 'center' as const,
		padding: 20,
	},
	modalContent: {
		backgroundColor: 'white',
		borderRadius: 10,
		padding: 20,
		width: '100%',
		maxWidth: 400,
	},
	modalTitle: {
		fontSize: 24,
		fontWeight: 'bold' as const,
		color: '#dc3545',
		textAlign: 'center' as const,
		marginBottom: 15,
	},
	modalWarning: {
		fontSize: 18,
		color: '#dc2626',
		textAlign: 'center' as const,
		marginBottom: 10,
		fontWeight: 'bold' as const,
	},
	modalDescription: {
		fontSize: 16,
		color: '#374151',
		textAlign: 'center' as const,
		marginBottom: 20,
		lineHeight: 22,
	},
	modalInstruction: {
		fontSize: 16,
		color: '#000',
		marginBottom: 10,
		fontWeight: '600' as const,
	},
	confirmationInput: {
		borderWidth: 1,
		borderColor: '#d1d5db',
		borderRadius: 5,
		padding: 12,
		fontSize: 16,
		marginBottom: 20,
		color: '#000',
	},
	modalButtons: {
		flexDirection: 'row' as const,
		justifyContent: 'space-between' as const,
		gap: 10,
	},
});

export default UserInfo;
