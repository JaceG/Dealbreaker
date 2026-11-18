import { Image, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/Auth';
import { colors, typeScale } from '../libs/board/constants';

// Must match imageWidth for expo-splash-screen in app.json, so the native splash hands over to this screen unseen.
const HEART_WIDTH = 160;
const HEART_HEIGHT = (HEART_WIDTH * 704) / 820; // splash-heart.png is 820 x 704

// The launch screen, drawn like the native splash. The name appears for people on their way to login;
// signed-in people go straight on to the board (context/Auth decides where, and when).
const Home = () => {
	const { isLoading, user } = useAuth();
	return (
		<View style={styles.screen}>
			<Image source={require('../assets/splash-heart.png')} style={styles.heart} accessibilityIgnoresInvertColors />
			{!isLoading && !user ? (
				<Text style={styles.name} accessibilityRole='header'>
					Dealbreaker
				</Text>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.iconBlush,
	},
	heart: { width: HEART_WIDTH, height: HEART_HEIGHT },
	// Under the heart without moving it off the centre, where the native splash put it.
	name: {
		...typeScale.title,
		color: colors.ink,
		position: 'absolute',
		top: '50%',
		left: 0,
		right: 0,
		marginTop: HEART_HEIGHT / 2 + 20,
		textAlign: 'center',
	},
});

export default Home;
