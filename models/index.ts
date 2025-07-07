// =============================================================================
// DEALBREAKER V3 - MASTER TYPE INDEX
// =============================================================================
// This file provides centralized access to all types across the application.
// Import any type from a single location: import { TypeName } from '@/models'

// =============================================================================
// AUTHENTICATION & USER TYPES
// =============================================================================
export type {
	// Credentials & Registration
	LoginCredentials,
	RegisterData,

	// User Data
	UserData,
	AuthState,
	AuthContextType,

	// Authentication API Responses
	LoginApiResponse,
	UserApiResponse,

	// Hook Return Types
	LoginHookReturn,
	AuthActionsReturn,

	// Storage & Navigation
	SecureStorageData,
	AuthNavigationParams,

	// Validation (from dataModels)
	LoginErrorState,
	RegisterErrorState,
	ValidationResult,
} from './authModels';

// =============================================================================
// CORE DATA & BUSINESS LOGIC TYPES
// =============================================================================
export type {
	// Core Business Models
	FlagItem,
	Profile,
	ProfileData,
	DealbreakerState,
	ProfileSettings,

	// Validation & Forms
	ValidationError,
	ValidationResult as DataValidationResult,
	FormErrorState,
	CreateProfileErrorState,
	CreateFlagErrorState,

	// File & Attachment Management
	FileType,
	ImageFormat,
	VideoFormat,
	AudioFormat,
	FileMetadata,
	Attachment,

	// History & Timeline
	HistoryActionType,
	HistoryEntry,
	TimelineGroup,

	// Search & Filtering
	SearchCriteria,
	SortConfig,
	FilterConfig,
	SearchResult,

	// Notifications
	NotificationType,
	Notification,
	ToastNotification,

	// Settings & Configuration
	AppSettings,
	NotificationSettings,
	SyncSettings,
	DisplaySettings,
	PrivacySettings,

	// Statistics & Analytics
	UsageStats,
	ActivitySummary,

	// Import/Export
	ExportFormat,
	ExportConfig,
	ImportResult,

	// Feature Flags
	FeatureFlag,
	ExperimentalFeatures,

	// Utility Types
	KeyValuePair,
	SelectOption,
	Coordinate,
	Dimensions,
	Rectangle,
	ColorValue,

	// State Machine Types
	StateMachineState,
	StateMachineEvent,
	StateTransition,
} from './dataModels';

// =============================================================================
// API & NETWORK TYPES
// =============================================================================
export type {
	// Configuration
	ApiConfig,
	PlatformApiUrls,

	// Generic API Patterns
	BaseApiResponse,
	ApiErrorResponse,
	PaginatedApiResponse,

	// Flag History API
	FlagHistoryEntry,
	FlagHistoryAttachment,
	AddFlagHistoryRequest,
	AddFlagHistoryResponse,
	GetFlagHistoryRequest,
	GetFlagHistoryResponse,

	// User Data API
	ApiUserData,
	UserDataResponse,
	UserProfile as ApiUserProfile,
	UserFlagsData,
	FetchUserDataRequest,
	FetchUserDataResponse,

	// Sync API
	PendingChange,
	SyncRequest,
	SyncResponse,

	// Attachment API
	AddAttachmentRequest,
	AddAttachmentResponse,

	// Dealbreaker API
	FlagItem as ApiFlagItem, // Re-export for API context
	DealbreakerApiData,
	AddDealbreakersRequest,
	AddDealbreakersResponse,
	GetDealbreakersRequest,
	GetDealbreakersResponse,

	// Error Types
	NetworkError,
	ServerError,
	ValidationError as ApiValidationError,
	AuthError,
	ApiError,

	// Utility Types
	HttpMethod,
	ApiRequestConfig,
	ApiResult,
	ApiOperation,
	ApiClient,

	// Offline/Cache
	CacheEntry,
	CacheKey,
	StorageAdapter,
} from './apiModels';

