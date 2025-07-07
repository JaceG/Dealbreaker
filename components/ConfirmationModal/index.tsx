import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity } from 'react-native';
import AppButton from '../AppButton';
import { ConfirmationModalProps } from '../../models/modalModels';

const ConfirmationModal = ({
	visible,
	onClose,
	onConfirm,
	title,
	message,
}: ConfirmationModalProps) => {
	return (
		<Modal
			animationType='fade'
			transparent={true}
			visible={visible}
			onRequestClose={onClose}>
			<View style={styles.centeredView}>
				<View style={styles.modalView}>
					<Text style={styles.modalTitle}>{title}</Text>
					<Text style={styles.modalText}>{message}</Text>
					<View style={styles.buttonContainer}>
						<TouchableOpacity
							style={styles.cancelButton}
							onPress={onClose}>
							<Text style={styles.buttonText}>Cancel</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.confirmButton}
							onPress={onConfirm}>
							<Text style={styles.buttonText}>Confirm</Text>
						</TouchableOpacity>
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
	cancelButton: {
		backgroundColor: '#ccc',
		borderRadius: 5,
		padding: 10,
		elevation: 2,
		flex: 1,
		marginRight: 10,
		alignItems: 'center',
	},
	confirmButton: {
		backgroundColor: '#eb4d4b',
		borderRadius: 5,
		padding: 10,
		elevation: 2,
		flex: 1,
		marginLeft: 10,
		alignItems: 'center',
	},
	buttonText: {
		color: 'white',
		fontWeight: 'bold',
		textAlign: 'center',
	},
});

export default ConfirmationModal;
