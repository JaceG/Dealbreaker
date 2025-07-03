import React, { Component } from 'react';
import {
	ScrollView,
	NativeSyntheticEvent,
	NativeScrollEvent,
} from 'react-native';
import { array, bool, func, number } from 'prop-types';
import { deviceWidth, ios } from '../../constants';
import { ItemWrapper } from './Carousel.styled';

interface CarouselItem {
	[key: string]: unknown;
}

interface CarouselProps {
	data: CarouselItem[];
	itemWidth: number;
	oneColumn?: boolean;
	onScroll?: () => void;
	onScrollEndDrag?: () => void;
	renderItem: ({
		item,
		index,
	}: {
		item: CarouselItem;
		index: number;
	}) => React.ReactNode;
	sliderWidth: number;
	scrollEnabled?: boolean;
}

interface CarouselState {}

interface Position {
	start: number;
	end: number;
}

const INITIAL_ACTIVE_ITEM = 0;

class Carousel extends Component<CarouselProps, CarouselState> {
	private activeItem: number;
	private previousActiveItem: number;
	private previousFirstItem: number;
	private previousItemsLength: number;
	private mounted: boolean;
	private positions: Position[];
	private currentContentOffset: number;
	private scrollOffsetRef: number | null;
	private carouselRef: ScrollView | null;
	private itemToSnapTo: number;
	private scrollStartOffset: number;
	private scrollStartActive: number;
	private scrollEndOffset: number;
	private scrollEndActive: number;
	private onLayoutInitDone: boolean;

	constructor(props: CarouselProps) {
		super(props);

		this.activeItem = INITIAL_ACTIVE_ITEM;
		this.previousActiveItem = INITIAL_ACTIVE_ITEM;
		this.previousFirstItem = INITIAL_ACTIVE_ITEM;
		this.previousItemsLength = INITIAL_ACTIVE_ITEM;
		this.mounted = false;
		this.positions = [];
		this.currentContentOffset = 0;
		this.scrollOffsetRef = null;
		this.carouselRef = null;
		this.itemToSnapTo = 0;
		this.scrollStartOffset = 0;
		this.scrollStartActive = 0;
		this.scrollEndOffset = 0;
		this.scrollEndActive = 0;
		this.onLayoutInitDone = false;
	}

	componentDidMount() {
		this.mounted = true;
		this.activeItem = 0;

		this.initPositions(this.props);
	}

	UNSAFE_componentWillUpdate = (nextProps: CarouselProps) => {
		this.initPositions(nextProps);
	};

	componentWillUnmount() {
		this.mounted = false;
	}

	getCustomDataLength = (props: CarouselProps = this.props): number => {
		const { data } = props;
		const dataLength = data && data.length;

		if (!dataLength) {
			return 0;
		}

		return dataLength;
	};

	getCustomIndex = (
		index: number,
		props: CarouselProps = this.props
	): number => {
		const itemsLength = this.getCustomDataLength(props);

		if (!itemsLength || (!index && index !== 0)) {
			return 0;
		}

		return index;
	};

	get currentIndex(): number {
		return this.activeItem;
	}

	getDataIndex = (index: number): number => {
		const { data } = this.props;
		const dataLength = data && data.length;

		if (!dataLength) {
			return index;
		}

		if (index >= dataLength + 1) {
			return dataLength < 1
				? (index - 1) % dataLength
				: index - dataLength - 1;
		}
		if (index < 1) {
			return index + dataLength - 1;
		}

		return index - 1;
	};

	getFirstItem = (
		index: number,
		props: CarouselProps = this.props
	): number => {
		const itemsLength = this.getCustomDataLength(props);

		if (!itemsLength || index > itemsLength - 1 || index < 0) {
			return 0;
		}

		return index;
	};

	getWrappedRef = (): ScrollView | null => this.carouselRef;

	getKeyExtractor = (item: CarouselItem, index: number): string =>
		`scrollview-item-${index}`;

