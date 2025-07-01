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
			<SwitchProfileModal
				visible={visible}
				onClose={() => setVisible(false)}
			/>

			<ConfirmationModal
				visible={deleteModalVisible}
				onClose={() => {
					setDeleteModalVisible(false);
					setItemToDelete(null);
				}}
				onConfirm={confirmDeleteItem}
				title='Delete Item'
				message='This will delete the item from all profiles. Are you sure you want to delete it?'
			/>

			<EditItemModal
				visible={editModalVisible}
				onClose={() => {
					setEditModalVisible(false);
					setItemToEdit(null);
				}}
				onSave={handleSaveEdit}
				item={itemToEdit}
			/>

			<EditProfileModal
				visible={editProfileModalVisible}
				onClose={() => setEditProfileModalVisible(false)}
				onSave={handleSaveProfileEdit}
				profileId={currentProfileId}
				profileName={getCurrentProfileName()}
				existingProfiles={profiles}
			/>

			<DealbreakerAlert
				visible={dealbreakerAlertVisible}
				onClose={() => {
					setDealbreakerAlertVisible(false);
					setTransitionedItem(null);
				}}
				onUndo={handleUndoTransition}
				itemTitle={transitionedItem?.title || ''}
			/>

			{/* Flag change reason modal from context */}
			<ReasonInputModal
				key={`reasonModal-${reasonModalVisible}`}
				visible={reasonModalVisible}
				onClose={handleCancelFlagChange}
				onSubmit={handleFlagChangeWithReason}
				flagTitle={
					pendingFlagChange?.item?.attributes?.row?.name || 'Flag'
				}
				prevStatus={pendingFlagChange?.previousStatus || 'white'}
				newStatus={pendingFlagChange?.newFlag || 'white'}
			/>

			{/* Additional reason modal from context */}
			<ReasonInputModal
				key={`additionalReasonModal-${additionalReasonModalVisible}`}
				visible={additionalReasonModalVisible}
				onClose={() => setAdditionalReasonModalVisible(false)}
				onSubmit={handleAddAdditionalReason}
				flagTitle={selectedFlag?.title || selectedFlag?.name || 'Flag'}
				prevStatus='white'
				newStatus={selectedFlag?.flag || 'white'}
				modalTitle='Add Additional Context'
			/>

			{/* Flag history modal from context */}
			{selectedFlag && (
				<FlagHistoryModal
					visible={historyModalVisible}
					onClose={() => setHistoryModalVisible(false)}
					profileId={currentProfileId}
					flagId={selectedFlag?.id}
					flagTitle={selectedFlag?.title || selectedFlag?.name || ''}
					onAddReason={handleOpenAddReasonModal}
				/>
			)}

			{/* Transition reason modal */}
			<ReasonInputModal
				visible={transitionReasonModalVisible}
				onClose={handleTransitionReasonCancel}
				onSubmit={handleTransitionReasonSubmit}
				flagTitle={pendingTransition?.itemTitle || 'Item'}
				prevStatus={
					pendingTransition?.type === 'dealbreaker-to-flag'
						? 'dealbreaker'
						: pendingTransition?.prevStatus || 'white'
				}
				newStatus={pendingTransition?.newStatus || 'white'}
				modalTitle={
					pendingTransition?.type === 'flag-to-dealbreaker'
						? 'Moving to Dealbreakers'
						: 'Moving to Flags'
				}
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
								onDragEnd={(draggedItem: any) => {
									if (!dealbreaker?.[currentProfileId])
										return;

									// Set the flag to indicate this is a user drag operation
									isDragOperationRef.current = true;

									let isDealbreaker = false;
									if (draggedItem.attributes.columnId === 2) {
										isDealbreaker = true;
									}
									let oldIndex = flagListIndexRef.current.get(
										draggedItem.attributes.row.id
									);
									console.log('oldIndex: ', oldIndex);
									console.log(
										'draggedItem: ',
										draggedItem.attributes.row.id
									);
									if (!oldIndex && oldIndex !== 0) {
										oldIndex =
											dealbreakerListIndexRef.current.get(
												draggedItem.attributes.row.id
											);
									}
									updateListOrder(
										draggedItem.attributes.index,
										oldIndex as number,
										draggedItem.attributes.row.id,
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
