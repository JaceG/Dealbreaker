// Base Modal Interface - common to all modals
export interface BaseModalProps {
	visible: boolean;
	onClose: () => void;
}

// Specific Modal Props Interfaces
export interface SwitchProfileModalProps extends BaseModalProps {
	// Additional props if needed in the future
}

export interface ConfirmationModalProps extends BaseModalProps {
	onConfirm: () => void;
	title: string;
	message: string;
}

export interface EditItemModalProps extends BaseModalProps {
	onSave: (item: any) => void; // TODO: Replace 'any' with proper FlagItem type
	item: any; // TODO: Replace 'any' with proper FlagItem type
}

export interface EditProfileModalProps extends BaseModalProps {
	onSave: (profileId: string, newName: string) => void;
	profileId: string;
	profileName: string;
	existingProfiles: Array<{ id: string; name: string }>; // Profile[] imported from boardManagementModel
}

export interface DealbreakerAlertProps extends BaseModalProps {
	onUndo: () => void;
	itemTitle: string;
}

export interface FlagHistoryModalProps extends BaseModalProps {
	profileId: string;
	flagId: string;
	flagTitle: string;
	onAddReason: () => void;
}

export interface ReasonInputModalProps extends BaseModalProps {
	onSubmit: (reason: string, attachments?: any[]) => void;
	flagTitle: string;
	prevStatus: string;
	newStatus: string;
	modalTitle: string;
}

export interface ImagePreviewModalProps extends BaseModalProps {
	imageUri: string;
}

// Modal State Management Types
export interface ModalVisibilityState {
	visible: boolean;
	setVisible: (visible: boolean) => void;
}

export interface ModalVisibilityActions {
	open: () => void;
	close: () => void;
}

export interface ModalState
	extends ModalVisibilityState,
		ModalVisibilityActions {}

// Layout Modals Hook Return Type
export interface LayoutModalsReturn {
	switchProfileModalVisible: boolean;
	setSwitchProfileModalVisible: (visible: boolean) => void;
	openSwitchProfileModal: () => void;
	closeSwitchProfileModal: () => void;
}

// Board Management Modal States (comprehensive modal state for board operations)
export interface BoardModalStates {
	// Basic modal states
	visible: boolean;
	setVisible: (visible: boolean) => void;

	// Specific modal visibility states
	deleteModalVisible: boolean;
	setDeleteModalVisible: (visible: boolean) => void;
	editModalVisible: boolean;
	setEditModalVisible: (visible: boolean) => void;
	editProfileModalVisible: boolean;
	setEditProfileModalVisible: (visible: boolean) => void;
	dealbreakerAlertVisible: boolean;
	setDealbreakerAlertVisible: (visible: boolean) => void;
	reasonModalVisible: boolean;
	additionalReasonModalVisible: boolean;
	setAdditionalReasonModalVisible: (visible: boolean) => void;
	historyModalVisible: boolean;
	setHistoryModalVisible: (visible: boolean) => void;
	transitionReasonModalVisible: boolean;
	setTransitionReasonModalVisible: (visible: boolean) => void;
}

// Modal Hook States (for individual modal management hooks)
export interface ModalHookState {
	visible: boolean;
	setVisible: (visible: boolean) => void;
	open: () => void;
	close: () => void;
}

// Generic Modal Manager Hook Return Type
export interface ModalManagerReturn<T = Record<string, any>> {
	modals: T;
	openModal: (modalKey: keyof T) => void;
	closeModal: (modalKey: keyof T) => void;
	closeAllModals: () => void;
}

// Modal with Data Types (for modals that need to pass data)
export interface ModalWithData<T = any> extends BaseModalProps {
	data?: T;
	onSubmit?: (data: T) => void;
}

// Import centralized attachment type
import type { Attachment } from './dataModels';
export type ModalAttachment = Attachment;

// Enhanced Reason Input Modal with Attachments
export interface EnhancedReasonInputModalProps extends BaseModalProps {
	onSubmit: (reason: string, attachments?: Attachment[]) => void;
	flagTitle: string;
	prevStatus: string;
	newStatus: string;
	modalTitle: string;
	allowAttachments?: boolean;
	maxAttachments?: number;
}

// Modal Context Types (if implementing a modal context provider)
export interface ModalContextValue {
	activeModals: Set<string>;
	openModal: (modalId: string, props?: any) => void;
	closeModal: (modalId: string) => void;
	closeAllModals: () => void;
	isModalOpen: (modalId: string) => boolean;
}

// Modal Animation Types
export type ModalAnimationType = 'slide' | 'fade' | 'none';

export interface AnimatedModalProps extends BaseModalProps {
	animationType?: ModalAnimationType;
	transparent?: boolean;
	statusBarTranslucent?: boolean;
}

export interface FlagHistoryTimelineProps {
	profileId: string;
	flagId: string;
	flagTitle: string;
	onClose: () => void;
	onAddReason: () => void;
}
export type BoardManagementModalsProps = {
	// Modal visibility states
	visible: boolean;
	setVisible: (visible: boolean) => void;
	deleteModalVisible: boolean;
	setDeleteModalVisible: (visible: boolean) => void;
	editModalVisible: boolean;
	setEditModalVisible: (visible: boolean) => void;
	editProfileModalVisible: boolean;
	setEditProfileModalVisible: (visible: boolean) => void;
	dealbreakerAlertVisible: boolean;
	setDealbreakerAlertVisible: (visible: boolean) => void;
	reasonModalVisible: boolean;
	additionalReasonModalVisible: boolean;
	setAdditionalReasonModalVisible: (visible: boolean) => void;
	historyModalVisible: boolean;
	setHistoryModalVisible: (visible: boolean) => void;
	transitionReasonModalVisible: boolean;

	// Item states (TODO: Move to separate interface)
	itemToDelete: any;
	setItemToDelete: (item: any) => void;
	itemToEdit: any;
	setItemToEdit: (item: any) => void;
	transitionedItem: any;
	setTransitionedItem: (item: any) => void;
	pendingFlagChange: any;
	selectedFlag: any;
	pendingTransition: any; // PendingTransition type from boardManagementModel

	// Profile data (TODO: Move to separate interface)
	currentProfileId: string;
	profiles: Array<{ id: string; name: string }>; // Profile[] type
	getCurrentProfileName: () => string;

	// Action handlers (TODO: Move to separate interface)
	confirmDeleteItem: () => void;
	handleSaveEdit: (item: any) => void;
	handleSaveProfileEdit: (profileId: string, newName: string) => void;
	handleUndoTransition: () => void;
	handleCancelFlagChange: () => void;
	handleFlagChangeWithReason: (reason: string, attachments?: any[]) => void;
	handleAddAdditionalReason: (reason: string, attachments?: any[]) => void;
	handleOpenAddReasonModal: () => void;
	handleTransitionReasonCancel: () => void;
	handleTransitionReasonSubmit: (reason: string, attachments?: any[]) => void;
};

// Re-export for backward compatibility and to avoid breaking changes
export type {
	SwitchProfileModalProps as SwitchProfileModalPropsLegacy,
	ConfirmationModalProps as ConfirmationModalPropsLegacy,
	EditItemModalProps as EditItemModalPropsLegacy,
	EditProfileModalProps as EditProfileModalPropsLegacy,
	DealbreakerAlertProps as DealbreakerAlertPropsLegacy,
	FlagHistoryModalProps as FlagHistoryModalPropsLegacy,
	ReasonInputModalProps as ReasonInputModalPropsLegacy,
};
