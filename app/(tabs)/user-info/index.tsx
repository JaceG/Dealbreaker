import {
	View,
	Text,
	useWindowDimensions,
	StyleSheet,
	TextInput,
	Modal,
	Alert,
	ScrollView,
} from 'react-native';
import {
	GoogleSignin,
	statusCodes,
	isCancelledResponse,
} from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
	EXPO_PUBLIC_OAUTH_IOS_CLIENT_ID,
	EXPO_PUBLIC_OAUTH_EXPO_CLIENT_ID,
} from '@env';
import { colors } from '../../../libs/board/constants';
import AppButton from '../../../components/AppButton';
import BoardLogModal from '../../../components/BoardLogModal';
import { boardLogEnabled } from '../../../utils/boardLog';
import { useAuth } from '../../../context/Auth';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
	saveMyAccount,
	getSignInMethods,
	changeSignInMethod,
} from '../../../utils/api';
import { useAuthActions } from '../../../hooks/useAuthActions';
import { forgetFaceIdLogin, getSecureItem } from '../../../utils/storage';
import { dropPendingChangesFor } from '../../../utils/api';
import { SignInMethods, SignInType } from '../../../models/apiModels';

const PROVIDER_NAME: Record<SignInType, string> = {
	google: 'Google',
	apple: 'Apple',
};

// Asks Google or Apple for a fresh identity token, which proves the person controls that account.
// Returns null if the person cancels.
const getIdToken = async (type: SignInType): Promise<string | null> => {
	let idToken;
	if (type === 'google') {
		await GoogleSignin.hasPlayServices();
		const response = await GoogleSignin.signIn();
		if (isCancelledResponse(response)) return null;
		idToken = response.data.idToken;
	} else {
		const credential = await AppleAuthentication.signInAsync({
			requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
		});
		idToken = credential.identityToken;
	}
	if (!idToken) throw new Error(`${type} returned no identity token`);
	return idToken;
};

