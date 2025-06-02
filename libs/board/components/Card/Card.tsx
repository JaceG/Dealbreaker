import React, { useState } from 'react';
import {
	Animated,
	TouchableOpacity,
	View,
	Text,
	TouchableWithoutFeedback,
	ViewStyle,
} from 'react-native';
import { bool, func, number, object, shape, string } from 'prop-types';
import { colors, fonts, deviceWidth } from '../../constants';
import { Flag } from '../Icons';
import {
	CardContainer,
	ColumnWrapper,
	IconRowWrapper,
	Paragraph,
	RowWrapper,
} from './Card.styled';
const NEGATIVE_SPACE = 200;
const Card = ({
	cardBackground,
	cardBorderRadius,
	cardContent,
	cardDescriptionTextColor,
	cardDescriptionFontSize,
	cardDescriptionFontFamily,
	cardIconColor,
	cardNameTextColor,
	cardNameFontSize,
	cardNameFontFamily,
	hidden,
	item,
	isCardWithShadow,
	onPress,
	onPressIn,
	onLongPress,
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
		iconText: ViewStyle;
		flagContainer: ViewStyle;
	} = {
		iconContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'flex-center',
			alignSelf: 'flex-end',
			paddingTop: '20px',
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

	return (
		<TouchableWithoutFeedback
			onPressIn={(evt) =>
				onPressIn
					? onPressIn(evt.nativeEvent.pageY - NEGATIVE_SPACE)
					: {}
			}
			onPress={handlePress}
			collapsable={false}>
			<Animated.View style={styles}>
				{cardContent !== undefined ? (
					cardContent(item ? item.row() : {})
				) : (
					<CardContainer
						backgroundColor={
							item?.columnId() === 2
								? colors.chiGong
								: colors.exodusFruit
						}
						borderRadius={cardBorderRadius}
						elevation={isCardWithShadow ? 5 : 0}
						shadowOpacity={isCardWithShadow ? 0.1 : 0}>
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

									// backgroundColor: '#0f0',
									// padding: '20px',
								}}>
								<Paragraph
									fontSize={cardNameFontSize}
									fontFamily={cardNameFontFamily}
									color={cardNameTextColor}
									style={{
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
	cardBackground: colors.white,
	cardBorderRadius: 10,
	cardDescriptionTextColor: colors.bay,
	cardDescriptionFontSize: 14,
	cardDescriptionFontFamily: '',
	cardIconColor: colors.blurple,
	cardNameTextColor: colors.blurple,
	cardNameFontSize: 18,
	cardNameFontFamily: '',
	isCardWithShadow: true,
	onDeleteItem: null,
	onEditItem: null,
};

Card.propTypes = {
	cardBackground: string.isRequired,
	cardBorderRadius: number.isRequired,
	cardContent: func,
	cardDescriptionTextColor: string.isRequired,
	cardDescriptionFontSize: number.isRequired,
	cardDescriptionFontFamily: string.isRequired,
	cardIconColor: string.isRequired,
	cardNameTextColor: string.isRequired,
	cardNameFontSize: number.isRequired,
	cardNameFontFamily: string.isRequired,
	hidden: bool,
	item: object,
	isCardWithShadow: bool.isRequired,
	onPress: func,
	onPressIn: func,
	onLongPress: func,
	style: shape({ string }),
	onDeleteItem: func,
	onEditItem: func,
};

export default Card;
