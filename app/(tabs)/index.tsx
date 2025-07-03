import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Board, BoardRepository } from '../../libs/board/components';
import AppButton from '../../components/AppButton';
import SwitchProfileModal from '../../components/SwitchProfileModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import EditItemModal from '../../components/EditItemModal';
import EditProfileModal from '../../components/EditProfileModal';
import DealbreakerAlert from '../../components/DealbreakerAlert';
import FlagHistoryModal from '../../components/FlagHistoryModal';
import ReasonInputModal from '../../components/ReasonInputModal';
import { router } from 'expo-router';
import useBoardManagement from '../../hooks/useBoardManagement';
import BoardManagementModals from '../../components/BoardManagementModals';

export default function Lists() {
	const {
		// Core Data & Context
		ScreenHeight,
		params,
		dealbreaker,
		profiles,
		user,
		currentProfileId,

		// Board State
		list,
		isRemount,
		refreshKey,

		// Modal Visibility States
		visible,
		deleteModalVisible,
		editModalVisible,
		editProfileModalVisible,
		reasonModalVisible,
		additionalReasonModalVisible,
		historyModalVisible,
		dealbreakerAlertVisible,
		transitionReasonModalVisible,

		// Modal State Setters
		setVisible,
		setDeleteModalVisible,
		setEditModalVisible,
		setEditProfileModalVisible,
		setReasonModalVisible,
		setAdditionalReasonModalVisible,
		setHistoryModalVisible,
		setDealbreakerAlertVisible,
		setTransitionReasonModalVisible,

		// Item & Transition State
		itemToDelete,
		setItemToDelete,
		itemToEdit,
		setItemToEdit,
		transitionedItem,
		setTransitionedItem,
		pendingFlagChange,
		selectedFlag,
		pendingTransition,

		// Board Management
		setIsRemount,
		setList,

		// Refs & Internal State
		flagListIndexRef,
		dealbreakerListIndexRef,
		isDragOperationRef,

		// Event Handlers
		handleDeleteItem,
		handleEditItem,
		handleSaveEdit,
		handleEditProfile,
		handleSaveProfileEdit,
		handleFlagClick,
		handleFlagChangeWithReason,
		handleCancelFlagChange,
		handleAddAdditionalReason,
		handleOpenAddReasonModal,
		handleUndoTransition,
		handleTransitionReasonSubmit,
		handleTransitionReasonCancel,

		// Action Functions
		confirmDeleteItem,
		updateListOrder,
		updateBoard,
		cleanupDuplicates,

		// Utility Functions
		getCurrentProfileName,
		debugModalState,
	} = useBoardManagement();

	return (
		<View style={styles.container}>
			<BoardManagementModals
				visible={visible}
				setVisible={setVisible}
				deleteModalVisible={deleteModalVisible}
				setDeleteModalVisible={setDeleteModalVisible}
				itemToDelete={itemToDelete}
				setItemToDelete={setItemToDelete}
				editModalVisible={editModalVisible}
				setEditModalVisible={setEditModalVisible}
				itemToEdit={itemToEdit}
				setItemToEdit={setItemToEdit}
				editProfileModalVisible={editProfileModalVisible}
				setEditProfileModalVisible={setEditProfileModalVisible}
				dealbreakerAlertVisible={dealbreakerAlertVisible}
				setDealbreakerAlertVisible={setDealbreakerAlertVisible}
				transitionedItem={transitionedItem}
				setTransitionedItem={setTransitionedItem}
				pendingFlagChange={pendingFlagChange}
				selectedFlag={selectedFlag}
				reasonModalVisible={reasonModalVisible}
				additionalReasonModalVisible={additionalReasonModalVisible}
				historyModalVisible={historyModalVisible}
				currentProfileId={currentProfileId}
				profiles={profiles}
				confirmDeleteItem={confirmDeleteItem}
				handleSaveEdit={handleSaveEdit}
				handleUndoTransition={handleUndoTransition}
				handleCancelFlagChange={handleCancelFlagChange}
				handleFlagChangeWithReason={handleFlagChangeWithReason}
				handleAddAdditionalReason={handleAddAdditionalReason}
				handleOpenAddReasonModal={handleOpenAddReasonModal}
				handleTransitionReasonCancel={handleTransitionReasonCancel}
				handleTransitionReasonSubmit={handleTransitionReasonSubmit}
				pendingTransition={pendingTransition}
				transitionReasonModalVisible={transitionReasonModalVisible}
				handleSaveProfileEdit={handleSaveProfileEdit}
				getCurrentProfileName={getCurrentProfileName}
				setAdditionalReasonModalVisible={
					setAdditionalReasonModalVisible
				}
				setHistoryModalVisible={setHistoryModalVisible}
			/>

			{list &&
			!isRemount &&
			dealbreaker?.[currentProfileId] &&
			(dealbreaker[currentProfileId]?.flag?.length > 0 ||
				dealbreaker[currentProfileId]?.dealbreaker?.length > 0) ? (
				<>
					<View>
						<View style={styles.profileButtonContainer}>
							<View style={styles.innerProfileButtonContainer}>
								<View style={styles.profileSwitchTextContainer}>
									<Text style={styles.profileLabel}>
										Profile:{' '}
									</Text>
									<View style={styles.profileNameContainer}>
										<Text style={styles.profileText}>
											{getCurrentProfileName()}
										</Text>
										{currentProfileId !== 'main' && (
											<TouchableOpacity
												style={styles.editProfileButton}
												onPress={handleEditProfile}>
												<Text
													style={
														styles.editProfileText
													}>
													✏️
												</Text>
											</TouchableOpacity>
										)}
									</View>
								</View>
							</View>
						</View>

						{!isRemount ? (
							<Board
								cardBorderRadius='10px'
								key={`board-${currentProfileId}-${refreshKey}`}
								boardRepository={list}
								open={() => {}}
								onFlagClicked={handleFlagClick}
								onDragEnd={(
									_: any,
									__: any,
									draggedItem: any
								) => {
									if (!dealbreaker?.[currentProfileId])
										return;

									// Safety checks for draggedItem structure
									if (
										!draggedItem ||
										!draggedItem.attributes ||
										!draggedItem.attributes.row ||
										!draggedItem.attributes.row.id
									) {
										console.warn(
											'Invalid draggedItem structure:',
											draggedItem
										);
										return;
									}

									// Set the flag to indicate this is a user drag operation
									isDragOperationRef.current = true;

									let isDealbreaker = false;
									if (draggedItem.attributes.columnId === 2) {
										isDealbreaker = true;
									}

									const itemId =
										draggedItem.attributes.row.id;
									let oldIndex =
										flagListIndexRef.current.get(itemId);
									console.log('oldIndex: ', oldIndex);
									console.log('draggedItem: ', itemId);

									if (!oldIndex && oldIndex !== 0) {
										oldIndex =
											dealbreakerListIndexRef.current.get(
												itemId
											);
									}

									// Safety check for required properties
									if (
										draggedItem.attributes.index ===
											undefined ||
										oldIndex === undefined
									) {
										console.warn(
											'Missing required properties for updateListOrder:',
											{
												newIndex:
													draggedItem.attributes
														.index,
												oldIndex: oldIndex,
												itemId: itemId,
											}
										);
										return;
									}

									updateListOrder(
										draggedItem.attributes.index,
										oldIndex as number,
										itemId,
										isDealbreaker
									);
								}}
								onDeleteItem={handleDeleteItem}
								onEditItem={handleEditItem}
								isWithCountBadge={false}
								cardNameTextColor='white'
							/>
						) : null}
					</View>
				</>
			) : (
				<View style={styles.noDealbreakerContainer}>
					<View style={styles.noDealbreakerInContainer}>
						<Text style={styles.noDealbreakerText}>
							{isRemount ? '' : 'No Flags Yet'}
						</Text>
						{!isRemount && (
							<AppButton
								title='Create Flag'
								onPress={() => {
									router.push('/create-flag');
								}}
							/>
						)}
					</View>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
		// justifyContent: 'fl',
	},
	noDealbreakerContainer: {
		flex: 1,
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
	},
	noDealbreakerInContainer: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	noDealbreakerText: {
		fontSize: 20,
		fontWeight: 'bold',
	},
	profileButtonContainer: {
		marginTop: 10,
		alignSelf: 'center',
		justifyContent: 'center',
		alignItems: 'center',
	},
	innerProfileButtonContainer: {
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 5,
	},
	buttonRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 10,
	},
	profileSwitchTextContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 5,
		marginBottom: 5,
	},
	profileNameContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	profileLabel: {
		fontSize: 16,
		fontWeight: 'bold',
	},
	profileText: {
		fontSize: 16,
		fontWeight: 'bold',
	},
	editProfileButton: {
		marginLeft: 5,
	},
	editProfileText: {
		fontSize: 16,
	},
	emptyView: {
		height: 80,
	},
});