export const UserInfo = () => {
	const { user, updateUserName, authToken } = useAuth();
	console.log('authToken: ', authToken);
	const [name, setName] = useState('');
	const [isEditing, setIsEditing] = useState(false);
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
	const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
	const { logout, confirmLogout } = useAuthActions();
	const [boardLogVisible, setBoardLogVisible] = useState(false);
	// undefined while loading, null if loading failed
	const [methods, setMethods] = useState<SignInMethods | null>();
	const [isAppleAvailable, setIsAppleAvailable] = useState(false);
	const hasPassword = methods?.hasPassword ?? true;

	useEffect(() => {
		GoogleSignin.configure({
			iosClientId: EXPO_PUBLIC_OAUTH_IOS_CLIENT_ID,
			webClientId: EXPO_PUBLIC_OAUTH_EXPO_CLIENT_ID,
		});
		AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
	}, []);

	// Counts connects, disconnects and password sets, so an older load can't undo them.
	const changes = useRef(0);
	const saveMethods = (updated: SignInMethods) => {
		changes.current++;
		setMethods(updated);
	};
	const loadMethods = useCallback(() => {
		if (!authToken) return;
		const seen = changes.current;
		getSignInMethods(authToken).then((loaded) => {
			// A failed reload keeps what was already shown.
			if (changes.current === seen)
				setMethods((shown) => loaded ?? shown ?? null);
		});
	}, [authToken]);
	// Reload each time the tab opens.
	useFocusEffect(loadMethods);
	const retryLoadMethods = async () => {
		const loaded = await getSignInMethods(authToken || '');
		if (loaded) saveMethods(loaded);
		else alert('Failed to load your sign-in methods');
	};

	const handleConnect = async (type: SignInType) => {
		let idToken;
		try {
			idToken = await getIdToken(type);
		} catch (error: any) {
			const cancelled =
				error.code === statusCodes.SIGN_IN_CANCELLED ||
				error.code === 'ERR_REQUEST_CANCELED';
			if (!cancelled) alert(`Failed to sign in with ${PROVIDER_NAME[type]}`);
			return;
		}
		if (!idToken) return;
		try {
			saveMethods(
				await changeSignInMethod('connect', type, authToken || '', idToken)
			);
			alert(`${PROVIDER_NAME[type]} connected successfully`);
		} catch (error: any) {
			alert(`Failed to connect ${PROVIDER_NAME[type]}. ${error.message}`);
		}
	};

	const handleDisconnect = (type: SignInType) => {
		const name = PROVIDER_NAME[type];
		const ways = [methods?.hasPassword, methods?.google, methods?.apple];
		if (ways.filter(Boolean).length < 2) {
			alert(
				`Set a password or connect another account before disconnecting ${name}.`
			);
			return;
		}
		Alert.alert(
			`Disconnect ${name}?`,
			`You won't be able to sign in with ${name} until you connect it again.`,
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Disconnect',
					style: 'destructive',
					onPress: async () => {
						try {
							saveMethods(
								await changeSignInMethod(
									'disconnect',
									type,
									authToken || ''
								)
							);
							alert(`${name} disconnected successfully`);
						} catch (error: any) {
							alert(`Failed to disconnect ${name}. ${error.message}`);
						}
					},
				},
			]
		);
	};
	const handleNameChange = (text: string) => {
		setName(text);
	};
	const handleEdit = async () => {
		if (isEditing && name) {
			updateUserName(name);
			const response = await saveMyAccount(
				1,
				name,
				'',
				'',
				authToken || ''
			);
			console.log(response);
			if (response) {
				alert('Name updated successfully');
			} else {
				alert('Failed to update name');
			}
		}
		setIsEditing((prev) => !prev);
	};
	const handleSave = async () => {
		// If user is trying to change password, validate password fields
		if (currentPassword || newPassword || confirmPassword) {
			// Validate that all password fields are filled
			if (hasPassword && !currentPassword.trim()) {
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
			if (newPassword.length < 6) {
				alert('Please enter a password with 6 or more characters');
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
			const response = await saveMyAccount(
				2,
				'',
				currentPassword,
				newPassword,
				authToken || ''
			);
			console.log(response);
			if (response) {
				alert(
					hasPassword
						? 'Password updated successfully'
						: 'Password set successfully'
				);
				changes.current++;
				setMethods((shown) => shown && { ...shown, hasPassword: true });
			} else {
				alert(
					hasPassword
						? 'Failed to update password'
						: 'Failed to set password'
				);
			}
		}

		// Clear password fields after successful save
		setCurrentPassword('');
		setNewPassword('');
		setConfirmPassword('');
	};

	const handleDeleteAccount = () => {
		setShowDeleteConfirmation(true);
	};

	const handleConfirmDelete = async () => {
		if (deleteConfirmationText.toLowerCase() !== 'delete my account') {
			alert(
				'Please type "Delete my account" exactly to confirm deletion'
			);
			return;
		}

		// Queued offline notes must not be posted after the account is gone. Dropped first, so a sync that
		// starts during the delete can't send them; if the delete fails they are lost, which is acceptable here.
		const deletingId = JSON.parse((await getSecureItem('userData')) || 'null')?.id;
		if (deletingId) await dropPendingChangesFor(deletingId);
		const response = await saveMyAccount(3, '', '', '', authToken || '');
		console.log(response);
		setShowDeleteConfirmation(false);
		if (response) {
			alert('Account deleted successfully');
			await forgetFaceIdLogin();
			logout();
		} else {
			alert('Failed to delete account');
		}
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
		<ScrollView
			style={styles.scroll}
			keyboardShouldPersistTaps='handled'
			automaticallyAdjustKeyboardInsets>
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
						<View style={styles.inlineButton}>
							<AppButton
								title={isEditing ? 'Save' : 'Edit'}
								onPress={handleEdit}
								variant={isEditing ? 'primary' : 'secondary'}
							/>
						</View>
					</View>
				</View>
				<Text style={styles.textHeader}>Sign-in Methods</Text>
				<View style={styles.seperator}></View>
				{methods === null && (
					<>
						<Text style={styles.textMuted}>
							Couldn't load your sign-in methods.
						</Text>
						<AppButton title='Try Again' onPress={retryLoadMethods} variant='secondary' />
					</>
				)}
				{methods &&
					(['google', 'apple'] as const).map((type) => (
						<View style={styles.row} key={type}>
							<Text style={styles.text}>{PROVIDER_NAME[type]}:</Text>
							<View style={styles.methodStatus}>
								<Text style={styles.textMuted}>
									{methods[type] ? 'Connected' : 'Not connected'}
								</Text>
								{methods[type] ? (
									<AppButton
										title='Disconnect'
										onPress={() => handleDisconnect(type)}
										variant='secondary'
									/>
								) : (
									(type === 'google' || isAppleAvailable) && (
										<AppButton
											title='Connect'
											onPress={() => handleConnect(type)}
											variant='secondary'
										/>
									)
								)}
							</View>
						</View>
					))}
				<Text style={styles.textHeader}>
					{hasPassword ? 'Change Password' : 'Set Password'}
				</Text>
				<View style={styles.seperator}></View>
				{hasPassword && (
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
				)}
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
					<AppButton
						title={hasPassword ? 'Save New Password' : 'Save Password'}
						onPress={handleSave}
					/>
				</View>

				{/* Testing aid, test builds only: board and drag events, also uploaded for review. */}
				{boardLogEnabled ? (
					<>
						<View style={styles.logoutSection}>
							<AppButton title='Board Log' onPress={() => setBoardLogVisible(true)} variant='secondary' />
						</View>
						<BoardLogModal visible={boardLogVisible} onClose={() => setBoardLogVisible(false)} />
					</>
				) : null}

				<View style={styles.logoutSection}>
					<AppButton title='Log Out' onPress={confirmLogout} variant='secondary' />
				</View>

				<Text style={styles.dangerHeader}>Danger Zone</Text>
				<View style={styles.seperator}></View>
				<View style={styles.deleteSection}>
					<Text style={styles.deleteWarningText}>
						⚠️ Warning: This action cannot be undone. Deleting your
						account will permanently remove all your data, profiles, and
						flags.
					</Text>
					<AppButton
						title='Delete Account'
						onPress={handleDeleteAccount}
						variant='destructive'
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
								Type "Delete my account" below to confirm:
							</Text>
							<TextInput
								value={deleteConfirmationText}
								onChangeText={setDeleteConfirmationText}
								style={styles.confirmationInput}
								placeholder='Type "Delete my account"'
								autoCapitalize='none'
								placeholderTextColor={'#999'}
							/>
							<View style={styles.modalButtons}>
								<View style={styles.modalButton}>
									<AppButton
										title='Cancel'
										onPress={handleCancelDelete}
										variant='secondary'
									/>
								</View>
								<View style={styles.modalButton}>
									<AppButton
										title='Delete Account'
										onPress={handleConfirmDelete}
										variant='destructive'
									/>
								</View>
							</View>
						</View>
					</View>
				</Modal>
			</View>
		</ScrollView>
	);
};

const styles = StyleSheet.create({
	logoutSection: {
		marginTop: 30,
	},
	scroll: {
		flex: 1,
		backgroundColor: 'white',
	},
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
	methodStatus: {
		flexDirection: 'row' as const,
		alignItems: 'center' as const,
		gap: 8,
	},
	inlineButton: {
		marginLeft: 8,
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
	modalButton: {
		flex: 1,
	},
});

export default UserInfo;
