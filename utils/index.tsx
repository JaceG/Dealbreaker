// Import utilities individually to avoid property configuration conflicts
// Avoiding problematic imports that cause case sensitivity issues
import * as functionsUtils from './functions';
import * as mongodbUtils from './mongodb';
import * as mongodbApiUtils from './mongodbapi';
import * as imagePickerUtils from './imagepicker';
import * as s3Utils from './s3';

// Import storage functions directly - THIS IS CRITICAL
import {
	setList,
	getList,
	setAtomicValue,
	getAtomicValue,
	clearStorage,
	setSecureItem,
	getSecureItem,
	deleteSecureItem,
} from './storage';

// Re-export them with namespaces to avoid conflicts
export const functions = functionsUtils;
export const mongodb = mongodbUtils;
export const mongodbApi = mongodbApiUtils;
export const imagePicker = imagePickerUtils;
export const s3 = s3Utils;

// Export storage functions directly - critical for app functionality
export {
	setList,
	getList,
	setAtomicValue,
	getAtomicValue,
	clearStorage,
	setSecureItem,
	getSecureItem,
	deleteSecureItem,
};

// Export directly from S3
export const { uploadToS3 } = s3Utils;

// Export functions utilities
export const { showToast } = functionsUtils;

// Export other needed functions
export const {
	pickImage,
	takePhoto,
	requestMediaLibraryPermissions,
	requestCameraPermissions,
} = imagePickerUtils;

// Export MongoDB functions
export const addFlagHistory = mongodbUtils.addFlagHistory;
export const syncPendingChanges = mongodbUtils.syncPendingChanges;
export const getFlagHistory = mongodbUtils.getFlagHistory;
