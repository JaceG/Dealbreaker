import React, { useState, useEffect, useRef } from 'react';
import { Alert, Image, Pressable, View } from 'react-native';

export const Flag = ({ color, onFlagClicked, item }: any) => {
	const whiteFlag = 'white';
	const yellowFlag = 'yellow';
	const redFlag = 'red';

	// Use a ref to track if this is the first render
	const isFirstRender = useRef(true);

	// Get the initial flag color from the item
	const getItemFlagColor = () => {
		if (item && item.row && item.row()) {
			return item.row().flag || whiteFlag;
		}
		return whiteFlag;
	};

	// Initialize with the item's flag color
	const [flagColor, setFlagColor] = useState(getItemFlagColor());

	// Update the flag color when the item changes
	useEffect(() => {
		// Get the current flag color from the item
		const currentColor = getItemFlagColor();

		// Only update if the color is different
		if (currentColor !== flagColor) {
			setFlagColor(currentColor);
		}

		// Mark that we're no longer on first render
		isFirstRender.current = false;
	}, [item]);

	const pickColor = (newFlag: string) => {
		setFlagColor(newFlag);
		onFlagClicked(newFlag, item);
	};

	// Offer the two other colors, so yellow can go straight back to white without a red step in the history.
	const handleFlagClick = () => {
		const name = (c: string) => c[0].toUpperCase() + c.slice(1);
		Alert.alert(
			'Change Flag',
			`"${item?.row?.()?.name || 'This flag'}" is ${flagColor} now.`,
			[
				{ text: 'Cancel', style: 'cancel' as const },
				...[whiteFlag, yellowFlag, redFlag]
					.filter((c) => c !== flagColor)
					.map((c) => ({ text: name(c), onPress: () => pickColor(c) })),
			]
		);
	};

	return (
		<View>
			<Pressable
				accessibilityRole='button'
				accessibilityLabel={`${flagColor} flag. Change color`}
				hitSlop={10}
				onPress={handleFlagClick}>
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
