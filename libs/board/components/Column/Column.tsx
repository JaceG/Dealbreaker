import React from 'react';
import {
	FlatList,
	NativeSyntheticEvent,
	NativeScrollEvent,
	ListRenderItem,
	ViewabilityConfig,
} from 'react-native';
import { bool, func, object, number, string } from 'prop-types';
import { colors, deviceWidth, ios } from '../../constants';
import EmptyColumn from '../EmptyColumn/EmptyColumn';
import {
	ColumnWrapper,
	ParagraphWrapper,
	Paragraph,
	RowContainer,
	RowWrapper,
	SumWrapper,
} from './Column.styled';

interface ColumnData {
	id(): string | number;
	name: string;
}

interface BoardItem {
	id(): string | number;
	row(): { id: string | number; [key: string]: unknown } | null;
	isHidden(): boolean;
}

interface BoardColumn {
	id(): string | number;
	data(): ColumnData;
}

interface BoardRepository {
	addListener(
		columnId: string | number,
		event: string,
		callback: () => void
	): void;
	setItemRef(columnId: string | number, item: BoardItem, ref: unknown): void;
	updateColumnsLayoutAfterVisibilityChanged(): void;
	updateItemWithLayout(columnId: string | number, item: BoardItem): void;
	setColumnRef(columnId: string | number, ref: unknown): void;
	updateColumnWithLayout(columnId: string | number): void;
	column(columnId: string | number): {
		id(): string | number;
		scrollOffset(): number;
	};
	setScrollOffset(columnId: string | number, offset: number): void;
	setContentHeight(columnId: string | number, height: number): void;
	setListView(columnId: string | number, ref: FlatList | null): void;
	updateItemsVisibility(
		columnId: string | number,
		visibleItems: BoardItem[]
	): void;
	items(columnId: string | number): BoardItem[];
}

interface ColumnProps {
	badgeBackgroundColor: string;
	badgeBorderRadius: number;
	badgeHeight: number;
	badgeWidth: number;
	badgeTextColor: string;
	badgeTextFontFamily: string;
	badgeTextFontSize: number;
	column: BoardColumn;
	columnBackgroundColor: string;
	columnBorderRadius: number;
	columnHeight: number;
	columnNameFontFamily: string;
	columnNameFontSize: number;
	columnNameTextColor: string;
	emptyComponent?: () => React.ReactNode;
	isWithCountBadge: boolean;
	movingMode: boolean;
	oneColumn?: boolean;
	onPress: (columnId: string | number, item: BoardItem) => void;
	onPressIn: (columnId: string | number, item: BoardItem, y: number) => void;
	onScrollingEnded: () => void;
	onScrollingStarted: () => void;
	renderWrapperRow: (props: {
		onPressIn: (y: number) => void;
		onPress: void;
		hidden: boolean;
		item: BoardItem;
		onFlagClicked?: (item: BoardItem) => void;
		onDeleteItem?: (item: BoardItem) => void;
		onEditItem?: (item: BoardItem) => void;
	}) => React.ReactNode;
	boardRepository: BoardRepository;
	unsubscribeFromMovingMode: () => void;
	onFlagClicked?: (item: BoardItem) => void;
	onDeleteItem?: (item: BoardItem) => void;
	onEditItem?: (item: BoardItem) => void;
	columnWidth?: number;
}

interface ColumnState {}

const COLUMN_WIDTH = 0.85 * deviceWidth;
const PADDING = 32;
const ONE_COLUMN_WIDTH = deviceWidth - PADDING;

class Column extends React.Component<ColumnProps, ColumnState> {
	private viewabilityConfig: ViewabilityConfig;
	private scrollingDown: boolean = false;

	constructor(props: ColumnProps) {
		super(props);

		this.viewabilityConfig = {
			itemVisiblePercentThreshold: 50,
		};
	}

	componentDidMount() {
		const { column, boardRepository } = this.props;

		boardRepository.addListener(column.id(), 'reload', () =>
			this.forceUpdate()
		);
	}

	onPressIn = (item: BoardItem, y: number): void => {
		const { column, onPressIn } = this.props;
		onPressIn(column.id(), item, y);
	};

	onPress = (item: BoardItem): void => {
		const { column, onPress } = this.props;

		onPress(column.id(), item);
	};

	setItemRef = (item: BoardItem, ref: unknown): void => {
		const { column, boardRepository } = this.props;
		boardRepository.setItemRef(column.id(), item, ref);
		boardRepository.updateColumnsLayoutAfterVisibilityChanged();
	};

