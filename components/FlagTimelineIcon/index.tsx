import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * A component that displays an icon indicating that a flag has a history/timeline
 */
const FlagTimelineIcon = () => {
	return (
		<View style={styles.container}>
			<Text style={styles.icon}>📋</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		justifyContent: 'center',
		alignItems: 'center',
		marginHorizontal: 4,
	},
	icon: {
		fontSize: 16,
	},
});

export default FlagTimelineIcon;
