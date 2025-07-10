import React, { useState } from 'react';
import {
	Animated,
	TouchableOpacity,
	View,
	Text,
	TouchableWithoutFeedback,
	ViewStyle,
	TextStyle,
	GestureResponderEvent,
} from 'react-native';
import { bool, func, number, object, shape, string } from 'prop-types';
import { colors } from '../../constants';
import { Flag } from '../Icons';
import {
	CardContainer,
	IconRowWrapper,
	Paragraph,
	RowWrapper,
} from './Card.styled';

interface CardProps {
	cardBorderRadius: number;
	cardContent?: (item: any) => React.ReactNode;
	cardIconColor: string;
	cardNameTextColor: string;
	cardNameFontSize: number;
	cardNameFontFamily: string;
	hidden?: boolean;
	item?: any;
	isCardWithShadow: boolean;
	onPress?: () => void;
	onPressIn?: (pageY: number) => void;
	style?: ViewStyle;
	onFlagClicked?: (item: any) => void;
	onDeleteItem?: (item: any) => void;
	onEditItem?: (item: any) => void;
}

const NEGATIVE_SPACE = 50;

const Card: React.FC<CardProps> = ({
	cardBorderRadius,
	cardContent,
	cardIconColor,
	cardNameTextColor,
	cardNameFontSize,
	cardNameFontFamily,
	hidden,
	item,
	isCardWithShadow,
	onPress,
	onPressIn,
	style,
	onFlagClicked,
	onDeleteItem,
	onEditItem,
}) => {
	const styles = [style];
	if (hidden) {
		styles.push({ opacity: 0 });
	}

	const iconStyles: {
		iconContainer: ViewStyle;
		iconButton: ViewStyle;
		iconText: TextStyle;
		flagContainer: ViewStyle;
	} = {
		iconContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			alignSelf: 'flex-end',
			paddingTop: 20,
		},
		iconButton: {
			padding: 5,
			marginRight: 5,
		},
		iconText: {
			fontSize: 18,
			color: '#fff',
		},
		flagContainer: {
			alignItems: 'center',
			justifyContent: 'flex-start',
		},
	};

	const handlePress = () => {
		if (onPress) {
			onPress();
		}
	};

	const handlePressIn = (evt: GestureResponderEvent) => {
		console.log('page Y', evt.nativeEvent.pageY);
		if (onPressIn) {
			onPressIn(evt.nativeEvent.pageY - NEGATIVE_SPACE);
		}
	};

	return (
		<TouchableWithoutFeedback
			onPressIn={handlePressIn}
			onPress={handlePress}>
			<Animated.View style={styles}>
				{cardContent !== undefined ? (
					cardContent(item ? item.row() : {})
				) : (
					<CardContainer
						borderRadius={cardBorderRadius}
						style={{
							backgroundColor:
								item?.columnId() === 2
									? colors.chiGong
									: colors.exodusFruit,
							elevation: isCardWithShadow ? 5 : 0,
							shadowOpacity: isCardWithShadow ? 0.1 : 0,
						}}>
						<RowWrapper
							style={{
								justifyContent: 'center',
								alignItems: 'center',
							}}>
							{/* First line - Title only */}
							<View
								style={{
									width: '40%',
									alignItems: 'center',
									justifyContent: 'flex-start',
								}}>
								<Paragraph
									style={{
										fontSize: cardNameFontSize,
										fontFamily: cardNameFontFamily,
										color: cardNameTextColor,
										textAlign: 'center',
										fontWeight: 'bold',
									}}>
									{item ? item.row().name : ''}
								</Paragraph>
							</View>

							{/* Second line - Icons and flag */}
							<IconRowWrapper>
								<View style={iconStyles.iconContainer}>
									{!hidden && item && onDeleteItem && (
										<TouchableOpacity
											onPress={() => onDeleteItem(item)}
											style={iconStyles.iconButton}>
											<Text style={iconStyles.iconText}>
												🗑️
											</Text>
										</TouchableOpacity>
									)}
									{!hidden && item && onEditItem && (
										<TouchableOpacity
											onPress={() => onEditItem(item)}
											style={iconStyles.iconButton}>
											<Text style={iconStyles.iconText}>
												✏️
											</Text>
										</TouchableOpacity>
									)}
									{!hidden &&
										item &&
										item.row &&
										item.row().onLongPress && (
											<TouchableOpacity
												onPress={() =>
													item.row().onLongPress()
												}
												style={iconStyles.iconButton}>
												<Text
													style={iconStyles.iconText}>
													📋
												</Text>
											</TouchableOpacity>
										)}
								</View>

								<View style={iconStyles.flagContainer}>
									{!hidden &&
									item?.columnId() === 2 ? null : (
										<Flag
											color={cardIconColor}
											onFlagClicked={onFlagClicked}
											item={item}
										/>
									)}
								</View>
							</IconRowWrapper>
						</RowWrapper>
					</CardContainer>
				)}
			</Animated.View>
		</TouchableWithoutFeedback>
	);
};

Card.defaultProps = {
	cardBorderRadius: 10,
	cardIconColor: colors.blurple,
	cardNameTextColor: colors.blurple,
	cardNameFontSize: 18,
	cardNameFontFamily: '',
	isCardWithShadow: true,
	hidden: false,
};

Card.propTypes = {
	cardBorderRadius: number.isRequired,
	cardContent: func,
	cardIconColor: string.isRequired,
	cardNameTextColor: string.isRequired,
	cardNameFontSize: number.isRequired,
	cardNameFontFamily: string.isRequired,
	hidden: bool,
	item: object,
	isCardWithShadow: bool.isRequired,
	onPress: func,
	onPressIn: func,
	style: object,
	onFlagClicked: func,
	onDeleteItem: func,
	onEditItem: func,
};

export default Card;
