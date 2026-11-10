import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { colors, typeScale } from '../../libs/board/constants';

// The app's one text field: white with a hairline edge, 48pt tall, or at least 96pt when it takes several lines.
// Pass `style` for layout only (width, flex, margins).
const AppInput = (props: TextInputProps) => (
	<TextInput
		placeholderTextColor={colors.muted}
		{...props}
		style={[styles.input, props.multiline && styles.multiline, props.style]}
	/>
);

const styles = StyleSheet.create({
	input: {
		...typeScale.body,
		color: colors.ink,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.hairline,
		borderRadius: 8,
		minHeight: 48,
		paddingHorizontal: 14,
		paddingVertical: 12,
	},
	multiline: {
		minHeight: 96,
		textAlignVertical: 'top',
	},
});

export default AppInput;
