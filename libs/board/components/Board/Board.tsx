import React from 'react';
import ReactTimeout from 'react-timeout';
import { Animated, Dimensions } from 'react-native';
import { GestureDetector, GestureStateManager, usePanGesture } from 'react-native-gesture-handler';
import { bool, func, object, string } from 'prop-types';
import { colors } from '../../constants';
import Column from '../Column/Column';
import Card from '../Card/Card';
import Carousel from '../Carousel/Carousel';
import { BoardWrapper } from './Board.styled';
import { boardLog } from '../../../../utils/boardLog';
import { getView, rememberColumn } from '../lib/viewMemory';
import { setDragging } from '../lib/dragState';

const MAX_RANGE = 100;
const MAX_DEG = 30;
// Press and hold this long (finger still) to lift a card; moving sooner scrolls instead.
const LIFT_DELAY_MS = 350;
// Hold the card within this distance of the screen edge to switch columns.
const EDGE = 40;
// How far back from the edge the finger has to come before another switch can happen.
const EDGE_REARM = 60;

type DragPoint = { absoluteX: number; absoluteY: number };

const round = (v: number) => Math.round(v);
const box = (l: any) => l && { x: round(l.x), y: round(l.y), w: round(l.width), h: round(l.height) };
const cardInfo = (item: any) => ({
	id: item?.row?.()?.id,
	title: item?.row?.()?.name,
	col: item?.columnId?.(),
	index: item?.index?.(),
});
const firstTouch = (e: any) => {
	const t = e?.changedTouches?.[0] || e?.allTouches?.[0];
	return { touches: e?.numberOfTouches, x: t && round(t.absoluteX), y: t && round(t.absoluteY) };
};

// The drag is a native gesture on the whole board, so the finger is never lost while the
// board re-renders the cards under it, and onFinalize always runs when the finger lifts.
const BoardDrag = ({
	onBegin,
	onStart,
	onMove,
	onEnd,
	children,
}: {
	onBegin: (e: DragPoint) => void;
	onStart: (e: DragPoint) => boolean;
	onMove: (e: DragPoint) => void;
	onEnd: (canceled: boolean) => void;
	children: React.ReactNode;
}) => {
	const drag = usePanGesture({
		disableReanimated: true,
		activateAfterLongPress: LIFT_DELAY_MS,
		onBegin: (e) => onBegin(e),
		onActivate: (e) => {
			// No card under the finger: end the gesture now. The hold has already cancelled any
			// button press and the list's scroll for this touch; they work again on the next touch.
			if (!onStart(e)) {
				try {
					GestureStateManager.fail(e.handlerTag);
				} catch {}
			}
		},
		onUpdate: (e) => onMove(e),
		onFinalize: (e) => onEnd(e.canceled),
		// Raw finger events, so the log shows every touch even when the drag never starts.
		onTouchesDown: (e) => boardLog('touch.down', firstTouch(e)),
		onTouchesUp: (e) => boardLog('touch.up', firstTouch(e)),
		onTouchesCancel: (e) => boardLog('touch.cancel', firstTouch(e)),
	});
	return <GestureDetector gesture={drag}>{children}</GestureDetector>;
};

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
	// Which board this is (the person's id), so a rebuilt board reopens where the person was looking.
	viewKey?: string;
}

interface BoardState {
	rotate: Animated.Value;
	pan: Animated.ValueXY;
	startingX: number;
	startingY: number;
	draggedWidth: number;
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
	private x: number | null = null;
	private y: number | null = null;
	private scrolling: boolean = false;
	private carousel: CarouselRef | null = null;
	private boardRef: any = null;
	// Where the board sits on screen, so the lifted card can be drawn exactly over the original.
	private boardOrigin = { x: 0, y: 0 };
	private dragStart = { x: 0, y: 0 };
	private edgeArmed = true;
	// Diagnostics only (see utils/boardLog.ts).
	private lastMoveLog = 0;
	private lastUpdateAt = 0;
	private lastIndex: number | undefined;
	private lastColumn = 0;
	private liftInfo: any = null;
	// The drag lives on the instance, not in React state, so a finger-up that arrives in the
	// same JS batch as the lift still sees the lifted card.
	private lifted = false;
	private dragItem: any = null;
	private srcColumnId: number | undefined;
	private srcIndex: number | undefined;
	private crossed = false;

