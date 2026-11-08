import { Pressable, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors } from '../../libs/board/constants';

// The app's one close (X) button: a 44pt target, the same icon everywhere. onDark is for photo viewers.
const CloseButton = ({ onPress, onDark = false }: { onPress: () => void; onDark?: boolean }) => (
	<Pressable
		accessibilityRole='button'
		accessibilityLabel='Close'
		hitSlop={8}
		onPress={onPress}
		style={({ pressed }) => [styles.button, onDark && styles.onDark, pressed && styles.pressed]}>
		<Feather name='x' size={24} color={onDark ? colors.white : colors.officer} />
	</Pressable>
);

const styles = StyleSheet.create({
	button: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
	},
	onDark: {
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
	},
	pressed: {
		opacity: 0.6,
	},
});

export default CloseButton;
