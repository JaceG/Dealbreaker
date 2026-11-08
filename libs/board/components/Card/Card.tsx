import React from 'react';
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
import { bool, func, number, object, string } from 'prop-types';
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
	onFlagClicked?: (newFlag: string, item: any) => void;
	onDeleteItem?: (item: any) => void;
	onEditItem?: (item: any) => void;
	showDeleteItem?: boolean;
}

const NEGATIVE_SPACE = 50;

type PeopleCountsProps = { counts: { yellow: number; red: number; dealbreaker: number } };

// One dot per color with how many people have the card that way; a square marks a dealbreaker, as in Compare.
const PeopleCounts = ({ counts }: PeopleCountsProps) => {
	const parts = [
		{ key: 'yellow', n: counts.yellow, color: colors.flagYellow, square: false },
		{ key: 'red', n: counts.red, color: colors.flagRed, square: false },
		{ key: 'dealbreaker', n: counts.dealbreaker, color: colors.flagRed, square: true },
	].filter((p) => p.n > 0);
	if (parts.length === 0) return null;
	const label = parts
		.map((p) => `${p.n} ${p.n === 1 ? 'person' : 'people'} ${p.key}`)
		.join(', ');
	return (
		<View
			accessible
			accessibilityLabel={label}
			style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
			{parts.map((p) => (
				<View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
					<View
						style={{
							width: 12,
							height: 12,
							borderRadius: p.square ? 2 : 6,
							backgroundColor: p.color,
							borderWidth: 1,
							borderColor: colors.white,
						}}
					/>
					<Text style={{ color: colors.white, fontSize: 14, fontWeight: 'bold' }}>{p.n}</Text>
				</View>
			))}
		</View>
	);
};

const Card: React.FC<CardProps> = ({
	cardBorderRadius = 10,
	cardContent,
	cardIconColor = colors.blurple,
	cardNameTextColor = colors.blurple,
	cardNameFontSize = 18,
	cardNameFontFamily = '',
	hidden = false,
	item,
	isCardWithShadow = true,
	onPress,
	onPressIn,
	style,
	onFlagClicked,
	onDeleteItem,
	onEditItem,
	showDeleteItem,
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
		badge: ViewStyle;
		badgeText: TextStyle;
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
		badge: {
			position: 'absolute',
			top: -4,
			right: -6,
			minWidth: 20,
			height: 20,
			borderRadius: 10,
			paddingHorizontal: 4,
			backgroundColor: colors.white,
			alignItems: 'center',
			justifyContent: 'center',
		},
		badgeText: {
			fontSize: 12,
			fontWeight: 'bold',
			color: colors.exodusFruit,
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
						{/* Main only: how many active people have this card yellow, red or as a dealbreaker, in the top-right corner */}
						{!hidden && item?.row().peopleCounts ? (
							<View style={{ position: 'absolute', top: 8, right: 10, zIndex: 1 }}>
								<PeopleCounts counts={item.row().peopleCounts} />
							</View>
						) : null}
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
							{item?.row().description ? (
								<Paragraph
									numberOfLines={2}
									style={{
										fontSize: 14,
										fontFamily: cardNameFontFamily,
										color: cardNameTextColor,
										textAlign: 'center',
										opacity: 0.85,
										width: '90%',
										marginTop: 4,
									}}>
									{item.row().description}
								</Paragraph>
							) : null}

							{/* Second line - Icons and flag */}
							<IconRowWrapper>
								<View style={iconStyles.iconContainer}>
									{!hidden &&
										showDeleteItem &&
										item &&
										onDeleteItem && (
											<TouchableOpacity
												accessibilityRole='button'
												accessibilityLabel='Delete card'
												hitSlop={8}
												onPress={() =>
													onDeleteItem(item)
												}
												style={iconStyles.iconButton}>
												<Text
													style={iconStyles.iconText}>
													🗑️
												</Text>
											</TouchableOpacity>
										)}
									{!hidden && item && onEditItem && (
										<TouchableOpacity
											accessibilityRole='button'
											accessibilityLabel='Edit card'
											hitSlop={8}
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
												accessibilityRole='button'
												accessibilityLabel={`Notes and history, ${item.row().historyCount || 'no'} ${item.row().historyCount === 1 ? 'entry' : 'entries'}`}
												hitSlop={8}
												onPress={() =>
													item.row().onLongPress()
												}
												style={iconStyles.iconButton}>
												<Text
													style={iconStyles.iconText}>
													📋
												</Text>
												{item.row().historyCount ? (
													<View style={iconStyles.badge}>
														<Text style={iconStyles.badgeText}>
															{item.row().historyCount}
														</Text>
													</View>
												) : null}
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
