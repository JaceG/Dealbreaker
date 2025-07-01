import SwitchProfileModal from '../SwitchProfileModal';
import ConfirmationModal from '../ConfirmationModal';
import EditItemModal from '../EditItemModal';
import EditProfileModal from '../EditProfileModal';
import DealbreakerAlert from '../DealbreakerAlert';
import FlagHistoryModal from '../FlagHistoryModal';
import ReasonInputModal from '../ReasonInputModal';
import { BoardManagementModalsProps } from '../../models/boardManagementModel';

const BoardManagementModals = ({
	visible,
	setVisible,
	deleteModalVisible,
	setDeleteModalVisible,
	itemToDelete,
	setItemToDelete,
	editModalVisible,
	setEditModalVisible,
	itemToEdit,
	setItemToEdit,
	editProfileModalVisible,
	setEditProfileModalVisible,
	dealbreakerAlertVisible,
	setDealbreakerAlertVisible,
	transitionedItem,
	setTransitionedItem,
	pendingFlagChange,
	selectedFlag,
	reasonModalVisible,
	additionalReasonModalVisible,
	historyModalVisible,
	currentProfileId,
	profiles,
	confirmDeleteItem,
	handleSaveEdit,
	handleUndoTransition,
	handleCancelFlagChange,
	handleFlagChangeWithReason,
	handleAddAdditionalReason,
	handleOpenAddReasonModal,
	handleTransitionReasonCancel,
	handleTransitionReasonSubmit,
	pendingTransition,
	transitionReasonModalVisible,
	handleSaveProfileEdit,
	getCurrentProfileName,
	setAdditionalReasonModalVisible,
	setHistoryModalVisible,
}: BoardManagementModalsProps) => {
	return (
		<>
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
		</>
	);
};

export default BoardManagementModals;
