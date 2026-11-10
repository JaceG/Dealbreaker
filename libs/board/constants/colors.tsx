// The app's colours, and the only place a colour value is written.
// Surfaces are neutral, so the flag scale is the only colour on screen.
const colors = {
	paper: '#FAF7F5', // page background and quiet fills
	surface: '#FFFFFF', // cards, inputs, popups
	ink: '#1F1A1C', // text, primary buttons, shadows
	muted: '#6B6165', // secondary text and icons
	hairline: '#EAE3E0', // dividers and card edges
	outline: '#8F8589', // edges that must be seen: inputs, white flags (3.5:1 on white)
	blush: '#F7E6E2', // soft tint: notices, selected and empty states
	onFill: '#FFFFFF', // text and icons on an ink, danger or flag fill
	danger: '#DC2626', // destructive actions and errors (4.5:1 as text on paper)
	scrim: 'rgba(0, 0, 0, 0.5)', // behind popups
	backdrop: 'rgba(0, 0, 0, 0.9)', // behind photos and video

	// Flags, in rising order. Yellow and red are the app's original colours, kept at Jace's request.
	// White stays white, so its shape always needs an outline (FlagIcon and FlagDot draw one). Yellow is
	// too light for text on white (1.4:1), and Jace keeps its flag plain, without the outline.
	flagWhite: '#FFFFFF',
	flagYellow: '#FFD700',
	flagRed: '#FF0000',
	dealbreaker: '#9F1239',
};

export { colors };
