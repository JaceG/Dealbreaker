import Toast from 'react-native-toast-message';
import { Platform } from 'react-native';

// Type definitions
type ToastType = 'success' | 'error' | 'info';

interface AttachmentBase {
	type: string;
	url: string;
	name: string;
	timestamp: string;
}

interface ImageAttachment extends AttachmentBase {
	type: 'image';
}

interface VideoAttachment extends AttachmentBase {
	type: 'video';
}

interface AudioAttachment extends AttachmentBase {
	type: 'audio';
	duration: number;
}

// Show toast notification
export const showToast = (
	type: ToastType,
	text1: string,
	text2: string = ''
): void => {
	console.log(`Showing toast: ${type} - ${text1} - ${text2}`);
	Toast.show({
		type: type,
		text1: text1,
		text2: text2,
		position: 'bottom',
		visibilityTime: 3000,
		autoHide: true,
	});
};

// Format date to a more readable format
export const formatDate = (dateString: string | Date): string => {
	const date = new Date(dateString);
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
};

// Generate a thumbnail URI from an image URI
export const getThumbnailUri = (
	imageUri: string,
	size: number = 100
): string => {
	// For simplicity, we're just returning the original URI here
	// In a real implementation, you might use a library like react-native-image-resizer
	// or have the server generate thumbnails
	return imageUri;
};

// Image helper functions
export const imageUtils = {
	// This function helps with processing image attachments consistently
	prepareImageAttachment: (
		imageUri: string,
		fileName: string | null = null
	): ImageAttachment | null => {
		if (!imageUri) return null;

		// Create a filename if one wasn't provided
		const generatedFileName = fileName || `image_${Date.now()}.jpg`;

		return {
			type: 'image',
			url: imageUri,
			name: generatedFileName,
			timestamp: new Date().toISOString(),
			// Add any other properties needed for the backend
		};
	},

	// Helper function for processing video attachments
	prepareVideoAttachment: (
		videoUri: string,
		fileName: string | null = null
	): VideoAttachment | null => {
		if (!videoUri) return null;

		// Create a filename if one wasn't provided
		const generatedFileName = fileName || `video_${Date.now()}.mp4`;

		return {
			type: 'video',
			url: videoUri,
			name: generatedFileName,
			timestamp: new Date().toISOString(),
			// Add any other video-specific properties
		};
	},

	// Helper function for processing audio attachments
	prepareAudioAttachment: (
		audioUri: string,
		duration: number = 0,
		fileName: string | null = null
	): AudioAttachment | null => {
		if (!audioUri) return null;

		// Create a filename if one wasn't provided
		const generatedFileName = fileName || `audio_${Date.now()}.m4a`;

		return {
			type: 'audio',
			url: audioUri,
			name: generatedFileName,
			duration: duration, // Duration in seconds
			timestamp: new Date().toISOString(),
		};
	},

	// Helper for getting proper file extensions
	getFileExtensionFromUri: (uri: string): string => {
		if (!uri) return 'jpg';

		const parts = uri.split('.');
		return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'jpg';
	},

	// Get a proper mime type based on extension
	getMimeTypeFromUri: (uri: string): string => {
		const extension = imageUtils.getFileExtensionFromUri(uri);

		switch (extension) {
			case 'jpg':
			case 'jpeg':
				return 'image/jpeg';
			case 'png':
				return 'image/png';
			case 'gif':
				return 'image/gif';
			case 'heic':
				return 'image/heic';
			case 'mp4':
			case 'mov':
				return 'video/mp4';
			case 'm4a':
			case 'mp3':
			case 'aac':
				return 'audio/mp4';
			default:
				return 'application/octet-stream';
		}
	},

	// Format duration in seconds to MM:SS format
	formatDuration: (seconds: number): string => {
		if (!seconds) return '00:00';
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins.toString().padStart(2, '0')}:${secs
			.toString()
			.padStart(2, '0')}`;
	},
};
