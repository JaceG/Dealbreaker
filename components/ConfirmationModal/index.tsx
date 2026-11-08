import React from 'react';
import {
	StyleSheet,
	View,
	Text,
	Modal,
	useWindowDimensions,
} from 'react-native';
import { ConfirmationModalProps } from '../../models/modalModels';
import AppButton from '../AppButton';

const ConfirmationModal = ({
	visible,
	onClose,
	onConfirm,
	title,
	message,
}: ConfirmationModalProps) => {
	const { width, height } = useWindowDimensions();
	const isPortrait = height >= width;

	return (
		<Modal
			animationType='fade'
			transparent={true}
			visible={visible}
			supportedOrientations={[
				'portrait',
				'portrait-upside-down',
				'landscape',
				'landscape-left',
				'landscape-right',
			]}
			onRequestClose={onClose}>
			<View style={styles.centeredView}>
				<View
					style={
						isPortrait
							? styles.modalView
							: styles.modalViewHorizontal
					}>
					<Text style={styles.modalTitle}>{title}</Text>
					<Text style={styles.modalText}>{message}</Text>
					<View
						style={
							isPortrait
								? styles.buttonContainer
								: styles.buttonContainerHorizontal
						}>
						<View style={styles.cancelButton}>
							<AppButton title='Cancel' onPress={onClose} variant='secondary' />
						</View>
						<View style={styles.confirmButton}>
							<AppButton title='Confirm' onPress={onConfirm} variant='destructive' />
						</View>
					</View>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	centeredView: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modalView: {
		margin: 20,
		backgroundColor: 'white',
		borderRadius: 10,
		padding: 20,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 5,
		width: '80%',
	},
	modalViewHorizontal: {
		margin: 20,
		backgroundColor: 'white',
		borderRadius: 10,
		padding: 20,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 5,
		width: '60%',
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 10,
		textAlign: 'center',
	},
	modalText: {
		marginBottom: 20,
		textAlign: 'center',
		fontSize: 16,
	},
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%',
	},
	buttonContainerHorizontal: {
		flexDirection: 'row',
		justifyContent: 'center',
		width: '100%',
		gap: 20,
	},
	cancelButton: {
		flex: 1,
		marginRight: 10,
	},
	confirmButton: {
		flex: 1,
		marginLeft: 10,
	},
});

export default ConfirmationModal;
