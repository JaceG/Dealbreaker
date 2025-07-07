import { useState } from 'react';
import { LayoutModalsReturn } from '../models/modalModels';

export const useLayoutModals = (): LayoutModalsReturn => {
	const [switchProfileModalVisible, setSwitchProfileModalVisible] =
		useState(false);

	const openSwitchProfileModal = () => {
		setSwitchProfileModalVisible(true);
	};

	const closeSwitchProfileModal = () => {
		setSwitchProfileModalVisible(false);
	};

	return {
		switchProfileModalVisible,
		setSwitchProfileModalVisible,
		openSwitchProfileModal,
		closeSwitchProfileModal,
	};
};
