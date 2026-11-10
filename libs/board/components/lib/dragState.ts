// Whether a card is lifted right now, so the screen can hold back a full board rebuild
// (which would tear the board down under the finger) until the card is dropped.
let dragging = false;
const idleListeners = new Set<() => void>();

export const isDragging = () => dragging;

export const setDragging = (value: boolean) => {
	if (dragging === value) return;
	dragging = value;
	if (!value) idleListeners.forEach((listener) => listener());
};

export const onDragIdle = (listener: () => void) => {
	idleListeners.add(listener);
	return () => {
		idleListeners.delete(listener);
	};
};
