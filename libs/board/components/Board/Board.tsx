import React from 'react';
import ReactTimeout from 'react-timeout';
import {
	Animated,
	PanResponder,
	StatusBar,
	LayoutChangeEvent,
	PanResponderInstance,
	PanResponderGestureState,
	NativeSyntheticEvent,
	NativeTouchEvent,
	Dimensions,
} from 'react-native';
import { bool, func, object, string } from 'prop-types';
import { colors, deviceWidth, ios, isX } from '../../constants';
import Column from '../Column/Column';
import Card from '../Card/Card';
import Carousel from '../Carousel/Carousel';
import { BoardWrapper } from './Board.styled';

const MAX_RANGE = 100;
const MAX_DEG = 30;
// const CARD_WIDTH = 0.85 * deviceWidth;
const STATUSBAR_HEIGHT = ios ? (isX() ? 44 : 20) : StatusBar.currentHeight || 0;

// Type definitions
interface BoardProps {
	columnWidth?: number;
	boardBackground?: string;
	cardBorderRadius?: string | number;
	cardNameTextColor?: string;
	isWithCountBadge?: boolean;
	onDragEnd: (srcColumn: any, destColumn: any, draggedItem: any) => void;
	open: (item: any) => void;
	requestAnimationFrame: (callback: () => void) => void;
	boardRepository: any;
	setTimeout: (callback: () => void, delay: number) => NodeJS.Timeout;
	onFlagClicked?: (newFlag: string, item: any) => void;
	onDeleteItem?: (item: any) => void;
	onEditItem?: (item: any) => void;
	data?: any;
	showDeleteItem?: boolean;
}

interface BoardState {
	boardPositionY: number;
	rotate: Animated.Value;
	pan: Animated.ValueXY;
	startingX: number;
	startingY: number;
	movingMode: boolean;
	draggedItem?: any;
	srcColumnId?: number;
	isHorizontal: boolean;
	deviceWidth: number;
	deviceHeight: number;
	cardWidth: number;
}

interface CarouselRef {
	currentIndex: number;
	snapToPrev: () => void;
	snapToNext: () => void;
}

class Board extends React.Component<BoardProps, BoardState> {
	// Class property declarations
	private varticalOffset: number = 0;
	private panResponder: PanResponderInstance;
	private val: { x: number; y: number } = { x: 0, y: 0 };
	private x: number | null = null;
	private y: number | null = null;
	private scrolling: boolean = false;
	private carousel: CarouselRef | null = null;
	private dropping: boolean = false;
	private moved: boolean = false;
	private scrollViewRef: any = null;

	constructor(props: BoardProps) {
		super(props);
		const { width, height } = Dimensions.get('window');
		const isHorizontal = width > height;
		this.state = {
			boardPositionY: 0,
			rotate: new Animated.Value(0),
			pan: new Animated.ValueXY(),
			startingX: 0,
			startingY: 0,
			movingMode: false,
			isHorizontal,
			deviceWidth: width,
			deviceHeight: height,
			cardWidth: 0.85 * width,
		};

		this.panResponder = PanResponder.create({
			// Capture, so the board takes the finger from the card and list once a card is lifted.
			onMoveShouldSetPanResponderCapture: () => this.state.movingMode,
			onMoveShouldSetPanResponder: () => this.state.movingMode,
			onPanResponderMove: this.onPanResponderMove,
			onPanResponderRelease: this.onPanResponderRelease,
			onPanResponderTerminate: this.onPanResponderRelease,
		});
	}

	componentDidMount() {
		Dimensions.addEventListener('change', this.onOrientationChange);
		this.val = { x: 0, y: 0 };
		// eslint-disable-next-line no-return-assign
		this.state.pan.addListener(
			(value: { x: number; y: number }) => (this.val = value)
		);
	}
	onOrientationChange = ({
		window,
	}: {
		window: { width: number; height: number };
	}) => {
		const isHorizontal = window.width > window.height;
		// CARD_WIDTH = isHorizontal ? 0.45 * deviceWidth : 0.85 * deviceWidth;
		this.setState({
			isHorizontal,
			deviceWidth: window.width,
			deviceHeight: window.height,
			cardWidth: 0.85 * deviceWidth,
		});
	};

