import { View, StyleSheet } from 'react-native';
import { colors } from '../../libs/board/constants';

export const FLAG_DOT_COLORS: Record<string, string> = {
	red: colors.flagRed,
	yellow: colors.flagYellow,
	white: colors.flagWhite,
};

// A flag's color as a dot; a card in someone's Dealbreakers column is a square.
const FlagDot = ({
	color,
	isDealbreaker = false,
	size = 14,
}: {
	color: string;
	isDealbreaker?: boolean;
	size?: number;
}) => (
	<View
		style={[
			styles.dot,
			{
				width: size,
				height: size,
				borderRadius: isDealbreaker ? 3 : size / 2,
				backgroundColor: isDealbreaker
					? colors.flagRed
					: FLAG_DOT_COLORS[color] || colors.flagWhite,
			},
		]}
	/>
);

const styles = StyleSheet.create({
	dot: {
		borderWidth: 1,
		borderColor: '#ccc',
	},
});

export default FlagDot;
