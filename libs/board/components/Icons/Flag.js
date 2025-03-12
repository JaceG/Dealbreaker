import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';

export const Flag = (color) => {
	const whiteFlag = 'white';
	const yellowFlag = 'yellow';
	const redFlag = 'red';
	const [flagColor, setFlagColor] = useState(yellowFlag);
	return (
		<View>
			<Pressable
				onPress={() => {
					if (flagColor === yellowFlag) {
						setFlagColor(redFlag);
					} else if (flagColor === redFlag) {
						setFlagColor(whiteFlag);
					} else {
						setFlagColor(yellowFlag);
					}
				}}>
				<Image
					style={{
						tintColor: flagColor,
						width: 25,
						height: 25,
					}}
					source={require('../../assets/icons/flag.png')}
				/>
			</Pressable>
		</View>
	);
};
