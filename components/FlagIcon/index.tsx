import { Image, View } from 'react-native';
import { colors } from '../../libs/board/constants';
import { FLAG_DOT_COLORS } from '../FlagDot';

const SOURCE = require('../../libs/board/assets/icons/flag.png');

// The flag image is one flat shape, so it can't carry an outline of its own. A white flag gets one
// from ink copies of the image set 1pt off on every side, behind the white one.
const RING = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];

// A flag in its state's colour: 'white', 'yellow', 'red' or 'dealbreaker'. Anything else draws grey.
const FlagIcon = ({ flag, size = 20 }: { flag: string; size?: number }) => {
	const box = { width: size, height: size };
	const fill = flag === 'dealbreaker' ? colors.dealbreaker : FLAG_DOT_COLORS[flag] || colors.outline;
	return (
		<View style={box}>
			{flag === 'white' &&
				RING.map(([left, top]) => (
					<Image
						key={`${left},${top}`}
						source={SOURCE}
						style={[box, { position: 'absolute', left, top, tintColor: colors.ink }]}
					/>
				))}
			<Image source={SOURCE} style={[box, { tintColor: fill }]} />
		</View>
	);
};

export default FlagIcon;
