// Type definitions for Item
interface ItemLayout {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface ItemRow {
	id: string | number;
	name: string;
	[key: string]: unknown;
}

interface ItemAttributes {
	id: string | number;
	index: number;
	columnId: string | number;
	row: ItemRow;
	hidden: boolean;
	locked: boolean;
	visible: boolean;
	ref?: unknown;
	layout?: ItemLayout;
}

interface MeasureCallback {
	(
		fx: number,
		fy: number,
		width: number,
		height: number,
		px: number,
		py: number
	): void;
}

interface RefWithMeasure {
	measure: (callback: MeasureCallback) => void;
}

class Item {
	private attributes: ItemAttributes;

	constructor(attributes: ItemAttributes) {
		this.attributes = attributes;
	}

	getAttributes = (): ItemAttributes => this.attributes;

	ref = (): unknown => this.attributes.ref;

	id = (): string | number => this.attributes.id;

	row = (): ItemRow => this.attributes.row;

	index = (): number => this.attributes.index;

	layout = (): ItemLayout | undefined => this.attributes.layout;

	columnId = (): string | number => this.attributes.columnId;

	isVisible = (): boolean => this.attributes.visible;

	isHidden = (): boolean => this.attributes.hidden;

	isLocked = (): boolean => this.attributes.locked;

	setHidden = (hidden: boolean): void => {
		this.attributes.hidden = hidden;
	};

	setRef = (ref: unknown): void => {
		this.attributes.ref = ref;
	};

	setLayout = (layout: ItemLayout): void => {
		this.attributes.layout = layout;
	};

	setVisible = (visible: boolean): void => {
		this.attributes.visible = visible;
	};

	setColumnId = (columnId: string | number): void => {
		this.attributes.columnId = columnId;
	};

	setIndex = (index: number): void => {
		this.attributes.index = index;
	};

	measureAndSaveLayout = (previousItem?: Item): void => {
		const ref = this.attributes.ref as RefWithMeasure | null;

		if (ref && ref.measure) {
			ref.measure(
				(
					fx: number,
					fy: number,
					width: number,
					height: number,
					px: number,
					py: number
				) => {
					const layout = { x: px, y: py, width, height };
					this.setLayout(layout);

					if (
						!this.isVisible() &&
						layout.x &&
						layout.y &&
						layout.width &&
						layout.height
					) {
						this.setVisible(true);
					} else if (
						this.isVisible() &&
						!layout.x &&
						!layout.y &&
						!layout.width &&
						!layout.height
					) {
						this.setVisible(false);
					}

					if (this.isLocked()) {
						this.setVisible(false);
					}

					if (
						previousItem &&
						previousItem.layout() &&
						previousItem.layout()!.y > layout.y
					) {
						this.setVisible(false);
					}
				}
			);
		}
	};
}

export default Item;
