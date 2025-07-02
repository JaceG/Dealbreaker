import React from 'react';
import {
	Modal,
	View,
	Image,
	StyleSheet,
	TouchableOpacity,
	Text,
	SafeAreaView,
	StatusBar,
	ActivityIndicator,
} from 'react-native';
import { ImagePreviewModalProps } from '../../models/modalModels';

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
	visible,
	imageUri,
	onClose,
}) => {
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState(false);

	return (
		<Modal
			animationType='fade'
			transparent={true}
			visible={visible}
			statusBarTranslucent={true}
			onRequestClose={onClose}>
			<SafeAreaView style={styles.container}>
				<StatusBar barStyle='light-content' backgroundColor='#000' />

				<View style={styles.header}>
					<TouchableOpacity
						style={styles.closeButton}
						onPress={onClose}
						hitSlop={{ top: 20, left: 20, bottom: 20, right: 20 }}>
						<Text style={styles.closeButtonText}>✕</Text>
					</TouchableOpacity>
				</View>

				<View style={styles.imageContainer}>
					{loading && (
						<View style={styles.loadingContainer}>
							<ActivityIndicator size='large' color='#FFF' />
						</View>
					)}

					{error && (
						<View style={styles.errorContainer}>
							<Text style={styles.errorText}>
								Failed to load image
							</Text>
						</View>
					)}

					<Image
						source={{ uri: imageUri }}
						style={styles.image}
						resizeMode='contain'
						onLoadStart={() => {
							setLoading(true);
							setError(false);
							console.log(
								`Starting to load image: ${imageUri?.substring(
									0,
									30
								)}...`
							);
						}}
						onLoadEnd={() => {
							setLoading(false);
							console.log(
								`Finished loading image: ${imageUri?.substring(
									0,
									30
								)}...`
							);
						}}
						onError={(e) => {
							setLoading(false);
							setError(true);
							console.error(
								`Error loading image in preview: ${
									e.nativeEvent.error || 'Unknown error'
								}`
							);
						}}
					/>
				</View>
			</SafeAreaView>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.9)',
	},
	header: {
		position: 'absolute',
		top: 40,
		right: 20,
		zIndex: 10,
	},
	closeButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(0,0,0,0.5)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	closeButtonText: {
		color: 'white',
		fontSize: 18,
		fontWeight: 'bold',
	},
	imageContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	image: {
		width: '100%',
		height: '80%',
	},
	loadingContainer: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		justifyContent: 'center',
		alignItems: 'center',
	},
	errorContainer: {
		position: 'absolute',
		padding: 20,
		backgroundColor: 'rgba(0,0,0,0.7)',
		borderRadius: 10,
	},
	errorText: {
		color: 'white',
		fontSize: 16,
	},
});

export default ImagePreviewModal;