	componentWillUnmount() {
		// Dimensions.removeEventListener('change', this.onOrientationChange);
	}

	onPanResponderMove = (
		event: NativeSyntheticEvent<NativeTouchEvent>,
		gesture: PanResponderGestureState
	) => {
		try {
			const { draggedItem, pan, startingX, startingY } = this.state;
			const { boardRepository } = this.props;

			if (draggedItem && this.state.movingMode) {
				this.moved = true;
				const { x0, y0 } = gesture;
				this.x = x0 - startingX + gesture.dx;
				this.y = y0 + gesture.dy;

				Animated.event([null, { dx: pan.x, dy: pan.y }], {
					useNativeDriver: false,
				})(event, gesture);

				if (
					startingX + gesture.dx < -50 &&
					gesture.vx < 0 &&
					this.carousel
				) {
					this.carousel.snapToPrev();
				}
				if (
					startingX + gesture.dx + this.state.cardWidth - 50 >
						this.state.cardWidth &&
					gesture.vx > 0 &&
					this.carousel
				) {
					this.carousel.snapToNext();
				}

				// Only access carousel.currentIndex if carousel exists
				const columnId = this.carousel ? this.carousel.currentIndex : 0;
				const columnAtPosition = boardRepository.move(
					draggedItem,
					this.x,
					this.y,
					columnId
				);
				if (columnAtPosition) {
					const { scrolling, offset } =
						boardRepository.scrollingPosition(
							columnAtPosition,
							this.x,
							this.y,
							columnId
						);
					if (
						this.shouldScroll(scrolling, offset, columnAtPosition)
					) {
						this.scroll(columnAtPosition, draggedItem, offset);
					}
				}
			}
		} catch (error) {
			console.log('columnAtPosition', error);
		}
	};

	shouldScroll = (
		scrolling: boolean,
		offset: number,
		column: any
	): boolean => {
		const placeToScroll =
			(offset < 0 && column.scrollOffset() > 0) ||
			(offset > 0 && column.scrollOffset() < column.contentHeight());

		return scrolling && offset !== 0 && placeToScroll;
	};

	onScrollingStarted = () => {
		this.scrolling = true;
	};

	onScrollingEnded = () => {
		this.scrolling = false;
	};

	scroll = (column: any, draggedItem: any, anOffset: number) => {
		const { requestAnimationFrame, boardRepository } = this.props;

		if (!this.scrolling) {
			this.onScrollingStarted();
			const scrollOffset = column.scrollOffset() + 80 * anOffset;
			boardRepository.setScrollOffset(column.id(), scrollOffset);

			column.listView().scrollToOffset({ offset: scrollOffset });
		}

		if (this.x !== null && this.y !== null) {
			boardRepository.move(draggedItem, this.x, this.y);
			const { scrolling, offset } = boardRepository.scrollingPosition(
				column,
				this.x,
				this.y
			);
			if (this.shouldScroll(scrolling, offset, column)) {
				requestAnimationFrame(() => {
					this.scroll(column, draggedItem, offset);
				});
			}
		}
	};

