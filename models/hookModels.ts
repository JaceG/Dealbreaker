import { DealbreakerState, FlagItem, Profile } from './boardManagementModel';
import type {
	CreateProfileErrorState,
	CreateFlagErrorState,
	ValidationResult,
	ToastNotification,
} from './dataModels';

// =============================================================================
// GENERIC HOOK PATTERNS
// =============================================================================

// Generic async hook return pattern
export interface AsyncHookReturn<T> {
	data: T | null;
	loading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
}

// Generic state hook pattern
export interface StateHookReturn<T> {
	value: T;
	setValue: (value: T) => void;
	reset: () => void;
}

// Generic modal hook pattern (reusable for different modal types)
export interface ModalHookReturn {
	visible: boolean;
	setVisible: (visible: boolean) => void;
	open: () => void;
	close: () => void;
}

// =============================================================================
// AUTHENTICATION HOOKS
// =============================================================================

// useAuthActions return type (already typed)
export interface UseAuthActionsReturn {
	logout: () => Promise<void>;
	clearSecureStore: () => Promise<void>;
}

// useLogin return type (already typed)
export interface UseLoginReturn {
	// Form state
	isLogin: boolean;
	setIsLogin: (isLogin: boolean) => void;
	name: string;
	setName: (name: string) => void;
	email: string;
	setEmail: (email: string) => void;
	password: string;
	setPassword: (password: string) => void;

	// UI state
	localError: string;
	setLocalError: (error: string) => void;
	showDevOptions: boolean;
	setShowDevOptions: (show: boolean) => void;

	// Actions
	handleSubmit: () => Promise<void>;
	handleTitlePress: () => void;
	login: (email: string, password: string) => Promise<boolean>;

	// Loading state
	isLoading: boolean;
}

// useRegister return type
export interface UseRegisterReturn {
	name: string;
	setName: (name: string) => void;
	email: string;
	setEmail: (email: string) => void;
	password: string;
	setPassword: (password: string) => void;
	localError: string;
	handleTitlePress: () => void;
	handleSubmit: () => Promise<void>;
	isLoading: boolean;
}

// =============================================================================
// DATA MANAGEMENT HOOKS
// =============================================================================

// useDataLoader return type
export interface UseDataLoaderReturn {
	isLoaded: boolean;
	updateDealbreaker: (newState: DealbreakerState) => void;
	synchronizeProfileFlags: () => boolean;
}

// useDataLoader parameters type
export interface UseDataLoaderParams {
	dealbreaker: DealbreakerState;
	setDealbreaker: (state: DealbreakerState) => void;
	profiles: Profile[];
	setProfiles: (profiles: Profile[]) => void;
	currentProfileId: string;
	setCurrentProfileId: (id: string) => void;
	debugLog: (...args: any[]) => void;
	syncOfflineData: (forceSync?: boolean) => Promise<void>;
}

// useNetworkSync return type
export interface UseNetworkSyncReturn {
	isOnline: boolean;
	syncOfflineData: (forceSync?: boolean) => Promise<void>;
}

// useNetworkSync parameters type
export interface UseNetworkSyncParams {
	setProfiles: (profiles: Profile[]) => void;
	setDealbreaker: (state: DealbreakerState) => void;
	debugLog: (...args: any[]) => void;
}

// useDealbreakerSync return type
export interface UseDealbreakerSyncReturn {
	fetchDealbreakers: () => Promise<void>;
}

// =============================================================================
// PROFILE MANAGEMENT HOOKS
// =============================================================================

// useProfileManager return type
export interface UseProfileManagerReturn {
	ensureProfileExists: (profileId: string) => boolean;
	addItemToProfile: (
		profileId: string,
		item: FlagItem,
		type: 'flag' | 'dealbreaker'
	) => void;
	addItemToAllProfiles: (
		item: FlagItem,
		type: 'flag' | 'dealbreaker'
	) => void;
	removeItemFromProfile: (
		profileId: string,
		itemId: string,
		type: 'flag' | 'dealbreaker'
	) => void;
	removeItemFromAllProfiles: (
		itemId: string,
		type: 'flag' | 'dealbreaker'
	) => void;
	createProfile: (name: string) => string;
	deleteProfile: (profileId: string) => boolean;
	renameProfile: (profileId: string, newName: string) => void;
}

