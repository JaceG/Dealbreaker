// Import validation types from dataModels
import type {
	LoginErrorState,
	RegisterErrorState,
	ValidationResult,
} from './dataModels';

// Authentication Credentials
export interface LoginCredentials {
	email: string;
	password: string;
}

export interface RegisterData extends LoginCredentials {
	name: string;
}

// Re-export validation types for backward compatibility
export type {
	LoginErrorState,
	RegisterErrorState,
	ValidationResult,
} from './dataModels';

// User Data Types
export interface UserData {
	id: string;
	name: string;
	email: string;
	_id?: string; // MongoDB compatibility
	[key: string]: any; // For additional user fields
}

// Authentication State
export interface AuthState {
	isLoading: boolean;
	error: string | null;
	isAuthenticated: boolean;
	user?: UserData;
}

// Authentication Context Type (from app/login)
export interface AuthContextType {
	isLoading: boolean;
	error: string | null;
	user?: UserData;
	checkAuthStatus: () => Promise<void>;
	loginAuth: (userData: UserData, token: string) => void;
	clearAuth: () => void;
}

// Login Hook Return Type
export interface LoginHookReturn {
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
	handleSubmit: (isGuest?: boolean) => Promise<void>;
	handleTitlePress: () => void;
	login: (email: string, password: string, role?: string) => Promise<boolean>;

	// Loading state
	isLoading: boolean;
}

// Auth Actions Hook Return Type
export interface AuthActionsReturn {
	logout: () => Promise<void>;
	clearSecureStore: () => Promise<void>;
}

// Authentication API Response Types
export interface LoginApiResponse {
	token: string;
	message?: string;
	errors?: Array<{ msg: string }>;
}

export interface UserApiResponse extends UserData {
	// Additional fields that might come from the API
}

// Storage Types
export interface SecureStorageData {
	authToken?: string;
	userData?: string; // JSON stringified UserData
}

// Navigation Types for Auth
export interface AuthNavigationParams {
	returnUrl?: string;
	forceLogout?: boolean;
}
