import { Modal, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CloseButton from '../CloseButton';

// Render it only while a video is open: unmounting releases the player, which stops the sound.
const VideoPlayerModal = ({ url, onClose }: { url: string; onClose: () => void }) => {
	const player = useVideoPlayer(url, (p) => p.play());
	const insets = useSafeAreaInsets();

	return (
		<Modal
			visible
			animationType='fade'
			statusBarTranslucent
			supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
			onRequestClose={onClose}>
			<View style={styles.container}>
				<VideoView
					player={player}
					style={styles.video}
					nativeControls
					contentFit='contain'
					fullscreenOptions={{ enable: true }}
				/>
				<View style={[styles.close, { top: insets.top + 8, right: insets.right + 12 }]}>
					<CloseButton onDark onPress={onClose} />
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000',
	},
	video: {
		flex: 1,
	},
	close: {
		position: 'absolute',
	},
});

export default VideoPlayerModal;
