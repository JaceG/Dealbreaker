// Import only what we need for the simplified implementation
import * as FileSystem from 'expo-file-system';
import { API_BASE_URL } from '../constants/api';

// Set this to true to enable console logs for debugging
const DEBUG = true;

// Simple logging function
const log = (...args) => {
	if (DEBUG) {
		console.log('[S3]', ...args);
	}
};

// Get mime type from file extension
const getMimeType = (filename) => {
	const ext = filename.split('.').pop().toLowerCase();

	switch (ext) {
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'png':
			return 'image/png';
		case 'gif':
			return 'image/gif';
		case 'pdf':
			return 'application/pdf';
		default:
			return 'application/octet-stream';
	}
};

// Generate a unique filename
const getUniqueFilename = (fileUri) => {
	const timestamp = Math.floor(Date.now() / 1000);
	const random = Math.floor(Math.random() * 10000);

	// Get extension from original URI or default to jpg
	let extension = 'jpg';
	if (fileUri) {
		const parts = fileUri.split('.');
		if (parts.length > 1) {
			extension = parts.pop().split('?')[0].toLowerCase();
		}
	}

	return `image_${timestamp}_${random}.${extension}`;
};

// Upload a file to S3 via the backend API
export const uploadToS3 = async (fileUri, fileName) => {
	if (!fileUri) {
		log('Error: No file URI provided');
		console.error('[S3] Error: No file URI provided');
		return null;
	}

	console.log(`[S3] Starting upload for: ${fileUri.substring(0, 50)}...`);

	try {
		// Use provided filename or generate a unique one
		const finalFileName = fileName || getUniqueFilename(fileUri);
		console.log(`[S3] Using filename: ${finalFileName}`);

		// Handle remote URLs by downloading locally first
		let localFileUri = fileUri;
		if (fileUri.startsWith('http')) {
			console.log('[S3] Remote URL detected, downloading locally first');
			try {
				const downloadResult = await FileSystem.downloadAsync(
					fileUri,
					FileSystem.cacheDirectory + finalFileName
				);
				localFileUri = downloadResult.uri;
				console.log(`[S3] Downloaded to: ${localFileUri}`);
			} catch (error) {
				console.error('[S3] Failed to download remote file:', error);
				return null;
			}
		}

		// Verify file exists
		const fileInfo = await FileSystem.getInfoAsync(localFileUri);
		if (!fileInfo.exists) {
			console.error(`[S3] File does not exist at: ${localFileUri}`);
			return null;
		}
		console.log(`[S3] File exists, size: ${fileInfo.size} bytes`);

		// Determine content type based on file extension
		const contentType = getMimeType(finalFileName);
		console.log(`[S3] Content type: ${contentType}`);

		// Create the form data for the API request
		const formData = new FormData();
		formData.append('file', {
			uri: localFileUri,
			name: finalFileName,
			type: contentType,
		});

		// Get the backend URL based on platform and environment - use the direct endpoint
		const backendUrl = API_BASE_URL + '/upload/direct';

		console.log(`[S3] Uploading to backend at: ${backendUrl}`);

		// Make the API request
		const response = await fetch(backendUrl, {
			method: 'POST',
			body: formData,
			headers: {
				'Content-Type': 'multipart/form-data',
			},
		});

		// Get the response text for logging
		const responseText = await response.text();
		console.log(`[S3] API response: ${responseText}`);

		// Check if request was successful
		if (response.ok) {
			try {
				// Parse the JSON response
				const result = JSON.parse(responseText);
				if (result.url) {
					console.log(`[S3] Upload successful! URL: ${result.url}`);
					return result.url;
				} else {
					console.error('[S3] API returned success but no URL');
				}
			} catch (jsonError) {
				console.error('[S3] Error parsing API response:', jsonError);
			}
		} else {
			console.error(`[S3] API returned error: ${response.status}`);
		}

		// If we reach here, the upload failed
		console.error('[S3] Upload failed');
		return null;
	} catch (error) {
		console.error('[S3] Error during upload process:', error);
		return null;
	}
};
