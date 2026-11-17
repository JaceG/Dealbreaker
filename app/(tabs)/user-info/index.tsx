import {
	View,
	Text,
	useWindowDimensions,
	StyleSheet,
	Modal,
	Alert,
	ScrollView,
	TouchableOpacity,
	ActivityIndicator,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
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
import { colors, radius, typeScale } from '../../../libs/board/constants';
import AppButton from '../../../components/AppButton';
import AppInput from '../../../components/AppInput';
import BoardLogModal from '../../../components/BoardLogModal';
import { boardLogAllowed, diagnosticsActive, useAuth } from '../../../context/Auth';
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
	const { width, height } = useWindowDimensions();
	const isPortrait = height >= width;
	return (
		<ScrollView
			style={styles.scroll}
			keyboardShouldPersistTaps='handled'
			automaticallyAdjustKeyboardInsets>
			<View
				style={isPortrait ? styles.container : styles.horizontalContainer}>
				<Text style={styles.sectionLabel}>Personal Info</Text>
				<View style={styles.card}>
					<View style={styles.row}>
						<Text style={styles.text}>Email:</Text>
						<Text style={styles.textMuted}>
							{user?.email || 'No email found'}
						</Text>
					</View>
					<View style={[styles.row, styles.divider]}>
						<Text style={styles.text}>Name:</Text>
						<View style={styles.inputContainer}>
							{!isEditing ? (
								<Text style={styles.textMuted}>
									{user?.name || 'No name found'}
								</Text>
							) : (
								<AppInput
									value={name}
									onChangeText={handleNameChange}
									style={styles.textInput}
									placeholder='Enter Name'
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
				</View>
				<Text style={styles.sectionLabel}>Sign-in Methods</Text>
				<View style={styles.card}>
					{methods === undefined && <ActivityIndicator style={styles.gapAround} color={colors.muted} />}
					{methods === null && (
						<View style={styles.retry}>
							<Text style={[styles.textMuted, styles.gapAround]}>
								Couldn't load your sign-in methods.
							</Text>
							<AppButton title='Try Again' onPress={retryLoadMethods} variant='secondary' />
						</View>
					)}
					{methods &&
						(['google', 'apple'] as const).map((type, i) => (
							<View style={[styles.row, i > 0 && styles.divider]} key={type}>
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
				</View>
				<Text style={styles.sectionLabel}>
					{hasPassword ? 'Change Password' : 'Set Password'}
				</Text>
				<View style={styles.card}>
					{hasPassword && (
						<View style={styles.row}>
							<Text style={styles.text}>Current Password:</Text>
							<AppInput
								value={currentPassword}
								onChangeText={setCurrentPassword}
								style={styles.passwordTextInput}
								placeholder='Enter Current Password'
								secureTextEntry={true}
							/>
						</View>
					)}
					<View style={[styles.row, hasPassword && styles.divider]}>
						<Text style={styles.text}>New Password:</Text>
						<AppInput
							value={newPassword}
							onChangeText={setNewPassword}
							style={styles.passwordTextInput}
							placeholder='Enter New Password'
							secureTextEntry={true}
						/>
					</View>
					<View style={[styles.row, styles.divider]}>
						<Text style={styles.text}>Confirm Password:</Text>
						<AppInput
							value={confirmPassword}
							onChangeText={setConfirmPassword}
							style={styles.passwordTextInput}
							placeholder='Enter Confirm Password'
							secureTextEntry={true}
						/>
					</View>
					<View style={styles.passwordButtonContainer}>
						<AppButton
							title={hasPassword ? 'Save New Password' : 'Save Password'}
							onPress={handleSave}
						/>
					</View>
				</View>

				{/* Developer accounts, or support diagnostics: board and drag events, also uploaded for review. */}
				{boardLogAllowed(user) ? (
					<>
						<Text style={styles.sectionLabel}>Support</Text>
						<View style={styles.card}>
							{!user?.developer && diagnosticsActive(user) ? (
								<Text style={[styles.diagnosticsNote, styles.gapAround]}>
									Diagnostics are on until{' '}
									{new Date(user!.diagnosticsUntil).toLocaleDateString()}. What you do on the
									board is shared with support so they can find the problem.
								</Text>
							) : null}
							<TouchableOpacity
								style={[styles.row, styles.navRow, !user?.developer && diagnosticsActive(user) && styles.divider]}
								onPress={() => setBoardLogVisible(true)}
								accessibilityRole='button'>
								<Text style={styles.textMuted}>Board Log</Text>
								<Feather name='chevron-right' size={20} color={colors.muted} />
							</TouchableOpacity>
						</View>
						<BoardLogModal visible={boardLogVisible} onClose={() => setBoardLogVisible(false)} />
					</>
				) : null}

				<View style={styles.logoutSection}>
					<AppButton title='Log Out' onPress={confirmLogout} variant='link' />
				</View>

				<Text style={[styles.sectionLabel, styles.dangerLabel]}>Danger Zone</Text>
				<View style={[styles.card, styles.deleteSection]}>
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
							<AppInput
								value={deleteConfirmationText}
								onChangeText={setDeleteConfirmationText}
								style={styles.confirmationInput}
								placeholder='Type "Delete my account"'
								autoCapitalize='none'
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
	// Each section is a white card under a small left-aligned heading, rows split by hairlines.
	sectionLabel: {
		...typeScale.label,
		color: colors.muted,
		alignSelf: 'stretch' as const,
		marginTop: 24,
		marginBottom: 6,
		marginLeft: 4,
	},
	card: {
		width: '100%',
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.hairline,
		borderRadius: radius.card,
		paddingHorizontal: 12,
	},
	divider: {
		borderTopWidth: 1,
		borderTopColor: colors.hairline,
	},
	navRow: {
		minHeight: 48,
	},
	dangerLabel: {
		color: colors.danger,
	},
	logoutSection: {
		marginTop: 16,
		width: '100%',
	},
	diagnosticsNote: {
		...typeScale.body,
		color: colors.ink,
		marginBottom: 8,
	},
	scroll: {
		flex: 1,
		backgroundColor: colors.paper,
	},
	container: {
		flex: 1,
		backgroundColor: colors.paper,
		padding: 10,
	},
	horizontalContainer: {
		flex: 1,
		backgroundColor: colors.paper,
		width: '100%',
		paddingHorizontal: 70,
		paddingTop: 10,
		alignItems: 'center',
	},
	row: {
		flexDirection: 'row' as const,
		width: '100%',
		justifyContent: 'space-between' as const,
		alignItems: 'center' as const,
		paddingVertical: 10,
	},
	gapAround: {
		marginVertical: 10,
	},
	retry: {
		paddingBottom: 12,
	},
	inputContainer: {
		flexDirection: 'row' as const,
		justifyContent: 'space-between' as const,
		alignItems: 'center' as const,
		width: '50%',
	},
	textInput: {
		flex: 1,
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
		width: '50%',
	},
	text: {
		...typeScale.label,
		color: colors.ink,
	},
	textMuted: {
		...typeScale.body,
		color: colors.ink,
	},
	passwordButtonContainer: {
		width: '100%',
		paddingBottom: 12,
	},
	deleteSection: {
		paddingVertical: 12,
		marginBottom: 20,
	},
	deleteWarningText: {
		...typeScale.body,
		color: colors.danger,
		marginBottom: 15,
		lineHeight: 20,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: colors.scrim,
		justifyContent: 'center' as const,
		alignItems: 'center' as const,
		padding: 20,
	},
	modalContent: {
		backgroundColor: colors.surface,
		borderRadius: radius.card,
		padding: 20,
		width: '100%',
		maxWidth: 400,
	},
	modalTitle: {
		...typeScale.heading,
		color: colors.danger,
		textAlign: 'center' as const,
		marginBottom: 15,
	},
	modalWarning: {
		...typeScale.emphasis,
		color: colors.danger,
		textAlign: 'center' as const,
		marginBottom: 10,
	},
	modalDescription: {
		...typeScale.body,
		color: colors.ink,
		textAlign: 'center' as const,
		marginBottom: 20,
		lineHeight: 22,
	},
	modalInstruction: {
		...typeScale.label,
		color: colors.ink,
		marginBottom: 10,
	},
	confirmationInput: {
		marginBottom: 20,
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