	constructor(props: BoardProps) {
		super(props);
		const { width, height } = Dimensions.get('window');
		const isHorizontal = width > height;
		this.state = {
			rotate: new Animated.Value(0),
			pan: new Animated.ValueXY(),
			startingX: 0,
			startingY: 0,
			draggedWidth: 0,
			movingMode: false,
			isHorizontal,
			deviceWidth: width,
			deviceHeight: height,
			cardWidth: 0.85 * width,
		};
	}

	componentDidMount() {
		Dimensions.addEventListener('change', this.onOrientationChange);
		const { boardRepository } = this.props;
		boardLog('board.mount', {
			columns: boardRepository
				.columns()
				.map((c: any) => (boardRepository.items(c.id()) || []).length),
			restore: getView(this.props.viewKey),
		});
	}

	componentWillUnmount() {
		// A board torn down mid-drag would explain a card that vanishes or never lands.
		boardLog('board.unmount', { dragging: this.lifted });
		if (this.lifted) setDragging(false);
	}

	onOrientationChange = ({
		window,
	}: {
		window: { width: number; height: number };
	}) => {
		const isHorizontal = window.width > window.height;
		this.setState({
			isHorizontal,
			deviceWidth: window.width,
			deviceHeight: window.height,
			cardWidth: 0.85 * window.width,
		});
	};

	measureBoard = () => {
		this.boardRef?.measureInWindow((x: number, y: number) => {
			if (x !== this.boardOrigin.x || y !== this.boardOrigin.y) {
				boardLog('board.measured', { x: round(x), y: round(y) });
			}
			this.boardOrigin = { x, y };
		});
	};

	columnIndex = () => {
		const last = Math.max(0, this.props.boardRepository.columns().length - 1);
		const index = this.carousel ? this.carousel.currentIndex : 0;
		return Math.max(0, Math.min(index, last));
	};

	// The card under the finger in the column on screen. Card layouts are in screen coordinates.
	itemAt = (absX: number, absY: number) => {
		const { boardRepository } = this.props;
		const items = boardRepository.items(this.columnIndex() + 1) || [];
		return items.find((item: any) => {
			const l = item.layout();
			return (
				l &&
				item.row?.()?.id &&
				!item.isLocked() &&
				absX >= l.x &&
				absX <= l.x + l.width &&
				absY >= l.y &&
				absY <= l.y + l.height
			);
		});
	};

	onDragBegin = ({ absoluteX, absoluteY }: DragPoint) => {
		// Touch down: measure the board and this column's cards now, well before the hold delay
		// ends, so a column reached by a swipe or a flick doesn't keep old card positions.
		this.measureBoard();
		this.props.boardRepository.updateLayoutAfterVisibilityChanged?.(this.columnIndex() + 1);
		boardLog('gesture.begin', { x: round(absoluteX), y: round(absoluteY), col: this.columnIndex() });
	};

	onDragStart = ({ absoluteX, absoluteY }: DragPoint): boolean => {
		const { boardRepository } = this.props;
		const finger = { x: round(absoluteX), y: round(absoluteY) };
		if (this.lifted) {
			boardLog('drag.liftIgnored', { reason: 'already lifted', finger });
			return false;
		}
		const item = this.itemAt(absoluteX, absoluteY);
		if (!item) {
			// Held still on the board but no card's recorded position contains the finger:
			// either empty space, or the stored card positions are stale.
			const items = boardRepository.items(this.columnIndex() + 1) || [];
			boardLog('drag.noCard', {
				finger,
				col: this.columnIndex(),
				board: this.boardOrigin,
				cards: items
					.filter((i: any) => i.row?.()?.id)
					.slice(0, 20)
					.map((i: any) => ({ id: i.row().id, locked: i.isLocked(), ...box(i.layout()) })),
			});
			return false;
		}
		const l = item.layout();
		this.lifted = true;
		setDragging(true);
		this.dragItem = item;
		this.srcColumnId = item.columnId();
		this.srcIndex = item.index();
		this.crossed = false;
		this.liftInfo = { ...cardInfo(item) };
		this.lastIndex = item.index();
		this.lastColumn = this.columnIndex();
		// 0: the first move after the lift isn't a gap, however long the finger was held still.
		this.lastUpdateAt = 0;
		boardLog('drag.lift', {
			finger,
			card: this.liftInfo,
			cardBox: box(l),
			board: this.boardOrigin,
			col: this.columnIndex(),
			columnScroll: round(boardRepository.column(item.columnId())?.scrollOffset?.() ?? -1),
		});

		boardRepository.hide(item.columnId(), item);
		this.edgeArmed = true;
		this.dragStart = { x: absoluteX, y: absoluteY };
		this.x = absoluteX;
		this.y = absoluteY;
		this.state.pan.setValue({ x: 0, y: 0 });
		this.setState({
			movingMode: true,
			draggedItem: item,
			srcColumnId: item.columnId(),
			startingX: l.x - this.boardOrigin.x,
			startingY: l.y - this.boardOrigin.y,
			draggedWidth: l.width,
		});
		this.rotate(MAX_DEG / 3);
		return true;
	};

