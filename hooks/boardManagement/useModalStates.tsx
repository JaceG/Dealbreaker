import { useState } from 'react';

export const useModalStates = () => {
	// Core modal visibility states
	const [deleteModalVisible, setDeleteModalVisible] = useState(false);
	const [editModalVisible, setEditModalVisible] = useState(false);
	const [editProfileModalVisible, setEditProfileModalVisible] =
		useState(false);
	const [dealbreakerAlertVisible, setDealbreakerAlertVisible] =
		useState(false);
	const [transitionReasonModalVisible, setTransitionReasonModalVisible] =
		useState(false);

	// Modal-related item states (items being operated on in modals)
	const [itemToDelete, setItemToDelete] = useState<any>(null);
	const [itemToEdit, setItemToEdit] = useState<any>(null);
	const [transitionedItem, setTransitionedItem] = useState<any>(null);

	return {
		// Modal visibility states
		deleteModalVisible,
		editModalVisible,
		editProfileModalVisible,
		dealbreakerAlertVisible,
		transitionReasonModalVisible,

		// Modal state setters
		setDeleteModalVisible,
		setEditModalVisible,
		setEditProfileModalVisible,
		setDealbreakerAlertVisible,
		setTransitionReasonModalVisible,

		// Modal-related item states
		itemToDelete,
		setItemToDelete,
		itemToEdit,
		setItemToEdit,
		transitionedItem,
		setTransitionedItem,
	};
};
