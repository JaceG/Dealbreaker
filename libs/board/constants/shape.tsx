import type { ViewStyle } from 'react-native';
import { colors } from './colors';

// The app's three corners, and the only place a corner size is written. Shapes that carry a flag's state
// (round dots, the dealbreaker's square, chart swatches) keep their own on purpose.
const radius = {
	small: 8, // buttons, text fields, thumbnails, small boxes inside a card
	card: 14, // cards, popups, sheets, panels
	pill: 999, // chips, badges, round buttons
};

// The one shadow, for things that float over the page with no backdrop behind them: the card being
// dragged, a button sitting on a photo. Everything else is separated by hairlines.
const floatShadow: ViewStyle = {
	shadowColor: colors.ink,
	shadowOffset: { width: 0, height: 4 },
	shadowOpacity: 0.12,
	shadowRadius: 12,
	elevation: 4,
};

export { radius, floatShadow };
