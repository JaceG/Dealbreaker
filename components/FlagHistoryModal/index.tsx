import React, { useEffect } from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import FlagHistoryTimeline from '../FlagHistoryTimeline';
import { FlagHistoryModalProps } from '../../models/modalModels';

import { colors, radius } from '../../libs/board/constants';
const FlagHistoryModal = ({
	visible,
	onClose,
	profileId,
	flagId,
	flagTitle,
	flagDescription,
	onAddReason,
}: FlagHistoryModalProps) => {
	// Add console logs for debugging
	useEffect(() => {
		console.log('FlagHistoryModal visibility changed:', visible);
		console.log('FlagHistoryModal props:', {
			profileId,
			flagId,
			flagTitle,
		});
	}, [visible, profileId, flagId, flagTitle]);

	// Return early if no flagId
	if (!flagId && visible) {
		console.log('FlagHistoryModal has no flagId but is visible, closing');
		onClose();
		return null;
	}

	return (
		<Modal
			animationType='slide'
			transparent={true}
			visible={visible}
			onRequestClose={onClose}
			supportedOrientations={[
				'portrait',
				'portrait-upside-down',
				'landscape',
				'landscape-left',
				'landscape-right',
			]}>
			<View style={styles.modalOverlay}>
				<View style={styles.modalContent}>
					<FlagHistoryTimeline
						profileId={profileId}
						flagId={flagId}
						flagTitle={flagTitle || 'Unknown Item'}
						flagDescription={flagDescription}
						onClose={onClose}
						onAddReason={onAddReason}
					/>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	modalOverlay: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.scrim,
		zIndex: 999,
	},
	modalContent: {
		width: '90%',
		height: '80%',
		backgroundColor: colors.surface,
		borderRadius: radius.card,
		overflow: 'hidden',
	},
});

export default FlagHistoryModal;