// Export API endpoints constant
export { API_ENDPOINTS } from './apiModels';

// =============================================================================
// BOARD MANAGEMENT TYPES
// =============================================================================
export type {
	// Core board types (re-exported from dataModels)
	FlagItem as BoardFlagItem,
	ProfileData as BoardProfileData,
	DealbreakerState as BoardDealbreakerState,
	Profile as BoardProfile,

	// Component Props
	AppButtonProps,

	// Board-specific Types
	PendingTransition,
} from './boardManagementModel';

// Export board data constant
export { data as boardData } from './boardManagementModel';

// =============================================================================
// MODAL & UI COMPONENT TYPES
// =============================================================================
export type {
	// Base Modal Interface
	BaseModalProps,

	// Specific Modal Props
	SwitchProfileModalProps,
	ConfirmationModalProps,
	EditItemModalProps,
	EditProfileModalProps,
	DealbreakerAlertProps,
	FlagHistoryModalProps,
	ReasonInputModalProps,
	ImagePreviewModalProps,

	// Enhanced Modal Props
	EnhancedReasonInputModalProps,

	// Modal State Management
	ModalVisibilityState,
	ModalVisibilityActions,
	ModalState,
	LayoutModalsReturn,
	BoardModalStates,
	ModalHookState,
	ModalManagerReturn,
	ModalWithData,

	// Attachment (imported from dataModels)
	ModalAttachment,

	// Modal Context & Animation
	ModalContextValue,
	ModalAnimationType,
	AnimatedModalProps,

	// Board Management Modal Props
	BoardManagementModalsProps,

	// Legacy Re-exports (for backward compatibility)
	SwitchProfileModalPropsLegacy,
	ConfirmationModalPropsLegacy,
	EditItemModalPropsLegacy,
	EditProfileModalPropsLegacy,
	DealbreakerAlertPropsLegacy,
	FlagHistoryModalPropsLegacy,
	ReasonInputModalPropsLegacy,
} from './modalModels';

// =============================================================================
// HOOK TYPES
// =============================================================================
export type {
	// Generic Hook Patterns
	AsyncHookReturn,
	StateHookReturn,
	ModalHookReturn,

	// Authentication Hooks
	UseAuthActionsReturn,
	UseLoginReturn,
	UseRegisterReturn,

	// Data Management Hooks
	UseDataLoaderReturn,
	UseDataLoaderParams,
	UseNetworkSyncReturn,
	UseNetworkSyncParams,
	UseDealbreakerSyncReturn,

	// Profile Management
	UseProfileManagerReturn,
	UseProfileManagerParams,

	// Form/Create Hooks
	UseCreateProfileReturn,
	UseCreateFlagReturn,

	// Board Management Hooks
	UseConsoleManagerReturn,
	UseModalStatesReturn,
	UseBoardOperationsReturn,
	UseItemOperationsReturn,
	UseTransitionsReturn,
	UseBoardManagementReturn,

	// Layout/UI Hooks
	UseLayoutModalsReturn,

	// Hook Parameters & Composition
	BoardHookParams,
	ItemOperationsParams,
	CompositeHookDependencies,

	// Utility Hook Types
	DebugLogger,
	StateSetter,
	AsyncOperation,
	ValidationFunction,
} from './hookModels';

// =============================================================================
// CONVENIENCE TYPE CATEGORIES (for documentation and IDE intellisense)
// =============================================================================

// Authentication-related types are available from authModels
// Form-related types are available from dataModels
// API-related types are available from apiModels
// Modal-related types are available from modalModels
// Hook-related types are available from hookModels

// =============================================================================
// TYPE UTILITIES & HELPERS
// =============================================================================

// Helper type to extract the data type from an API response
// Note: Import BaseApiResponse from apiModels to use this utility
export type ExtractApiData<T> = T extends { success: boolean; data?: infer U }
	? U
	: never;

