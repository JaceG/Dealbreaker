import type { TextStyle } from 'react-native';

// The app's five text styles, and the only place a font size is written, apart from four that keep their own on
// purpose: count badges, the Board Log's monospace text, chart axis labels and the dealbreaker alert's big icon.
const typeScale = {
	title: { fontSize: 28, fontWeight: '700' }, // a screen's title
	heading: { fontSize: 20, fontWeight: '600' }, // popup titles, section headings, board column names
	emphasis: { fontSize: 17, fontWeight: '600' }, // names, card titles, button text, anything bold
	body: { fontSize: 15, fontWeight: '400' }, // running text and what people type
	label: { fontSize: 13, fontWeight: '500' }, // field labels, captions, dates, chips, small print
} as const satisfies Record<string, TextStyle>;

export { typeScale };