	updateItemWithLayout = (item: BoardItem) => (): void => {
		const { column, boardRepository } = this.props;
		boardRepository.updateItemWithLayout(column.id(), item);
	};

	setColumnRef = (ref: unknown): void => {
		const { column, boardRepository } = this.props;
		boardRepository.setColumnRef(column.id(), ref);
	};

	updateColumnWithLayout = (): void => {
		const { column, boardRepository } = this.props;

		boardRepository.updateColumnWithLayout(column.id());
	};

	renderWrapperRow = (item: BoardItem): React.ReactNode => {
		if (!item || !item.row || !item.row() || !item.row()?.id) {
			return null;
		}

		const { renderWrapperRow, onFlagClicked, onDeleteItem, onEditItem } =
			this.props;
		const props = {
			onPressIn: (y: number) => this.onPressIn(item, y),
			onPress: this.onPress(item),
			hidden: item.isHidden(),
			item,
			onFlagClicked,
			onDeleteItem,
			onEditItem,
		};
		return (
			<RowWrapper
				ref={(ref) => this.setItemRef(item, ref)}
				onLayout={this.updateItemWithLayout(item)}
				// key={item.id.toString()}>
			>
				{renderWrapperRow(props)}
			</RowWrapper>
		);
	};

	handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
		const {
			column,
			onScrollingStarted,
			boardRepository,
			unsubscribeFromMovingMode,
		} = this.props;

		unsubscribeFromMovingMode();
		onScrollingStarted();

		const col = boardRepository.column(column.id());

		const liveOffset = event.nativeEvent.contentOffset.y;

		this.scrollingDown = liveOffset > col.scrollOffset();
	};

	endScrolling = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
		const { column, onScrollingEnded, boardRepository } = this.props;

		const currentOffset = event.nativeEvent.contentOffset.y;
		const col = boardRepository.column(column.id());
		const scrollingDownEnded =
			this.scrollingDown && currentOffset >= col.scrollOffset();
		const scrollingUpEnded =
			!this.scrollingDown && currentOffset <= col.scrollOffset();

		if (scrollingDownEnded || scrollingUpEnded) {
			boardRepository.setScrollOffset(col.id(), currentOffset);
			boardRepository.updateColumnsLayoutAfterVisibilityChanged();
			onScrollingEnded();
		}
	};

	onScrollEndDrag = (
		event: NativeSyntheticEvent<NativeScrollEvent>
	): void => {
		this.endScrolling(event);
	};

	onMomentumScrollEnd = (
		event: NativeSyntheticEvent<NativeScrollEvent>
	): void => {
		const { onScrollingEnded } = this.props;

		this.endScrolling(event);
		onScrollingEnded();
	};

	onContentSizeChange = (_: number, contentHeight: number): void => {
		const { column, boardRepository } = this.props;

		boardRepository.setContentHeight(column.id(), contentHeight);
	};

	setListView = (ref: FlatList<BoardItem> | null): void => {
		const { column, boardRepository } = this.props;

		boardRepository.setListView(column.id(), ref);
	};

	handleViewableItemsChanged = ({
		viewableItems,
	}: {
		viewableItems: Array<{ item: BoardItem }>;
	}): void => {
		const { column, boardRepository } = this.props;
		const visibleItems = viewableItems.map(({ item }) => item);
		boardRepository.updateItemsVisibility(column.id(), visibleItems);
	};

	renderItem: ListRenderItem<BoardItem> = ({ item }) => {
		return item
			? (this.renderWrapperRow(item) as React.ReactElement)
			: null;
	};

	keyExtractor = (item: BoardItem): string => {
		if (!item || !item.row || typeof item.row !== 'function') {
			return Math.random().toString();
		}
		const rowData = item.row();
		return rowData && rowData.id
			? rowData.id.toString()
			: Math.random().toString();
	};

	render() {
		const {
			badgeBackgroundColor,
			badgeBorderRadius,
			badgeHeight,
			badgeWidth,
			badgeTextColor,
			badgeTextFontFamily,
			badgeTextFontSize,
			column,
			columnBackgroundColor,
			columnBorderRadius,
			columnHeight,
			columnNameFontFamily,
			columnNameFontSize,
			columnNameTextColor,
			emptyComponent,
			isWithCountBadge,
			oneColumn,
			movingMode,
			boardRepository,
			columnWidth,
		} = this.props;

		const colElements = boardRepository.items(column.id()).length - 1;

		const ColumnComponent = (
			<ColumnWrapper
				style={{
					backgroundColor: columnBackgroundColor,
					borderRadius: columnBorderRadius,
					width: oneColumn
						? ONE_COLUMN_WIDTH
						: columnWidth
						? columnWidth
						: COLUMN_WIDTH,
					marginRight: oneColumn ? 0 : 8,
				}}
				ref={this.setColumnRef}
				onLayout={this.updateColumnWithLayout}
				columnHeight={columnHeight}>
				<RowContainer>
					<Paragraph
						style={{
							fontSize: columnNameFontSize,
							fontFamily: columnNameFontFamily,
							color: columnNameTextColor,
						}}>
						{column.data().name}
					</Paragraph>
					{isWithCountBadge && (
						<SumWrapper>
							<ParagraphWrapper
								style={{
									backgroundColor: badgeBackgroundColor,
									width: badgeWidth,
									height: badgeHeight,
									borderRadius: badgeBorderRadius,
								}}>
								<Paragraph
									style={{
										fontSize: badgeTextFontSize,
										fontFamily: badgeTextFontFamily,
										color: badgeTextColor,
										lineHeight: ios
											? undefined
											: badgeTextFontSize * 1.6,
									}}>
									{colElements.toString()}
								</Paragraph>
							</ParagraphWrapper>
						</SumWrapper>
					)}
				</RowContainer>
				{boardRepository.items(column.id()).length - 1 === 0 ? (
					emptyComponent ? (
						emptyComponent()
					) : (
						<EmptyColumn
							emptyIconColor={colors.blurple}
							emptyText='No items'
							emptyTextColor={colors.bay}
							emptyTextFontFamily=''
							emptyTextFontSize={16}
							marginTop={columnHeight / 3}
							{...this.props}
						/>
					)
				) : (
					<FlatList<BoardItem>
						data={boardRepository
							.items(column.id())
							.filter(
								(item: BoardItem) =>
									item &&
									item.row &&
									item.row() &&
									item.row()?.id
							)}
						ref={this.setListView}
						onScroll={this.handleScroll}
						scrollEventThrottle={0}
						onMomentumScrollEnd={this.onMomentumScrollEnd}
						onScrollEndDrag={this.onScrollEndDrag}
						renderItem={this.renderItem}
						onViewableItemsChanged={this.handleViewableItemsChanged}
						viewabilityConfig={this.viewabilityConfig}
						keyExtractor={this.keyExtractor}
						scrollEnabled={!movingMode}
						onContentSizeChange={this.onContentSizeChange}
						showsVerticalScrollIndicator={false}
					/>
				)}
			</ColumnWrapper>
		);

		return ColumnComponent;
	}
}