	endMoving = () => {
		// Only a lifted card can be dropped, so a late call can't fire onDragEnd twice.
		if (!this.state.movingMode) return;
		try {
			this.setState({ movingMode: false });
			const { draggedItem, pan, srcColumnId } = this.state;
			const { boardRepository, onDragEnd } = this.props;

			if (!draggedItem || !srcColumnId) return;

			boardRepository.show(draggedItem.columnId(), draggedItem);
			boardRepository.notify(draggedItem.columnId(), 'reload');

			const destColumnId = draggedItem.columnId();
			pan.setValue({ x: 0, y: 0 });
			this.setState({ startingX: 0, startingY: 0 });

			// Lifted and released without moving: nothing to save.
			if (!this.moved) {
				return;
			}

			return (
				onDragEnd &&
				onDragEnd(
					boardRepository.columns()[srcColumnId - 1],
					boardRepository.columns()[destColumnId - 1],
					draggedItem
				)
			);
		} catch (error) {
			const { draggedItem, srcColumnId } = this.state;
			const { onDragEnd, boardRepository } = this.props;

			if (!draggedItem || !srcColumnId) {
				this.setState({
					movingMode: false,
					startingX: 0,
					startingY: 0,
				});
				return;
			}

			const destColumnId = draggedItem.columnId();
			this.setState({ movingMode: false, startingX: 0, startingY: 0 });
			console.log('endMoving', error);
			return (
				onDragEnd &&
				onDragEnd(
					boardRepository.columns()[srcColumnId - 1],
					boardRepository.columns()[destColumnId - 1],
					draggedItem
				)
			);
		}
	};

	onPanResponderRelease = () => {
		this.x = null;
		this.y = null;
		this.drop();
	};

	// Any finger lift drops a lifted card, even when the board never took the touch
	// (lifted and released without moving), so a card can't stay floating.
	drop = () => {
		if (!this.state.movingMode || this.dropping) return;
		this.dropping = true;
		this.rotate(0);
		this.props.setTimeout(() => {
			this.endMoving();
			this.dropping = false;
		}, 100);
	};

	rotate = (toValue: number) => {
		const { rotate } = this.state;
		Animated.spring(rotate, {
			toValue,
			friction: 5,
			useNativeDriver: true,
		}).start();
	};

	// Called by the card's long press, so the finger is still down when the card lifts.
	onLift = (columnId: number, item: any, dy: number) => {
		const { boardPositionY, movingMode } = this.state;
		const { boardRepository } = this.props;

		if (
			movingMode ||
			this.dropping ||
			!item ||
			item.isLocked() ||
			!item.layout()
		) {
			return;
		}
		const lastColumn = boardRepository.columns().length - 1;
		const columnIndex = this.carousel ? this.carousel.currentIndex : 0;

		let x: number;

		if (columnIndex === 0) {
			x = 16;
		} else if (columnIndex > 0 && columnIndex < lastColumn) {
			x = (deviceWidth - 0.78 * deviceWidth + 16) / 2;
		} else if (columnIndex === lastColumn) {
			x = deviceWidth - 0.78 * deviceWidth;
		} else {
			x = 16; // fallback
		}

		if (columnId - 1 === columnIndex) {
			boardRepository.hide(columnId, item);
			this.moved = false;
			this.setState({
				movingMode: true,
				draggedItem: item,
				srcColumnId: item.columnId(),
				startingX: x,
				startingY:
					dy - boardPositionY - STATUSBAR_HEIGHT - (ios ? 0 : 0),
			});
			this.rotate(MAX_DEG);
		}
	};

	onPress = (columnId: number, item: any) => {
		const { open } = this.props;

		if (item.isLocked()) {
			return;
		}

		// Read movingMode when tapped, not when the row rendered; drops are handled by drop().
		return () => {
			if (item.isLocked() || this.state.movingMode) {
				return;
			}

			const columnIndex = this.carousel ? this.carousel.currentIndex : 0;

			if (columnId - 1 === columnIndex) {
				open(item.row());
			}
		};
	};

	onScrollEnd = () => {
		const { boardRepository } = this.props;
		boardRepository.updateColumnsLayoutAfterVisibilityChanged();
	};