	getScrollOffset = (
		event: NativeSyntheticEvent<NativeScrollEvent>
	): number =>
		(event &&
			event.nativeEvent &&
			event.nativeEvent.contentOffset &&
			event.nativeEvent.contentOffset.x) ||
		0;

	getCenter = (offset: number): number => {
		const { itemWidth, sliderWidth } = this.props;

		return offset + sliderWidth / 2 - (sliderWidth - itemWidth) / 2;
	};

	getActiveItem = (offset: number): number => {
		// Safety check for positions array
		if (!this.positions || this.positions.length === 0) {
			return 0;
		}

		const center = this.getCenter(offset);
		const centerOffset = 20;

		for (let i = 0; i < this.positions.length; i += 1) {
			const { start, end } = this.positions[i];
			if (
				center + centerOffset >= start &&
				center - centerOffset <= end
			) {
				return i;
			}
		}

		const lastIndex = this.positions.length - 1;
		if (
			this.positions[lastIndex] &&
			center - centerOffset > this.positions[lastIndex].end
		) {
			return lastIndex;
		}

		return 0;
	};

	initPositions = (props: CarouselProps = this.props): void => {
		const { data, itemWidth } = props;

		if (!data || !data.length) {
			this.positions = [];
			return;
		}

		this.positions = [];

		const firstItemMargin = 0;
		data.forEach((itemData: CarouselItem, index: number) => {
			this.positions[index] = {
				start: firstItemMargin + index * itemWidth + index * 8,
				end: index * itemWidth + itemWidth + index * 8,
			};
		});
	};

	scrollTo = (offset: number): void => {
		const wrappedRef = this.getWrappedRef();

		if (!wrappedRef) {
			console.log('Warning: scrollTo called with null reference');
			return;
		}

		wrappedRef.scrollTo({ x: offset, y: 0, animated: true });
	};

	onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
		const { onScroll } = this.props;
		const scrollOffset = this.getScrollOffset(event);
		const nextActiveItem = this.getActiveItem(scrollOffset);

		const itemReached = nextActiveItem === this.itemToSnapTo;
		const scrollConditions =
			scrollOffset >= (this.scrollOffsetRef || 0) &&
			scrollOffset <= (this.scrollOffsetRef || 0);

		this.currentContentOffset = scrollOffset;

		if (this.activeItem !== nextActiveItem && itemReached) {
			if (scrollConditions) {
				this.activeItem = nextActiveItem;
			}
		}