// TypeScript interfaces provide better type safety than propTypes
// @ts-ignore
Column.defaultProps = {
	badgeBackgroundColor: colors.blurple,
	badgeBorderRadius: 15,
	badgeHeight: 30,
	badgeWidth: 30,
	badgeTextColor: colors.white,
	badgeTextFontFamily: '',
	badgeTextFontSize: 14,
	columnBackgroundColor: colors.fallingStar,
	columnBorderRadius: 6,
	columnHeight: 620,
	columnNameTextColor: colors.blurple,
	columnNameFontFamily: '',
	columnNameFontSize: 18,
	isWithCountBadge: true,
	oneColumn: false,
};

// @ts-ignore
Column.propTypes = {
	badgeBackgroundColor: string.isRequired,
	badgeBorderRadius: number.isRequired,
	badgeHeight: number.isRequired,
	badgeWidth: number.isRequired,
	badgeTextColor: string.isRequired,
	badgeTextFontFamily: string.isRequired,
	badgeTextFontSize: number.isRequired,
	column: object,
	columnBackgroundColor: string.isRequired,
	columnBorderRadius: number.isRequired,
	columnHeight: number.isRequired,
	columnNameFontFamily: string.isRequired,
	columnNameFontSize: number.isRequired,
	columnNameTextColor: string.isRequired,
	emptyComponent: func,
	isWithCountBadge: bool.isRequired,
	movingMode: bool.isRequired,
	oneColumn: bool,
	onPress: func.isRequired,
	onPressIn: func.isRequired,
	onScrollingEnded: func.isRequired,
	onScrollingStarted: func.isRequired,
	renderWrapperRow: func.isRequired,
	boardRepository: object,
	unsubscribeFromMovingMode: func.isRequired,
	onFlagClicked: func,
	onDeleteItem: func,
	onEditItem: func,
};

export default Column;
