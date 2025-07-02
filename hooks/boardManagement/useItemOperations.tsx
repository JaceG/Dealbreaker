import { showToast } from '../../utils/functions';

export const useItemOperations = (
	dealbreaker: any,
	currentProfileId: string,
	removeItemFromAllProfiles: (id: string, type: string) => void,
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

		const isDealbreaker = itemToDelete.attributes.columnId === 2;
		const type = isDealbreaker ? 'dealbreaker' : 'flag';

		// Close the modal first for better UX
		setDeleteModalVisible(false);
		setItemToDelete(null);

		// Delete the item using our central function
		removeItemFromAllProfiles(rowId, type);

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

		// Determine the type (flag or dealbreaker)
		const isFlagItem = dealbreaker[currentProfileId].flag.some(
			(item: any) => item.id === updatedItem.id
		);
		const type = isFlagItem ? 'flag' : 'dealbreaker';

		// Create a copy of the dealbreaker state
		const updatedDealbreaker = JSON.parse(JSON.stringify(dealbreaker));

		// Update the item in all profiles
		Object.keys(updatedDealbreaker).forEach((profileName: string) => {
			if (
				updatedDealbreaker[profileName] &&
				updatedDealbreaker[profileName][type]
			) {
				updatedDealbreaker[profileName][type] = updatedDealbreaker[
					profileName
				][type].map((item: any) => {
					if (item.id === updatedItem.id) {
						return {
							...item,
							title: updatedItem.title,
							description: updatedItem.description,
						};
					}
					return item;
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
