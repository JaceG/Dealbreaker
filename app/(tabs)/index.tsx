import {
	ActivityIndicator,
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
} from 'react-native';
import { Board } from '../../libs/board/components';
import AppButton from '../../components/AppButton';
import { colors, typeScale } from '../../libs/board/constants';
import Feather from '@expo/vector-icons/Feather';
import { router, useNavigation } from 'expo-router';
import useBoardManagement from '../../hooks/useBoardManagement';
import BoardManagementModals from '../../components/BoardManagementModals';
import ProfileOverview from '../../components/ProfileOverview';
import PeopleOverview from '../../components/PeopleOverview';
import CompareProfilesModal from '../../components/CompareProfilesModal';
import StoreContext from '../../store';
import { showToast } from '../../utils/functions';
import { useContext, useLayoutEffect, useState } from 'react';
import { useAuth } from '../../context/Auth';
import { boardLog } from '../../utils/boardLog';

export default function Lists() {
	const {
		// Core Data & Context
		dealbreaker,
		profiles,
		currentProfileId,

		// Board State
		list,
		isRemount,
		refreshKey,

		// Modal Visibility States
		deleteModalVisible,
		editModalVisible,
		editProfileModalVisible,
		reasonModalVisible,
		additionalReasonModalVisible,
		historyModalVisible,
		dealbreakerAlertVisible,
		transitionReasonModalVisible,

		// Modal State Setters
		setDeleteModalVisible,
		setEditModalVisible,
		setEditProfileModalVisible,
		setAdditionalReasonModalVisible,
		setHistoryModalVisible,
		setDealbreakerAlertVisible,

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

		// Utility Functions
		getCurrentProfileName,
		updateBoard,
		handleViewFlagHistory,
		colorFilter,
		setColorFilter,
		setRefreshKey,
	} = useBoardManagement();
	const { setCurrentProfileId, ensureProfileExists, boardReady, isOnline } = useContext<any>(StoreContext);
	const hasCards =
		dealbreaker?.[currentProfileId]?.flag?.length > 0 ||
		dealbreaker?.[currentProfileId]?.dealbreaker?.length > 0;
	const [compareVisible, setCompareVisible] = useState(false);
	const mainDealbreakerIds = new Set<string>(
		(dealbreaker?.main?.dealbreaker || []).map((item: any) => item.id)
	);
	const openProfile = (profileId: string) => {
		ensureProfileExists(profileId);
		setCurrentProfileId(profileId);
	};

	// The header is the board's one title line: whose board it is, and on a person's board the pencil to edit them.
	const navigation = useNavigation();
	const { user } = useAuth();
	const isMain = currentProfileId === 'main';
	const personName = profiles.find((p: any) => p.id === currentProfileId)?.name || 'Profile';
	const ended = !!dealbreaker?.[currentProfileId]?.ended;
	useLayoutEffect(() => {
		navigation.setOptions({
			headerTitle: isMain ? 'Main' : `${personName}${ended ? ' (ended)' : ''}`,
			headerRight: () => (
				<View style={styles.headerRight}>
					{!isMain ? (
						<TouchableOpacity
							onPress={handleEditProfile}
							accessibilityRole='button'
							accessibilityLabel='Edit person'
							hitSlop={12}>
							<Feather name='edit-2' size={20} color={colors.muted} />
						</TouchableOpacity>
					) : null}
					{user?.role == 'guest' ? (
						<AppButton title='Register' variant='link' onPress={() => router.push('/register')} />
					) : null}
				</View>
			),
		});
	}, [navigation, isMain, personName, ended, user?.role]); // handleEditProfile only checks for Main, which isMain covers

	return (
		<View style={styles.container}>
			<CompareProfilesModal
				visible={compareVisible}
				onClose={() => setCompareVisible(false)}
				focusId={currentProfileId !== 'main' ? currentProfileId : undefined}
			/>
			<BoardManagementModals
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

			{list && !isRemount && hasCards ? (
				<>
					{currentProfileId === 'main' ? (
						<PeopleOverview
							dealbreaker={dealbreaker}
							profiles={profiles}
							onOpenProfile={openProfile}
							onCompare={() => setCompareVisible(true)}
						/>
					) : (
						<ProfileOverview
							profileId={currentProfileId}
							profile={dealbreaker[currentProfileId]}
							mainDealbreakerIds={mainDealbreakerIds}
							colorFilter={colorFilter}
							onFilterChange={setColorFilter}
							onOpenCard={handleViewFlagHistory}
							onCompare={() => setCompareVisible(true)}
						/>
					)}
					{!isRemount && (list as any)?.profileId === currentProfileId ? (
						<Board
							// Only a person switch remounts the board; saves update it in place (no flash).
							key={`board-${currentProfileId}`}
							viewKey={currentProfileId}
							boardRepository={list}
							open={() => {}}
							showDeleteItem={currentProfileId === 'main'}
							onFlagClicked={handleFlagClick}
							onDragEnd={(_: any, __: any, draggedItem: any) => {
								if (!dealbreaker?.[currentProfileId]) return;

								// Hidden cards would make the drop position wrong, so put the card back.
								if (colorFilter) {
									boardLog('drag.saveBlocked', { reason: 'color filter on', filter: colorFilter });
									showToast('info', 'Clear the filter to move cards');
									updateBoard(true);
									setRefreshKey(Date.now());
									return;
								}

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
									boardLog('drag.saveBlocked', { reason: 'invalid dragged item' });
									return;
								}

								// Set the flag to indicate this is a user drag operation
								isDragOperationRef.current = true;

								let isDealbreaker = false;
								if (draggedItem.attributes.columnId === 2) {
									isDealbreaker = true;
								}

								const itemId = draggedItem.attributes.row.id;
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
												draggedItem.attributes.index,
											oldIndex: oldIndex,
											itemId: itemId,
										}
									);
									boardLog('drag.saveBlocked', {
										reason: 'missing index',
										itemId,
										newIndex: draggedItem.attributes.index,
										oldIndex,
									});
									return;
								}

								boardLog('drag.save', {
									profile: currentProfileId,
									itemId,
									oldIndex,
									newIndex: draggedItem.attributes.index,
									toColumn: isDealbreaker ? 'dealbreakers' : 'flags',
								});
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
						/>
					) : null}
				</>
			) : !boardReady || (hasCards && !isRemount) ? (
				// Not known yet (or the board is a frame from drawing): "No Flags Yet" here would be wrong for an account with flags.
				<View style={[styles.noDealbreakerContainer, styles.loading]}>
					<ActivityIndicator size='large' color={colors.ink} />
					<Text style={styles.loadingText}>
						{boardReady || isOnline ? 'Loading flags…' : "You're offline. Your flags will load when you're back online."}
					</Text>
				</View>
			) : (
				<>
				{/* Main keeps its people list even before it has any cards. */}
				{currentProfileId === 'main' && !isRemount ? (
					<PeopleOverview
						dealbreaker={dealbreaker}
						profiles={profiles}
						onOpenProfile={openProfile}
						onCompare={() => setCompareVisible(true)}
					/>
				) : null}
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
				</>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.paper,
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
		...typeScale.heading,
	},
	loading: { gap: 12, paddingHorizontal: 32 },
	loadingText: { ...typeScale.body, color: colors.muted, textAlign: 'center' },
	headerRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
		marginRight: 16,
	},
	emptyView: {
		height: 80,
	},
});