	onDragMove = ({ absoluteX, absoluteY }: DragPoint) => {
		const { pan, deviceWidth } = this.state;
		const { boardRepository } = this.props;
		const draggedItem = this.dragItem;
		if (!this.lifted || !draggedItem) return;
		try {
			const now = Date.now();
			if (this.lastUpdateAt && now - this.lastUpdateAt > 100) {
				boardLog('drag.gap', { ms: now - this.lastUpdateAt });
			}
			this.lastUpdateAt = now;
			const dx = absoluteX - this.dragStart.x;
			const dy = absoluteY - this.dragStart.y;
			if (now - this.lastMoveLog >= 50) {
				this.lastMoveLog = now;
				boardLog('drag.move', {
					x: round(absoluteX),
					y: round(absoluteY),
					dx: round(dx),
					dy: round(dy),
					col: this.columnIndex(),
				});
			}
			pan.setValue({ x: dx, y: dy });
			this.x = absoluteX;
			this.y = absoluteY;

			// One switch per visit to an edge: the finger has to come back in before the next one.
			if (this.carousel) {
				if (this.edgeArmed && absoluteX < EDGE) {
					this.edgeArmed = false;
					boardLog('drag.edge', { dir: 'prev', x: round(absoluteX), col: this.columnIndex() });
					this.carousel.snapToPrev();
				} else if (this.edgeArmed && absoluteX > deviceWidth - EDGE) {
					this.edgeArmed = false;
					boardLog('drag.edge', { dir: 'next', x: round(absoluteX), col: this.columnIndex() });
					this.carousel.snapToNext();
				} else if (
					!this.edgeArmed &&
					absoluteX > EDGE_REARM &&
					absoluteX < deviceWidth - EDGE_REARM
				) {
					this.edgeArmed = true;
					boardLog('drag.edgeRearmed', { x: round(absoluteX) });
				}
			}

			const columnId = this.columnIndex();
			if (columnId !== this.lastColumn) {
				boardLog('drag.columnChanged', { from: this.lastColumn, to: columnId });
				this.lastColumn = columnId;
			}
			const columnAtPosition = boardRepository.move(
				draggedItem,
				absoluteX,
				absoluteY,
				columnId
			);
			if (columnAtPosition) {
				const { scrolling, offset } = boardRepository.scrollingPosition(
					columnAtPosition,
					absoluteX,
					absoluteY,
					columnId
				);
				if (this.shouldScroll(scrolling, offset, columnAtPosition)) {
					boardLog('drag.autoscroll', { offset, col: columnId, y: round(absoluteY) });
					this.scroll(columnAtPosition, draggedItem, offset);
				}
			}
			if (draggedItem.columnId() !== this.srcColumnId) this.crossed = true;
			const index = draggedItem.index();
			if (index !== this.lastIndex) {
				boardLog('drag.reorder', { from: this.lastIndex, to: index, col: draggedItem.columnId() });
				this.lastIndex = index;
			}
		} catch (error: any) {
			console.log('onDragMove', error);
			boardLog('drag.error', { where: 'move', message: String(error?.message || error) });
		}
	};

