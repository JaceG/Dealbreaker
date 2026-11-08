import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '../../libs/board/constants';
import { imageUtils } from '../../utils/functions';
import type { AttachmentAudio } from './useAttachmentAudio';

// A voice memo's play/pause button with its length, or elapsed / length while it is the one loaded.
const AudioAttachment = ({
	url,
	duration,
	audio,
	style,
	disabled = false,
}: {
	url: string;
	duration?: number;
	audio: AttachmentAudio;
	style?: StyleProp<ViewStyle>;
	disabled?: boolean;
}) => {
	const active = audio.url === url;
	const playing = active && audio.playing;
	const total = duration || (active ? audio.duration : 0);
	const seconds = Math.round(total);
	const time = active
		? `${imageUtils.formatDuration(audio.currentTime)} / ${imageUtils.formatDuration(total)}`
		: seconds
			? imageUtils.formatDuration(total)
			: 'Voice memo';

	return (
		<Pressable
			accessibilityRole='button'
			accessibilityLabel={`${playing ? 'Pause' : 'Play'} voice memo${seconds ? `, ${seconds} seconds` : ''}`}
			accessibilityState={{ disabled }}
			disabled={disabled}
			onPress={() => audio.toggle(url)}
			style={({ pressed }) => [styles.container, style, pressed && styles.pressed, disabled && styles.disabled]}>
			<View style={styles.icon}>
				<Feather name={playing ? 'pause' : 'play'} size={20} color={colors.white} />
			</View>
			<Text style={styles.time}>{time}</Text>
		</Pressable>
	);
};

const styles = StyleSheet.create({
	disabled: { opacity: 0.4 },
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	pressed: {
		opacity: 0.7,
	},
	icon: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: colors.blurple,
		alignItems: 'center',
		justifyContent: 'center',
	},
	time: {
		fontSize: 13,
		fontWeight: 'bold',
		color: colors.officer,
	},
});

export default AudioAttachment;