// useProfileManager parameters type
export interface UseProfileManagerParams {
	dealbreaker: DealbreakerState;
	updateDealbreaker: (newState: DealbreakerState) => void;
	profiles: Profile[];
	setProfiles: (profiles: Profile[]) => void;
	currentProfileId: string;
	setCurrentProfileId: (id: string) => void;
}

// =============================================================================
// FORM/CREATE HOOKS
// =============================================================================

// useCreateProfile return type
export interface UseCreateProfileReturn {
	name: string;
	setName: (name: string) => void;
	error: CreateProfileErrorState;
	handleSubmit: () => void;
	handleNameChange: (text: string) => void;
	validate: () => boolean;
}

// useCreateFlag return type
export interface UseCreateFlagReturn {
	radioButtons: any[]; // RadioButtonProps[] - TODO: Import proper type
	title: string;
	description: string;
	error: CreateFlagErrorState;
	handleSubmit: () => void;
	handleTitleChange: (text: string) => void;
	handleDescriptionChange: (text: string) => void;
	selectedId: string;
	setSelectedId: (id: string) => void;
}

// =============================================================================
// BOARD MANAGEMENT HOOKS
// =============================================================================

// useConsoleManager return type
export interface UseConsoleManagerReturn {
	debugLog: (...args: any[]) => void;
	DEBUG_LOGGING: boolean;
}

// useModalStates return type (from boardManagement)
export interface UseModalStatesReturn {
	// Modal visibility states
	visible: boolean;
	deleteModalVisible: boolean;
	editModalVisible: boolean;
	editProfileModalVisible: boolean;
	dealbreakerAlertVisible: boolean;
	transitionReasonModalVisible: boolean;

	// Modal state setters
	setVisible: (visible: boolean) => void;
	setDeleteModalVisible: (visible: boolean) => void;
	setEditModalVisible: (visible: boolean) => void;
	setEditProfileModalVisible: (visible: boolean) => void;
	setDealbreakerAlertVisible: (visible: boolean) => void;
	setTransitionReasonModalVisible: (visible: boolean) => void;

	// Modal-related item states
	itemToDelete: any; // TODO: Replace with proper type
	setItemToDelete: (item: any) => void;
	itemToEdit: any; // TODO: Replace with proper type
	setItemToEdit: (item: any) => void;
	transitionedItem: any; // TODO: Replace with proper type
	setTransitionedItem: (item: any) => void;
}

// useBoardOperations return type
export interface UseBoardOperationsReturn {
	// Board state
	list: any; // BoardRepository | null - TODO: Import proper type
	setList: (list: any) => void;
	isRemount: boolean;
	setIsRemount: (isRemount: boolean) => void;
	refreshKey: number;
	setRefreshKey: (key: number) => void;

	// Board refs (exposed for external access)
	flagListIndexRef: React.MutableRefObject<Map<string, number>>;
	dealbreakerListIndexRef: React.MutableRefObject<Map<string, number>>;
	skipUpdateRef: React.MutableRefObject<boolean>;
	isMountRef: React.MutableRefObject<boolean>;

	// Board functions
	updateBoard: () => void;
	reloadBoard: () => void;
	cleanupDuplicates: () => void;
	logProfileFlags: (label: string) => void;
	ensureCurrentProfileExists: () => boolean;
}

// useItemOperations return type
export interface UseItemOperationsReturn {
	handleDeleteItem: (item: any) => void;
	confirmDeleteItem: () => void;
	handleEditItem: (item: any) => void;
	handleSaveEdit: (item: any) => void;
}

// useTransitions return type
export interface UseTransitionsReturn {
	pendingTransition: any; // PendingTransition | null - TODO: Import proper type
	setPendingTransition: (transition: any) => void;
	isDragOperationRef: React.MutableRefObject<boolean>;
	updateListOrder: (
		newIndex: number,
		oldIndex: number,
		id: string,
		isDealbreaker: boolean
	) => void;
	checkForDealbreakerTransition: (
		item: any,
		fromColumnId: number,
		toColumnId: number
	) => void;
	handleUndoTransition: () => void;
	handleTransitionReasonSubmit: (reason: string, attachments?: any[]) => void;
	handleTransitionReasonCancel: () => void;
	isItemOnMainDealbreakerList: (itemId: string) => boolean;
	getCurrentProfileName: () => string;
}

// useBoardManagement return type (the main board management hook)
export interface UseBoardManagementReturn {
	// Screen dimensions
	ScreenHeight: number;