	// Runs whenever the gesture ends, however it ends (lifted, cancelled or failed).
	onDragFinish = (canceled: boolean) => {
		this.x = null;
		this.y = null;
		boardLog('gesture.finalize', { canceled, lifted: this.lifted });
		if (!this.lifted) return;
		this.rotate(0);
		try {
			this.endMoving();
		} finally {
			// After the drop's own save has started, so a rebuild held back during the drag uses the new
			// order; in finally, so a failed save can't leave every later rebuild held back.
			setDragging(false);
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
			boardRepository.move(draggedItem, this.x, this.y, this.columnIndex());
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
		if (!this.lifted) return;
		this.lifted = false;
		const draggedItem = this.dragItem;
		const srcColumnId = this.srcColumnId;
		this.dragItem = null;
		const { pan } = this.state;
		const { boardRepository, onDragEnd } = this.props;
		this.setState({ movingMode: false, startingX: 0, startingY: 0 });
		pan.setValue({ x: 0, y: 0 });
		if (!draggedItem || !srcColumnId) return;

		let destColumnId = srcColumnId;
		try {
			boardRepository.show(draggedItem.columnId(), draggedItem);
			boardRepository.notify(draggedItem.columnId(), 'reload');
			destColumnId = draggedItem.columnId();
		} catch (error: any) {
			console.log('endMoving', error);
			boardLog('drag.error', { where: 'drop', message: String(error?.message || error) });
		}

		// Save only when the card's place changed (or it visited the other column, whose stored
		// positions the move shifted). A finger always drifts a little, so distance isn't the test.
		const changed =
			destColumnId !== srcColumnId ||
			draggedItem.index() !== this.srcIndex ||
			this.crossed;
		boardLog('drag.drop', {
			from: this.liftInfo,
			to: { col: destColumnId, index: draggedItem.index() },
			crossed: this.crossed,
			save: changed,
		});
		if (!changed) return;

		return (
			onDragEnd &&
			onDragEnd(
				boardRepository.columns()[srcColumnId - 1],
				boardRepository.columns()[destColumnId - 1],
				draggedItem
			)
		);
	};

	rotate = (toValue: number) => {
		const { rotate } = this.state;
		Animated.spring(rotate, {
			toValue,
			friction: 5,
			useNativeDriver: true,
		}).start();
	};

	onPress = (columnId: number, item: any) => {
		const { open } = this.props;

		if (item.isLocked()) {
			return;
		}

		// Read movingMode when tapped, not when the row rendered.
		return () => {
			boardLog('card.tap', { ...cardInfo(item), whileLifted: this.lifted });
			if (item.isLocked() || this.lifted) {
				return;
			}

			if (columnId - 1 === this.columnIndex()) {
				open(item.row());
			}
		};
	};

	onScrollEnd = () => {
		const { boardRepository } = this.props;
		boardLog('carousel.scrollEnd', { col: this.columnIndex(), dragging: this.lifted });
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
			width: this.state.draggedWidth,
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

	render() {
		const { movingMode } = this.state;
		const { boardBackground, boardRepository, data } = this.props;

		return (
			<BoardDrag
				onBegin={this.onDragBegin}
				onStart={this.onDragStart}
				onMove={this.onDragMove}
				onEnd={this.onDragFinish}>
				<BoardWrapper
					ref={(r: any) => {
						this.boardRef = r;
					}}
					onLayout={this.measureBoard}
					style={{ backgroundColor: boardBackground }}>
					<Carousel
						ref={(c: CarouselRef | null) => {
							this.carousel = c;
						}}
						{...({
							data: boardRepository.columns(),
							onScrollEndDrag: this.onScrollEnd,
							// The carousel updates its column index before calling this.
							onScroll: () => rememberColumn(this.props.viewKey, this.columnIndex()),
							firstItem: getView(this.props.viewKey).col,
							scrollEnabled: !movingMode,
							renderItem: (item: any) => (
								<Column
									{...({
										...this.props,
										key: item.item.data().id.toString(),
										column: item.item,
										movingMode: movingMode,
										boardRepository: boardRepository,
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
			</BoardDrag>
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
