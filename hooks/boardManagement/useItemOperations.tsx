import { showToast } from '../../utils/functions';

export const useItemOperations = (
	dealbreaker: any,
	currentProfileId: string,
	removeItemFromAllProfiles: (id: string) => void,
	setDealbreaker: (value: any) => void,
	updateBoard: () => void,
	setList: (value: any) => void,
	setIsRemount: (value: boolean) => void,
	setRefreshKey: (value: number) => void,
	// Modal state management from useModalStates
	itemToDelete: any,
	setItemToDelete: (item: any) => void,
	itemToEdit: any,
	setItemToEdit: (item: any) => void,
	setDeleteModalVisible: (visible: boolean) => void,
	setEditModalVisible: (visible: boolean) => void
) => {
	const handleDeleteItem = (item: any) => {
		setItemToDelete(item);
		setDeleteModalVisible(true);
	};

	const confirmDeleteItem = () => {
		if (
			!itemToDelete ||
			!itemToDelete.attributes ||
			!itemToDelete.attributes.row
		) {
			setDeleteModalVisible(false);
			return;
		}

		const rowId = itemToDelete.attributes.row.id;
		if (!rowId) {
			setDeleteModalVisible(false);
			setItemToDelete(null);
			return;
		}

		// Close the modal first for better UX
		setDeleteModalVisible(false);
		setItemToDelete(null);

		// Delete the item using our central function
		removeItemFromAllProfiles(rowId);

		// Show success message
		showToast('success', `Item deleted from all profiles`);

		// Force a complete UI refresh to ensure deleted item disappears
		setList(null);
		setIsRemount(true);

		// Give state update time to complete, then refresh the board
		setTimeout(() => {
			// Only try to update the board if we still have a valid state
			if (
				dealbreaker &&
				currentProfileId &&
				dealbreaker[currentProfileId]
			) {
				updateBoard();
			}

			setIsRemount(false);
			setRefreshKey(Date.now());

			// Force a navigation update to ensure state is current everywhere
			// if (navigation && navigation.setParams) {
			// 	navigation.setParams({ forceRefresh: Date.now() });
			// }
		}, 300);
	};

	const handleEditItem = (item: any) => {
		// Extract the raw item data from the board item
		if (item && item.attributes && item.attributes.row) {
			const rowData = item.attributes.row;
			// Find the actual item in the dealbreaker state
			const isDealbreaker = item.attributes.columnId === 2;
			const type = isDealbreaker ? 'dealbreaker' : 'flag';

			const items = dealbreaker[currentProfileId][type];
			const foundItem = items.find((i: any) => i.id === rowData.id);

			if (foundItem) {
				setItemToEdit(foundItem);
				setEditModalVisible(true);
			} else {
				showToast('error', 'Item not found');
			}
		}
	};

	const handleSaveEdit = (updatedItem: any) => {
		if (!updatedItem || !updatedItem.id) return;

		const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker));

		// Rename the card in every profile, in whichever column it sits there
		Object.values(updatedDealbreaker).forEach((profile: any) => {
			for (const type of ['flag', 'dealbreaker']) {
				profile?.[type]?.forEach((item: any) => {
					if (item.id === updatedItem.id) {
						item.title = updatedItem.title;
						item.description = updatedItem.description;
					}
				});
			}
		});

		// Update the state
		setDealbreaker(updatedDealbreaker);

		// Close the modal
		setEditModalVisible(false);
		setItemToEdit(null);

		// Show a success message
		showToast('success', 'Item updated successfully');

		// Force UI update
		setRefreshKey(Date.now());
	};

	return {
		handleDeleteItem,
		confirmDeleteItem,
		handleEditItem,
		handleSaveEdit,
	};
};
