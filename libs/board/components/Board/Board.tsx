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
} from 'react-native';
import { func, object, string } from 'prop-types';
import { colors, deviceWidth, ios, isX } from '../../constants';
import Column from '../Column/Column';
import Card from '../Card/Card';
import Carousel from '../Carousel/Carousel';
import { BoardWrapper } from './Board.styled';

const MAX_RANGE = 100;
const MAX_DEG = 30;
let CARD_WIDTH = 0.85 * deviceWidth;
const STATUSBAR_HEIGHT = ios ? (isX() ? 44 : 20) : StatusBar.currentHeight || 0;

// Type definitions
interface BoardProps {
	columnWidth?: number;
	boardBackground?: string;
	clearTimeout: (timeoutId: NodeJS.Timeout) => void;
	onDragEnd: (srcColumn: any, destColumn: any, draggedItem: any) => void;
	open: (item: any) => void;
	requestAnimationFrame: (callback: () => void) => void;
	boardRepository: any;
	setTimeout: (callback: () => void, delay: number) => NodeJS.Timeout;
	onFlagClicked?: (item: any) => void;
	onDeleteItem?: (item: any) => void;
	onEditItem?: (item: any) => void;
	data?: any;
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
	private movingSubscription: NodeJS.Timeout | null = null;
	private scrollViewRef: any = null;

	constructor(props: BoardProps) {
		super(props);

		if (this.props.columnWidth) {
			CARD_WIDTH = this.props.columnWidth;
		}
		this.state = {
			boardPositionY: 0,
			rotate: new Animated.Value(0),
			pan: new Animated.ValueXY(),
			startingX: 0,
			startingY: 0,
			movingMode: false,
		};

		this.panResponder = PanResponder.create({
			onMoveShouldSetPanResponder: () => this.state.movingMode,
			onPanResponderMove: this.onPanResponderMove,
			onPanResponderRelease: this.onPanResponderRelease,
			onPanResponderTerminate: this.onPanResponderRelease,
		});
	}

	componentDidMount() {
		this.val = { x: 0, y: 0 };
		// eslint-disable-next-line no-return-assign
		this.state.pan.addListener(
			(value: { x: number; y: number }) => (this.val = value)
		);
	}

	componentWillUnmount() {
		this.unsubscribeFromMovingMode();
	}

	onPanResponderMove = (
		event: NativeSyntheticEvent<NativeTouchEvent>,
		gesture: PanResponderGestureState
	) => {
		try {
			const { draggedItem, pan, startingX, startingY } = this.state;
			const { boardRepository } = this.props;
			this.unsubscribeFromMovingMode();

			if (draggedItem) {
				this.setState({ movingMode: true });
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
					startingX + gesture.dx + CARD_WIDTH - 50 > deviceWidth &&
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
		const { movingMode } = this.state;
		this.x = null;
		this.y = null;

		if (movingMode) {
			this.rotate(0);
			setTimeout(this.endMoving, 100);
		} else if (this.scrolling) {
			this.unsubscribeFromMovingMode();
		}
	};

	rotate = (toValue: number) => {
		const { rotate } = this.state;
		Animated.spring(rotate, {
			toValue,
			friction: 5,
			useNativeDriver: true,
		}).start();
	};

	cancelMovingSubscription = () => {
		const { clearTimeout } = this.props;

		if (this.movingSubscription) {
			clearTimeout(this.movingSubscription);
		}
	};

	unsubscribeFromMovingMode = () => {
		this.cancelMovingSubscription();
	};

	onPressIn = (columnId: number, item: any, dy: number) => {
		const { boardPositionY } = this.state;
		const { boardRepository, setTimeout } = this.props;

		if (item.isLocked()) {
			return;
		}

		if (!item || (item.isLocked() && this.scrolling)) {
			this.unsubscribeFromMovingMode();
			return;
		}
		this.movingSubscription = setTimeout(() => {
			if (!item || !item.layout()) {
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
			const { y } = item.layout();

			if (columnId - 1 === columnIndex) {
				boardRepository.hide(columnId, item);
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
		}, 200);
	};

	onPress = (columnId: number, item: any) => {
		const { open } = this.props;
		const { movingMode } = this.state;

		if (item.isLocked()) {
			return;
		}

		return () => {
			this.unsubscribeFromMovingMode();

			if (item.isLocked()) {
				return;
			}

			if (!movingMode) {
				const columnIndex = this.carousel
					? this.carousel.currentIndex
					: 0;

				if (columnId - 1 === columnIndex) {
					open(item.row());
				}
			} else {
				this.endMoving();
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
			width: CARD_WIDTH - 16,
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
			width={CARD_WIDTH}
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
			<BoardWrapper {...this.panResponder.panHandlers}>
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
							onScroll: this.cancelMovingSubscription,
							scrollEnabled: !movingMode,
							renderItem: (item: any) => (
								<Column
									{...({
										...this.props,
										key: item.item.data().id.toString(),
										column: item.item,
										movingMode: movingMode,
										boardRepository: boardRepository,
										onPressIn: this.onPressIn,
										onPress: this.onPress,
										renderWrapperRow: this.renderWrapperRow,
										onScrollingStarted:
											this.onScrollingStarted,
										onScrollingEnded: this.onScrollingEnded,
										unsubscribeFromMovingMode:
											this.cancelMovingSubscription,
										oneColumn:
											boardRepository.columns().length ===
											1,
									} as any)}
								/>
							),
							sliderWidth: deviceWidth,
							itemWidth: CARD_WIDTH,
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
		clearTimeout: func.isRequired,
		onDragEnd: func.isRequired,
		open: func.isRequired,
		requestAnimationFrame: func.isRequired,
		boardRepository: object.isRequired,
		setTimeout: func.isRequired,
		onFlagClicked: func,
		onDeleteItem: func,
		onEditItem: func,
	};
}

export default ReactTimeout(Board);