	// State
	dealbreaker: DealbreakerState;
	currentProfileId: string;
	profiles: Profile[];
	user: any; // TODO: Replace with proper User type

	// Board operations
	list: any; // BoardRepository | null
	setList: (list: any) => void;
	isRemount: boolean;
	setIsRemount: (isRemount: boolean) => void;
	refreshKey: number;
	setRefreshKey: (key: number) => void;

	// Modal states
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

	// Flag context modals
	reasonModalVisible: boolean;
	additionalReasonModalVisible: boolean;
	historyModalVisible: boolean;
	transitionReasonModalVisible: boolean;
	setReasonModalVisible: (visible: boolean) => void;
	setHistoryModalVisible: (visible: boolean) => void;
	setAdditionalReasonModalVisible: (visible: boolean) => void;

	// Modal items
	itemToDelete: any;
	setItemToDelete: (item: any) => void;
	itemToEdit: any;
	setItemToEdit: (item: any) => void;
	transitionedItem: any;
	setTransitionedItem: (item: any) => void;
	pendingFlagChange: any;
	selectedFlag: any;
	pendingTransition: any;

	// Event handlers
	handleDeleteItem: (item: any) => void;
	handleEditItem: (item: any) => void;
	handleSaveEdit: (item: any) => void;
	handleSaveProfileEdit: (profileId: string, newName: string) => void;
	handleUndoTransition: () => void;
	handleCancelFlagChange: () => void;
	handleFlagChangeWithReason: (reason: string, attachments?: any[]) => void;
	handleAddAdditionalReason: (reason: string, attachments?: any[]) => void;
	handleOpenAddReasonModal: () => void;
	handleTransitionReasonCancel: () => void;
	handleTransitionReasonSubmit: (reason: string, attachments?: any[]) => void;
	handleViewFlagHistory: (item: any) => void;

	// Action functions
	confirmDeleteItem: () => void;
	updateListOrder: (
		newIndex: number,
		oldIndex: number,
		id: string,
		isDealbreaker: boolean
	) => void;
	updateBoard: () => void;
	cleanupDuplicates: () => void;

	// Utility functions
	getCurrentProfileName: () => string;
	debugModalState: () => void;
}

// =============================================================================
// LAYOUT/UI HOOKS
// =============================================================================

// useLayoutModals return type (already defined in modalModels.ts but re-exported here for convenience)
export interface UseLayoutModalsReturn {
	switchProfileModalVisible: boolean;
	setSwitchProfileModalVisible: (visible: boolean) => void;
	openSwitchProfileModal: () => void;
	closeSwitchProfileModal: () => void;
}

// =============================================================================
// HOOK PARAMETER INTERFACES (for complex parameter objects)
// =============================================================================

// Complex parameter objects that are passed to multiple hooks
export interface BoardHookParams {
	dealbreaker: DealbreakerState;
	currentProfileId: string;
	profiles: Profile[];
	ensureProfileExists: (profileId: string) => boolean;
	params: any; // Route params
	handleViewFlagHistory?: (item: any) => void;
}

export interface ItemOperationsParams {
	dealbreaker: any;
	currentProfileId: string;
	removeItemFromAllProfiles: (id: string, type: string) => void;
	setDealbreaker: (value: any) => void;
	updateBoard: () => void;
	setList: (value: any) => void;
	setIsRemount: (value: boolean) => void;
	setRefreshKey: (value: number) => void;
	// Modal state management
	itemToDelete: any;
	setItemToDelete: (item: any) => void;
	itemToEdit: any;
	setItemToEdit: (item: any) => void;
	setDeleteModalVisible: (visible: boolean) => void;
	setEditModalVisible: (visible: boolean) => void;
}

// =============================================================================
// HOOK COMPOSITION TYPES (for hooks that use other hooks)
// =============================================================================

// Types for hooks that compose multiple other hooks
export interface CompositeHookDependencies {
	modalStates: UseModalStatesReturn;
	boardOperations: UseBoardOperationsReturn;
	itemOperations: UseItemOperationsReturn;
	transitions: UseTransitionsReturn;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

// Type for debug/logging functions commonly used across hooks
export type DebugLogger = (...args: any[]) => void;

// Type for state setters commonly used in hooks
export type StateSetter<T> = (value: T | ((prev: T) => T)) => void;

// Type for async operations commonly used in hooks
export type AsyncOperation = () => Promise<void>;

// Type for validation functions used in form hooks
export type ValidationFunction = () => boolean;
