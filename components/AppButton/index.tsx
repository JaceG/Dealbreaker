import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../../libs/board/constants';

// The app's one button. Every kind is at least 48pt tall and its text passes 4.5:1 contrast.
// primary: the action the popup or page is for (Save, Submit, Create)
// secondary: leave or step back without acting (Cancel, Close, Undo), and quieter actions
// destructive: deletes or ends something
export type ButtonVariant = 'primary' | 'secondary' | 'destructive';

const VARIANTS: Record<ButtonVariant, { fill: string; text: string; border: string }> = {
	primary: { fill: colors.blurple, text: colors.white, border: colors.blurple },
	secondary: { fill: colors.white, text: colors.blurple, border: colors.blurple },
	destructive: { fill: colors.chiGong, text: colors.white, border: colors.chiGong },
};

const AppButton = ({
	title,
	onPress,
	variant = 'primary',
	disabled = false,
	loading = false,
}: {
	title: string;
	onPress: () => void;
	variant?: ButtonVariant;
	disabled?: boolean;
	loading?: boolean;
}) => {
	const v = VARIANTS[variant];
	const inactive = disabled || loading;
	return (
		<Pressable
			accessibilityRole='button'
			accessibilityLabel={title}
			accessibilityState={{ disabled: inactive, busy: loading }}
			disabled={inactive}
			onPress={onPress}
			style={({ pressed }) => [
				styles.container,
				{ backgroundColor: v.fill, borderColor: v.border },
				pressed && styles.pressed,
				inactive && styles.inactive,
			]}>
			{loading ? (
				<ActivityIndicator color={v.text} />
			) : (
				<Text style={[styles.buttonText, { color: v.text }]}>{title}</Text>
			)}
		</Pressable>
	);
};

const styles = StyleSheet.create({
	container: {
		minHeight: 48,
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 8,
		borderWidth: 2,
		alignItems: 'center',
		justifyContent: 'center',
	},
	pressed: {
		opacity: 0.7,
	},
	inactive: {
		opacity: 0.5,
	},
	buttonText: {
		fontSize: 16,
		fontWeight: 'bold',
		textAlign: 'center',
	},
});

export default AppButton;