		if (onScroll) {
			onScroll();
		}
	};

	onScrollBeginDrag = (
		event: NativeSyntheticEvent<NativeScrollEvent>
	): void => {
		this.scrollStartOffset = this.getScrollOffset(event);
		this.scrollStartActive = this.getActiveItem(this.scrollStartOffset);
	};

	onScrollEndDrag = (
		event: NativeSyntheticEvent<NativeScrollEvent>
	): void => {
		const { onScrollEndDrag } = this.props;

		if (!this.carouselRef) {
			console.log(
				'Warning: carousel reference is null in onScrollEndDrag'
			);
			if (onScrollEndDrag) {
				onScrollEndDrag();
			}
			return;
		}

		this.onScrollEnd();
	};

	onScrollEnd = (): void => {
		this.scrollEndOffset = this.currentContentOffset;
		this.scrollEndActive = this.getActiveItem(this.scrollEndOffset);

		this.snapScroll(this.scrollEndOffset - this.scrollStartOffset);
	};

	onLayout = (): void => {
		if (this.onLayoutInitDone) {
			this.initPositions();
			this.snapToItem(this.activeItem);
		} else {
			this.onLayoutInitDone = true;
		}
	};

	snapScroll = (delta: number): void => {
		if (!this.scrollEndActive && this.scrollEndActive !== 0 && ios) {
			this.scrollEndActive = this.scrollStartActive;
		}

		if (this.scrollStartActive !== this.scrollEndActive) {
			this.snapToItem(this.scrollEndActive);
		} else if (delta > 0) {
			this.snapToItem(this.scrollStartActive + 1);
		} else if (delta < 0) {
			this.snapToItem(this.scrollStartActive - 1);
		} else {
			this.snapToItem(this.scrollEndActive);
		}
	};

	snapToItem = (index: number): void => {
		const { itemWidth } = this.props;
		this.activeItem = index;

		if (index !== this.previousActiveItem) {
			this.previousActiveItem = index;
		}

		this.itemToSnapTo = index;
		this.scrollOffsetRef =
			this.positions[index] &&
			this.positions[index].start - (deviceWidth - itemWidth) / 2 + 8;

		if (!this.scrollOffsetRef && this.scrollOffsetRef !== 0) {
			return;
		}

		this.currentContentOffset =
			this.scrollOffsetRef < 0 ? 0 : this.scrollOffsetRef;

		this.scrollTo(this.scrollOffsetRef);
	};

	snapToNext = (): void => {
		const { onScrollEndDrag } = this.props;
		const itemsLength = this.getCustomDataLength();

		const newIndex = this.activeItem + 1;
		if (newIndex > itemsLength - 1) {
			return;
		}

		setTimeout(() => this.snapToItem(newIndex), 500);
		if (onScrollEndDrag) {
			onScrollEndDrag();
		}
	};

	snapToPrev = (): void => {
		const { onScrollEndDrag } = this.props;
		const newIndex = this.activeItem - 1;
		if (newIndex < 0) {
			return;
		}
		setTimeout(() => this.snapToItem(newIndex), 500);
		if (onScrollEndDrag) {
			onScrollEndDrag();
		}
	};

	renderItem = ({
		item,
		index,
	}: {
		item: CarouselItem;
		index: number;
	}): React.ReactNode => {
		const { renderItem } = this.props;

		const specificProps = {
			key: this.getKeyExtractor(item, index),
		};

		return (
			<ItemWrapper pointerEvents='box-none' {...specificProps}>
				{renderItem({ item, index })}
			</ItemWrapper>
		);
	};

	getComponentStaticProps = () => {
		const { data, oneColumn, sliderWidth } = this.props;

		const containerStyle = [
			{ width: sliderWidth, flexDirection: 'row' as const },
		];
		const contentContainerStyle = {
			paddingLeft: oneColumn ? 16 : 8,
			paddingTop: 8,
			paddingBottom: 8,
		};

		return {
			ref: (c: ScrollView | null) => (this.carouselRef = c),
			data,
			style: containerStyle,
			contentContainerStyle,
			horizontal: true,
			scrollEventThrottle: 1,
			onScroll: this.onScroll,
			onScrollBeginDrag: this.onScrollBeginDrag,
			onScrollEndDrag: this.onScrollEndDrag,
			onLayout: this.onLayout,
		};
	};

	render() {
		const props = {
			decelerationRate: 'fast' as const,
			showsHorizontalScrollIndicator: false,
			overScrollMode: 'never' as const,
			automaticallyAdjustContentInsets: true,
			directionalLockEnabled: true,
			pinchGestureEnabled: false,
			scrollsToTop: false,
			renderToHardwareTextureAndroid: true,
			...this.props,
			...this.getComponentStaticProps(),
		};
		const { data, oneColumn, scrollEnabled } = this.props;

		// Remove data from props since ScrollView doesn't accept it
		const { data: _, ...scrollViewProps } = props;

		return (
			<ScrollView
				{...scrollViewProps}
				scrollEnabled={scrollEnabled && !oneColumn}>
				{data.map((item: CarouselItem, index: number) =>
					this.renderItem({ item, index })
				)}
			</ScrollView>
		);
	}
}

// TypeScript interfaces provide better type safety than propTypes
// Keeping propTypes for backwards compatibility with non-TS consumers
// @ts-ignore
Carousel.propTypes = {
	data: array,
	itemWidth: number.isRequired,
	oneColumn: bool,
	onScroll: func,
	onScrollEndDrag: func,
	renderItem: func.isRequired,
	sliderWidth: number.isRequired,
};

// @ts-ignore
Carousel.defaultProps = {
	oneColumn: false,
	onScroll: () => {},
	onScrollEndDrag: () => {},
};

export default Carousel;
