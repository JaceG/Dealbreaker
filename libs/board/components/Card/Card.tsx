import React from 'react';
import {
	Animated,
	TouchableOpacity,
	View,
	Text,
	TouchableWithoutFeedback,
	ViewStyle,
	TextStyle,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { bool, func, number, object, string } from 'prop-types';
import { FLAG_DOT_COLORS } from '../../../../components/FlagDot';
import { colors } from '../../constants';
import { Flag, chipStyles } from '../Icons/Flag';
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
	onPress?: () => void;
	style?: ViewStyle;
	onFlagClicked?: (newFlag: string, item: any) => void;
	onDeleteItem?: (item: any) => void;
	onEditItem?: (item: any) => void;
	showDeleteItem?: boolean;
}


type PeopleCountsProps = { counts: { yellow: number; red: number; dealbreaker: number } };

// One dot per color with how many people have the card that way; a square marks a dealbreaker, as in Compare.
const PeopleCounts = ({ counts }: PeopleCountsProps) => {
	const parts = [
		{ key: 'yellow', n: counts.yellow, color: colors.flagYellow, square: false },
		{ key: 'red', n: counts.red, color: colors.flagRed, square: false },
		{ key: 'dealbreaker', n: counts.dealbreaker, color: colors.dealbreaker, square: true },
	].filter((p) => p.n > 0);
	if (parts.length === 0) return null;
	const label = parts
		.map((p) => `${p.n} ${p.n === 1 ? 'person' : 'people'} ${p.key}`)
		.join(', ');
	return (
		<View
			accessible
			accessibilityLabel={label}
			style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 }}>
			{parts.map((p) => (
				<View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
					<View
						style={{
							width: 10,
							height: 10,
							borderRadius: p.square ? 2 : 5,
							backgroundColor: p.color,
						}}
					/>
					<Text style={{ color: colors.ink, fontSize: 13, fontWeight: '600' }}>{p.n}</Text>
				</View>
			))}
		</View>
	);
};

const Card: React.FC<CardProps> = ({
	cardBorderRadius = 14,
	cardContent,
	cardIconColor = colors.muted,
	cardNameTextColor = colors.ink,
	cardNameFontSize = 17,
	cardNameFontFamily = '',
	hidden = false,
	item,
	onPress,
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
		badge: ViewStyle;
		badgeText: TextStyle;
	} = {
		iconContainer: {
			flexDirection: 'row',
			alignItems: 'center',
		},
		iconButton: {
			padding: 6,
			marginLeft: 12,
		},
		badge: {
			position: 'absolute',
			top: -4,
			right: -6,
			minWidth: 18,
			height: 18,
			borderRadius: 9,
			paddingHorizontal: 4,
			backgroundColor: colors.ink,
			alignItems: 'center',
			justifyContent: 'center',
		},
		badgeText: {
			fontSize: 11,
			fontWeight: 'bold',
			color: colors.onFill,
		},
	};

	const isDealbreaker = item?.columnId() === 2;
	// 44pt wide and 48pt tall with the padding; the sides meet in the 12pt gap, so no tap lands on a neighbour.
	const iconSlop = { top: 8, bottom: 8, left: 6, right: 6 };

	const handlePress = () => {
		if (onPress) {
			onPress();
		}
	};

	return (
		<TouchableWithoutFeedback
			// The board lifts a card on press and hold; a tap only opens it.
			accessibilityHint={onPress ? 'Press and hold to move' : undefined}
			onPress={handlePress}>
			<Animated.View style={styles}>
				{cardContent !== undefined ? (
					cardContent(item ? item.row() : {})
				) : (
					<CardContainer
						borderRadius={cardBorderRadius}
						style={{
							backgroundColor: colors.surface,
							borderWidth: 1,
							borderColor: colors.hairline,
							// Clips the stripe to the rounded corners.
							overflow: 'hidden',
						}}>
						{/* The card's state down its left edge. A white flag's stripe doesn't show on the white card. */}
						<View
							style={{
								position: 'absolute',
								left: 0,
								top: 0,
								bottom: 0,
								width: 4,
								backgroundColor: isDealbreaker
									? colors.dealbreaker
									: FLAG_DOT_COLORS[item?.row().flag] || colors.flagWhite,
							}}
						/>
						<RowWrapper>
							<View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
								<Paragraph
									style={{
										flex: 1,
										fontSize: cardNameFontSize,
										fontFamily: cardNameFontFamily,
										color: cardNameTextColor,
										fontWeight: '600',
									}}>
									{item ? item.row().name : ''}
								</Paragraph>
								{/* Main only: how many active people have this card yellow, red or as a dealbreaker */}
								{item?.row().peopleCounts ? (
									<PeopleCounts counts={item.row().peopleCounts} />
								) : null}
							</View>
							{item?.row().description ? (
								<Paragraph
									numberOfLines={2}
									style={{
										fontSize: 15,
										fontFamily: cardNameFontFamily,
										color: colors.muted,
										marginTop: 4,
									}}>
									{item.row().description}
								</Paragraph>
							) : null}

							{/* The min height keeps a hidden card, which has no buttons, as tall as a shown one. */}
							<IconRowWrapper style={{ marginTop: 12, minHeight: 33 }}>
								{isDealbreaker ? (
									<View
										style={[
											chipStyles.chip,
											{
												paddingLeft: 11,
												backgroundColor: colors.dealbreaker,
												borderColor: colors.dealbreaker,
											},
										]}>
										<Text style={[chipStyles.text, { color: colors.onFill }]}>
											Dealbreaker
										</Text>
									</View>
								) : (
									<Flag onFlagClicked={onFlagClicked} item={item} />
								)}

								<View style={iconStyles.iconContainer}>
									{!hidden &&
										item &&
										item.row &&
										item.row().onLongPress && (
											<TouchableOpacity
												accessibilityRole='button'
												accessibilityLabel={`Notes and history, ${item.row().historyCount || 'no'} ${item.row().historyCount === 1 ? 'entry' : 'entries'}`}
												hitSlop={iconSlop}
												onPress={() =>
													item.row().onLongPress()
												}
												style={iconStyles.iconButton}>
												<Feather name='clipboard' size={20} color={cardIconColor} />
												{item.row().historyCount ? (
													<View style={iconStyles.badge}>
														<Text style={iconStyles.badgeText}>
															{item.row().historyCount}
														</Text>
													</View>
												) : null}
											</TouchableOpacity>
										)}
									{!hidden && item && onEditItem && (
										<TouchableOpacity
											accessibilityRole='button'
											accessibilityLabel='Edit card'
											hitSlop={iconSlop}
											onPress={() => onEditItem(item)}
											style={iconStyles.iconButton}>
											<Feather name='edit-2' size={20} color={cardIconColor} />
										</TouchableOpacity>
									)}
									{!hidden &&
										showDeleteItem &&
										item &&
										onDeleteItem && (
											<TouchableOpacity
												accessibilityRole='button'
												accessibilityLabel='Delete card'
												hitSlop={iconSlop}
												onPress={() =>
													onDeleteItem(item)
												}
												style={iconStyles.iconButton}>
												<Feather name='trash-2' size={20} color={cardIconColor} />
											</TouchableOpacity>
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
	onPress: func,

	style: object,
	onFlagClicked: func,
	onDeleteItem: func,
	onEditItem: func,
};

export default Card;