// Helper type to extract the return type from a hook
export type ExtractHookReturn<T> = T extends (...args: any[]) => infer R
	? R
	: never;

// Helper type for partial updates (useful for state management)
export type PartialUpdate<T> = {
	[K in keyof T]?: T[K] extends object ? PartialUpdate<T[K]> : T[K];
};

// Helper type for required fields
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Helper type for optional fields
export type OptionalFields<T, K extends keyof T> = Omit<T, K> &
	Partial<Pick<T, K>>;

// =============================================================================
// RE-EXPORTS FOR BACKWARD COMPATIBILITY
// =============================================================================

// These ensure that existing imports continue to work
export type {
	// Legacy names that might be used in the codebase
	FlagItem as Flag,
	Profile as UserProfile,
	DealbreakerState as AppState,
	Attachment as FileAttachment,
	HistoryEntry as FlagHistoryItem,
} from './dataModels';

// =============================================================================
// VERSION & METADATA
// =============================================================================

// Type system version (increment when making breaking changes)
export const TYPE_SYSTEM_VERSION = '1.0.0';

// Metadata about the type system
export const TYPE_METADATA = {
	version: TYPE_SYSTEM_VERSION,
	totalTypes: 150, // Approximate count - update when adding/removing types
	categories: [
		'authentication',
		'data',
		'api',
		'modals',
		'hooks',
		'utilities',
	],
	lastUpdated: '2024-01-XX', // Update when making significant changes
} as const;

// Simplified attachment system interfaces (for component usage)
export type SimpleAttachmentType = 'image' | 'video' | 'audio';

export interface SimpleAttachment {
	type: SimpleAttachmentType;
	url: string;
	name: string;
	timestamp: string;
	duration?: number; // Duration in seconds (for audio/video)
	needsProcessing?: boolean; // For image processing
}

// Media picker result interfaces
export interface MediaPickerAsset {
	uri: string;
	type?: string;
	fileName?: string;
	fileSize?: number;
	width?: number;
	height?: number;
	duration?: number;
}

export interface MediaPickerResult {
	canceled: boolean;
	assets?: MediaPickerAsset[];
}

// Audio recording interfaces
export type RecordingStatus = 'idle' | 'recording' | 'saving';

export interface AudioRecordingState {
	recording: any; // expo-av Recording instance
	status: RecordingStatus;
	duration: number; // Duration in seconds
	permission: boolean;
}

export interface AudioPlaybackState {
	sound: any; // expo-av Sound instance
	isPlaying: boolean;
	position: number; // Current position in seconds
	playingAttachmentId: string | null;
}

// Form submission interfaces
export interface ReasonSubmission {
	reason: string;
	attachments: SimpleAttachment[];
}

// Utility function return types
export interface PreparedAttachment {
	type: SimpleAttachmentType;
	url: string;
	name: string;
	timestamp: string;
	duration?: number;
	needsProcessing?: boolean;
}

// Image utilities interface
export interface ImageUtils {
	prepareImageAttachment: (
		imageUri: string,
		fileName?: string | null
	) => SimpleAttachment | null;
	prepareVideoAttachment: (
		videoUri: string,
		fileName?: string | null
	) => SimpleAttachment | null;
	prepareAudioAttachment: (
		audioUri: string,
		duration?: number,
		fileName?: string | null
	) => SimpleAttachment | null;
	getFileExtensionFromUri: (uri: string) => string;
	getMimeTypeFromUri: (uri: string) => string;
	formatDuration: (seconds: number) => string;
}

// Mock attachment creation
export interface MockAttachmentOptions {
	count?: number;
	type: SimpleAttachmentType;
	includeVariations?: boolean;
}

// Component state interfaces for ReasonInputModal
export interface ReasonInputModalState {
	reason: string;
	attachments: SimpleAttachment[];
	isPickerAvailable: boolean;
	isSubmitting: boolean;
	audioRecording: AudioRecordingState;
	audioPlayback: AudioPlaybackState;
}