	movingStyle = (zIndex: number) => {
		const { pan, rotate, startingX, startingY } = this.state;
		const interpolatedRotateAnimation = rotate.interpolate({
			inputRange: [-MAX_RANGE, 0, MAX_RANGE],
			outputRange: [`-${MAX_DEG}deg`, '0deg', `${MAX_DEG}deg`],
		});

		return {
			position: 'absolute' as const,
			zIndex,
			top: startingY,
			left: startingX,
			width:
				this.state.deviceWidth *
					(this.state.isHorizontal ? 0.45 : 0.85) -
				16,
			transform: [
				{ translateX: pan.x },
				{ translateY: pan.y },
				{ rotate: interpolatedRotateAnimation },
			],
		};
	};

	movingTask = () => {
		const { draggedItem, movingMode } = this.state;
		const zIndex = movingMode ? 1 : -1;
		const data = {
			item: draggedItem,
			hidden: !movingMode,
			style: this.movingStyle(zIndex),
		};

		return this.renderWrapperRow(data);
	};

	renderWrapperRow = (data: any) => (
		<Card
			{...data}
			{...this.props}
			onFlagClicked={this.props.onFlagClicked}
			item={data.item}
			onDeleteItem={this.props.onDeleteItem}
			onEditItem={this.props.onEditItem}
			width={this.state.deviceWidth}
			showDeleteItem={this.props.showDeleteItem}
		/>
	);

	setScrollViewRef = (element: any) => {
		this.scrollViewRef = element;
	};

	setBoardPositionY = (y: number) => {
		this.setState({ boardPositionY: y });
	};

	render() {
		const { movingMode } = this.state;
		const { boardBackground, boardRepository, data } = this.props;

		return (
			<BoardWrapper
				{...this.panResponder.panHandlers}
				onTouchEnd={this.drop}
				onTouchCancel={this.drop}>
				<BoardWrapper
					onLayout={(evt: LayoutChangeEvent) =>
						this.setBoardPositionY(evt.nativeEvent.layout.y)
					}
					style={{ backgroundColor: boardBackground }}>
					<Carousel
						ref={(c: CarouselRef | null) => {
							this.carousel = c;
						}}
						{...({
							data: boardRepository.columns(),
							onScrollEndDrag: this.onScrollEnd,
							scrollEnabled: !movingMode,
							renderItem: (item: any) => (
								<Column
									{...({
										...this.props,
										key: item.item.data().id.toString(),
										column: item.item,
										movingMode: movingMode,
										boardRepository: boardRepository,
										onLift: this.onLift,
										onPress: this.onPress,
										renderWrapperRow: this.renderWrapperRow,
										showDeleteItem:
											this.props.showDeleteItem,
										onScrollingStarted:
											this.onScrollingStarted,
										onScrollingEnded: this.onScrollingEnded,
										oneColumn:
											boardRepository.columns().length ===
											1,
									} as any)}
									columnHeight={
										this.state.isHorizontal
											? this.state.deviceHeight - 75
											: undefined
									}
								/>
							),
							sliderWidth: this.state.deviceWidth,
							sliderHeight: this.state.deviceHeight,
							itemWidth: this.state.cardWidth,
							oneColumn: boardRepository.columns().length === 1,
						} as any)}
					/>

					{this.movingTask()}
				</BoardWrapper>
			</BoardWrapper>
		);
	}

	static defaultProps: Partial<BoardProps> = {
		boardBackground: colors.deepComaru,
	};

	static propTypes = {
		boardBackground: string.isRequired,
		onDragEnd: func.isRequired,
		open: func.isRequired,
		requestAnimationFrame: func.isRequired,
		boardRepository: object.isRequired,
		setTimeout: func.isRequired,
		onFlagClicked: func,
		onDeleteItem: func,
		onEditItem: func,
		showDeleteItem: bool,
	};
}

// react-timeout injects these three props
export default ReactTimeout(Board) as unknown as React.ComponentClass<
	Omit<BoardProps, 'requestAnimationFrame' | 'setTimeout'>
>;
