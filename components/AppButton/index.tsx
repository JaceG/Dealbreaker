import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, typeScale } from '../../libs/board/constants';

// The app's one button. Every kind is at least 44pt tall and its text passes 4.5:1 contrast.
// primary: the action the popup or page is for (Save, Submit, Create)
// secondary: leave or step back without acting (Cancel, Close, Undo), and quieter actions
// destructive: deletes or ends something, and starts a recording
// link: a quiet text action with no box (Sign up, Show all)
export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'link';

const VARIANTS: Record<ButtonVariant, { fill: string; text: string; border: string }> = {
	primary: { fill: colors.ink, text: colors.onFill, border: colors.ink },
	secondary: { fill: colors.surface, text: colors.ink, border: colors.ink },
	destructive: { fill: colors.danger, text: colors.onFill, border: colors.danger },
	link: { fill: 'transparent', text: colors.ink, border: 'transparent' },
};

const AppButton = ({
	title,
	onPress,
	variant = 'primary',
	disabled = false,
	loading = false,
	icon,
	accessibilityLabel,
}: {
	title: string;
	onPress: () => void;
	variant?: ButtonVariant;
	disabled?: boolean;
	loading?: boolean;
	icon?: ReactNode; // drawn before the title; give it the variant's text colour
	accessibilityLabel?: string; // when the title alone is too terse for VoiceOver
}) => {
	const v = VARIANTS[variant];
	const inactive = disabled || loading;
	return (
		<Pressable
			accessibilityRole='button'
			accessibilityLabel={accessibilityLabel ?? title}
			accessibilityState={{ disabled: inactive, busy: loading }}
			disabled={inactive}
			onPress={onPress}
			style={({ pressed }) => [
				styles.container,
				variant === 'link' && styles.link,
				{ backgroundColor: v.fill, borderColor: v.border },
				pressed && styles.pressed,
				inactive && styles.inactive,
			]}>
			{loading ? (
				<ActivityIndicator color={v.text} />
			) : (
				<View style={styles.content}>
					{icon}
					<Text
						style={[
							styles.buttonText,
							variant === 'link' && styles.linkText,
							{ color: v.text },
						]}>
						{title}
					</Text>
				</View>
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
	link: {
		minHeight: 44,
		paddingHorizontal: 4,
	},
	content: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	pressed: {
		opacity: 0.7,
	},
	inactive: {
		opacity: 0.5,
	},
	buttonText: {
		...typeScale.emphasis,
		textAlign: 'center',
		flexShrink: 1,
	},
	// Body size, so a link sits level with the sentence around it.
	linkText: {
		...typeScale.body,
		fontWeight: '600',
	},
});

export default AppButton;
