import React, { useState, useEffect, useRef } from 'react';
import {
	Modal,
	View,
	StyleSheet,
	TextInput,
	Text,
	TouchableOpacity,
	Image,
	ScrollView,
	Platform,
	Alert,
	ActivityIndicator,
} from 'react-native';
import { showToast, uploadToS3 } from '../../utils';
import { imageUtils } from '../../utils/functions';
import { colors } from '../../libs/board/constants';

// Feature flags to disable native modules
const AUDIO_ENABLED = false;
const IMAGE_PICKER_ENABLED = true;
const MOCK_AUDIO_ENABLED = true; // Enable mock audio without using native modules
// Set to false to disable debug logs
const DEBUG_LOGGING = false;

// Helper to prevent excessive logging
const debugLog = (...args) => {
	if (DEBUG_LOGGING) {
		console.log(...args);
	}
};

// Conditionally import modules only if enabled
let Audio = null;
let ImagePicker = null;

// Try to load modules only if enabled
if (AUDIO_ENABLED) {
	try {
		Audio = require('expo-av').Audio;
		console.log('Audio module loaded successfully');
	} catch (error) {
		console.log('Audio module not available:', error.message);
	}
}

if (IMAGE_PICKER_ENABLED) {
	try {
		ImagePicker = require('expo-image-picker');
		console.log('ImagePicker module loaded successfully');
	} catch (error) {
		console.log('ImagePicker module not available:', error.message);
	}
}

const ReasonInputModal = ({
	visible,
	onClose,
	onSubmit,
	flagTitle,
	prevStatus,
	newStatus,
	modalTitle,
}) => {
	const [reason, setReason] = useState('');
	const [attachments, setAttachments] = useState([]);
	const [isPickerAvailable, setIsPickerAvailable] = useState(true);

	// Audio recording states - only used if Audio is available
	const [recording, setRecording] = useState(null);
	const [recordingStatus, setRecordingStatus] = useState('idle');
	const [recordingDuration, setRecordingDuration] = useState(0);
	const [audioPermission, setAudioPermission] = useState(false);
	const recordingInterval = useRef(null);

	// Audio playback states - only used if Audio is available
	const [sound, setSound] = useState(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [playbackPosition, setPlaybackPosition] = useState(0);
	const [playingAttachmentId, setPlayingAttachmentId] = useState(null);

	// Add state to track submission progress
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		// Check if the image picker is available
		checkImagePickerAvailability();

		// Check audio recording permissions only if Audio is enabled
		if (AUDIO_ENABLED) {
			checkAudioPermissions();
		}

		debugLog('ReasonInputModal visibility changed:', visible);
		debugLog('Modal props:', {
			flagTitle,
			prevStatus,
			newStatus,
			modalType: modalTitle ? 'Additional Context' : 'Flag Change',
		});

		// IMPORTANT: Only reset form when modal is opened
		if (visible) {
			debugLog(
				'🔴 MODAL SHOULD BE VISIBLE NOW - flagTitle:',
				flagTitle,
				'prevStatus:',
				prevStatus,
				'newStatus:',
				newStatus
			);
			setReason('');
			setAttachments([]);
		}

		// Log simulator information in dev mode
		if (__DEV__) {
			debugLog('Running in development/simulator mode');
			debugLog('Platform:', Platform.OS);
			debugLog('IsPickerAvailable state:', isPickerAvailable);
			debugLog('Audio enabled:', AUDIO_ENABLED);
		}

		// Cleanup audio recording and playback on unmount
		return () => {
			if (AUDIO_ENABLED) {
				stopRecording();
				stopPlayback();
			}
		};
	}, [visible]);

	// Function to check if image picker is available - always use mock in dev mode
	const checkImagePickerAvailability = async () => {
		if (!IMAGE_PICKER_ENABLED || !ImagePicker) {
			debugLog('Image picker is disabled or not available');
			setIsPickerAvailable(false);
			return false;
		}

		try {
			// Check media library permission status
			const permissionResult =
				await ImagePicker.getMediaLibraryPermissionsAsync();

			// If permission is granted, set picker as available
			if (permissionResult.granted) {
				debugLog('Media library permission granted');
				setIsPickerAvailable(true);
				return true;
			}

			// If permission is not determined, ask for it
			if (permissionResult.canAskAgain && !permissionResult.granted) {
				debugLog('Requesting media library permission');
				const requestResult =
					await ImagePicker.requestMediaLibraryPermissionsAsync();

				setIsPickerAvailable(requestResult.granted);
				return requestResult.granted;
			}

			// Permission permanently denied
			if (!permissionResult.canAskAgain && !permissionResult.granted) {
				debugLog('Media library permission permanently denied');
				setIsPickerAvailable(false);
				return false;
			}
		} catch (error) {
			debugLog('Error checking media library permissions:', error);
			setIsPickerAvailable(false);
			return false;
		}

		// For now, default to true in case permission check fails
		setIsPickerAvailable(true);
		return true;
	};

	// Function to check audio recording permissions - only if Audio is available
	const checkAudioPermissions = async () => {
		if (!AUDIO_ENABLED || !Audio) return false;

		try {
			const { status } = await Audio.requestPermissionsAsync();
			setAudioPermission(status === 'granted');

			if (status !== 'granted') {
				debugLog('Audio recording permission not granted');
				return false;
			} else {
				debugLog('Audio recording permission granted');
				await Audio.setAudioModeAsync({
					allowsRecordingIOS: true,
					playsInSilentModeIOS: true,
					staysActiveInBackground: false,
					shouldDuckAndroid: true,
					playThroughEarpieceAndroid: false,
				});
				return true;
			}
		} catch (error) {
			debugLog('Error checking audio permissions:', error);
			setAudioPermission(false);
			return false;
		}
	};

	// Other audio-related functions are now conditionally called only if AUDIO_ENABLED is true
	// ... keep other audio functions but wrap critical parts with if (!AUDIO_ENABLED || !Audio) return;

	const handleSubmit = async () => {
		try {
			// Set submitting state to show loading if needed
			setIsSubmitting(true);
			console.log(
				'SUBMIT: ReasonInputModal handleSubmit called with reason:',
				reason
			);
			console.log('SUBMIT: Attachments count:', attachments.length);

			// Process attachments to upload images to S3
			const processedAttachments = [];

			// Upload any image attachments to S3
			for (let i = 0; i < attachments.length; i++) {
				const attachment = attachments[i];
				console.log(
					`SUBMIT: Processing attachment ${i}, type: ${
						attachment.type
					}, URL: ${attachment.url.substring(0, 50)}...`
				);

				if (attachment.type === 'image') {
					console.log(
						`SUBMIT: Uploading image attachment ${i} to S3...`
					);
					try {
						// Generate a unique filename
						const timestamp = Date.now();
						const filename = `attachment_${timestamp}_${i}${
							attachment.url.endsWith('.png') ? '.png' : '.jpg'
						}`;

						// Log details about the upload attempt
						console.log(
							`SUBMIT: Starting S3 upload for ${filename} from ${attachment.url.substring(
								0,
								50
							)}...`
						);

						// Upload the image to S3
						console.log('SUBMIT: Calling uploadToS3 function');
						const s3Url = await uploadToS3(
							attachment.url,
							filename
						);
						console.log('SUBMIT: uploadToS3 returned:', s3Url);

						if (s3Url) {
							// Add the processed attachment with S3 URL
							console.log(
								`SUBMIT: S3 upload successful, URL: ${s3Url}`
							);
							processedAttachments.push({
								type: attachment.type,
								url: s3Url,
								name: attachment.name || filename,
								timestamp: new Date().toISOString(),
								isS3: true,
							});
							console.log(
								`SUBMIT: Successfully added S3 attachment to processedAttachments list`
							);
						} else {
							console.error(
								`SUBMIT: S3 Upload Failed: No URL returned for ${filename}`
							);
							// Show a toast notification about the upload failure
							showToast(
								'error',
								'Upload failed',
								'Could not upload image to cloud storage'
							);

							// Fall back to using the original URL if S3 upload fails
							console.log(
								`SUBMIT: Falling back to original URL due to S3 failure`
							);
							processedAttachments.push({
								...attachment,
								errorInfo: 'S3 upload failed - no URL returned',
							});
						}
					} catch (error) {
						console.error(
							`SUBMIT: Error uploading attachment ${i} to S3:`,
							error
						);
						showToast(
							'error',
							'Upload failed',
							`Error: ${error.message || 'Unknown error'}`
						);

						// Fall back to using the original URL with error info
						console.log(
							`SUBMIT: Falling back to original URL due to error: ${error.message}`
						);
						processedAttachments.push({
							...attachment,
							errorInfo: `S3 upload error: ${
								error.message || 'Unknown error'
							}`,
						});
					}
				} else {
					// For non-image attachments, just pass them through
					console.log(
						`SUBMIT: Adding non-image attachment directly to list`
					);
					processedAttachments.push(attachment);
				}
			}

			console.log(
				`SUBMIT: All attachments processed. Final count: ${processedAttachments.length}`
			);

			// Call the onSubmit callback with the processed attachments
			console.log(
				'SUBMIT: Calling onSubmit callback with processed attachments'
			);
			onSubmit(reason, processedAttachments);

			// Clear form
			setReason(''); // Clear after submission
			setAttachments([]); // Clear attachments
			console.log('SUBMIT: Form cleared after submission');
		} catch (error) {
			console.error('SUBMIT: Error in handleSubmit:', error);
			Alert.alert(
				'Error',
				'There was a problem submitting your reason. Please try again.'
			);
		} finally {
			setIsSubmitting(false);
			console.log('SUBMIT: Submission process completed');
		}
	};

	// Mock media picker - for use when real ImagePicker isn't available
	const useMockMediaPicker = () => {
		// Ask user to select number and type of mock media
		Alert.alert('Simulator Mode', 'What would you like to add?', [
			{ text: 'Cancel', style: 'cancel' },
			{ text: 'Images', onPress: () => showImageOptions() },
			{ text: 'Videos', onPress: () => showVideoOptions() },
			// Show mock audio option if enabled
			...(MOCK_AUDIO_ENABLED
				? [{ text: 'Audio', onPress: () => addMockAudio() }]
				: []),
			{ text: 'Mixed Media', onPress: () => showMixedOptions() },
		]);
	};

	// Always use the mock picker since native modules aren't available
	const pickMedia = async () => {
		debugLog('Opening media picker...');
		console.log('MEDIA PICKER: Attempting to open image picker');

		if (IMAGE_PICKER_ENABLED && ImagePicker) {
			try {
				console.log(
					'MEDIA PICKER: ImagePicker is enabled and available'
				);
				// Request permission first
				const permissionResult =
					await ImagePicker.requestMediaLibraryPermissionsAsync();

				console.log(
					'MEDIA PICKER: Permission result:',
					permissionResult
				);

				if (permissionResult.granted === false) {
					console.log('MEDIA PICKER: Permission denied');
					showToast(
						'error',
						'Permission to access media library was denied'
					);
					return;
				}

				console.log('MEDIA PICKER: Launching image library picker');
				// Launch image picker
				const result = await ImagePicker.launchImageLibraryAsync({
					mediaTypes: ImagePicker.MediaTypeOptions.All,
					allowsMultipleSelection: true,
					aspect: [4, 3],
					quality: 0.8,
				});

				console.log(
					'MEDIA PICKER: Got result:',
					JSON.stringify(result, null, 2)
				);

				if (
					!result.canceled &&
					result.assets &&
					result.assets.length > 0
				) {
					console.log(
						'MEDIA PICKER: User selected',
						result.assets.length,
						'assets'
					);
					const newAttachments = [...attachments];

					for (const asset of result.assets) {
						console.log(
							'MEDIA PICKER: Processing asset:',
							asset.uri
						);
						const type =
							asset.uri.endsWith('.mp4') || asset.type === 'video'
								? 'video'
								: 'image';

						// Add to attachments with the local URI first for display
						newAttachments.push({
							type: type,
							url: asset.uri,
							name: `media-${Date.now()}-${
								newAttachments.length
							}.${type === 'video' ? 'mp4' : 'jpg'}`,
							timestamp: new Date().toISOString(),
							needsProcessing: type === 'image' ? true : false,
						});
					}

					console.log(
						'MEDIA PICKER: Setting attachments with',
						newAttachments.length,
						'items'
					);
					setAttachments(newAttachments);
					showToast(
						'success',
						`Added ${result.assets.length} ${
							result.assets.length === 1 ? 'item' : 'items'
						}`
					);
				} else {
					console.log(
						'MEDIA PICKER: User cancelled or no assets selected'
					);
				}
			} catch (error) {
				console.error('MEDIA PICKER: Error using ImagePicker:', error);
				// Fall back to mock picker if something goes wrong
				useMockMediaPicker();
			}
		} else {
			console.log('MEDIA PICKER: ImagePicker not available, using mock');
			debugLog('Using mock media picker as fallback...');
			useMockMediaPicker();
		}
	};

	const showImageOptions = () => {
		Alert.alert(
			'Sample Images',
			'How many sample images would you like to add?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{ text: '1 Image', onPress: () => addMockImages(1) },
				{ text: '3 Images', onPress: () => addMockImages(3) },
			]
		);
	};

	const showVideoOptions = () => {
		Alert.alert(
			'Sample Videos',
			'How many sample videos would you like to add?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{ text: '1 Video', onPress: () => addMockVideos(1) },
				{ text: '2 Videos', onPress: () => addMockVideos(2) },
			]
		);
	};

	const showMixedOptions = () => {
		addMockImages(1);
		addMockVideos(1);
		if (MOCK_AUDIO_ENABLED) {
			addMockAudio();
		}
	};

	// Add mock images in simulator mode
	const addMockImages = (count) => {
		try {
			// Sample image URLs that work in simulators
			const sampleImages = [
				'https://reactnative.dev/img/tiny_logo.png',
				'https://picsum.photos/200/300',
				'https://picsum.photos/200',
				'https://picsum.photos/200/300?grayscale',
				'https://picsum.photos/id/237/200/300',
			];

			const newAttachments = [...attachments];
			for (let i = 0; i < count; i++) {
				const randomIndex = Math.floor(
					Math.random() * sampleImages.length
				);
				newAttachments.push({
					type: 'image',
					url: sampleImages[randomIndex],
					name: `sample-image-${Date.now()}-${i}.jpg`,
					timestamp: new Date().toISOString(),
				});
			}

			setAttachments(newAttachments);
			showToast(
				'success',
				`Added ${count} sample ${count === 1 ? 'image' : 'images'}`
			);
		} catch (error) {
			debugLog('Error adding mock images:', error);
		}
	};

	// Add mock videos in simulator mode
	const addMockVideos = (count) => {
		try {
			// Sample video URLs that work in simulators
			const sampleVideos = [
				'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4',
				'https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4',
				'https://assets.mixkit.co/videos/preview/mixkit-countryside-meadow-4075-large.mp4',
			];

			const newAttachments = [...attachments];
			for (let i = 0; i < count; i++) {
				const randomIndex = Math.floor(
					Math.random() * sampleVideos.length
				);
				newAttachments.push({
					type: 'video',
					url: sampleVideos[randomIndex],
					name: `sample-video-${Date.now()}-${i}.mp4`,
					timestamp: new Date().toISOString(),
					duration: Math.floor(Math.random() * 60) + 10, // Random duration between 10-70 seconds
				});
			}

			setAttachments(newAttachments);
			showToast(
				'success',
				`Added ${count} sample ${count === 1 ? 'video' : 'videos'}`
			);
		} catch (error) {
			debugLog('Error adding mock videos:', error);
		}
	};

	// Add mock audio in simulator mode
	const addMockAudio = () => {
		try {
			// Sample durations between 5-45 seconds
			const duration = Math.floor(Math.random() * 40) + 5;

			// Create mock audio attachment (no real URI in simulator)
			const attachment = {
				type: 'audio',
				// Use a remote audio file that actually works in simulator
				url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
				name: `sample-audio-${Date.now()}.mp3`,
				duration: duration,
				timestamp: new Date().toISOString(),
			};

			setAttachments((prev) => [...prev, attachment]);
			showToast('success', 'Sample voice memo added');
		} catch (error) {
			debugLog('Error adding mock audio:', error);
		}
	};

	// Function to cancel recording and discard it
	const cancelRecording = async () => {
		try {
			if (recording) {
				await recording.stopAndUnloadAsync();
			}

			if (recordingInterval.current) {
				clearInterval(recordingInterval.current);
				recordingInterval.current = null;
			}

			setRecording(null);
			setRecordingStatus('idle');
			setRecordingDuration(0);

			showToast('info', 'Recording discarded');
		} catch (error) {
			debugLog('Error cancelling recording:', error);
		}
	};

	// Start recording audio
	const startRecording = async () => {
		if (!AUDIO_ENABLED || !Audio) return;

		try {
			// Check permissions first
			if (!audioPermission) {
				const { status } = await Audio.requestPermissionsAsync();
				if (status !== 'granted') {
					Alert.alert(
						'Permission Required',
						'Audio recording requires microphone permission'
					);
					return;
				}
				setAudioPermission(true);
			}

			// Stop any playing sounds
			await stopPlayback();

			// Create new recording object
			const { recording: newRecording } =
				await Audio.Recording.createAsync(
					Audio.RecordingOptionsPresets.HIGH_QUALITY
				);

			setRecording(newRecording);
			setRecordingStatus('recording');
			setRecordingDuration(0);

			// Set up timer to track duration
			recordingInterval.current = setInterval(() => {
				setRecordingDuration((prev) => prev + 1);
			}, 1000);

			showToast('info', 'Recording started');
		} catch (error) {
			debugLog('Failed to start recording:', error);
			Alert.alert('Error', 'Failed to start recording');
		}
	};

	// Stop recording audio
	const stopRecording = async () => {
		if (!AUDIO_ENABLED || !Audio) return;

		try {
			if (!recording) return;

			// Clear recording timer
			if (recordingInterval.current) {
				clearInterval(recordingInterval.current);
				recordingInterval.current = null;
			}

			setRecordingStatus('saving');

			await recording.stopAndUnloadAsync();
			const uri = recording.getURI();
			const finalDuration = recordingDuration;

			debugLog('Recording stopped, URI:', uri);

			// Create audio attachment
			if (uri) {
				const attachment = imageUtils.prepareAudioAttachment(
					uri,
					finalDuration,
					`voice-memo-${Date.now()}.m4a`
				);

				if (attachment) {
					setAttachments((prev) => [...prev, attachment]);
					showToast('success', 'Voice memo saved');
				}
			}

			setRecording(null);
			setRecordingStatus('idle');
			setRecordingDuration(0);
		} catch (error) {
			debugLog('Failed to stop recording:', error);
			Alert.alert('Error', 'Failed to save recording');
			setRecordingStatus('idle');
			setRecording(null);
		}
	};

	// Play audio attachment
	const playAudio = async (attachmentId, uri) => {
		if (!AUDIO_ENABLED || !Audio) return;

		try {
			// Stop current playback if any
			await stopPlayback();

			debugLog('Loading sound from URI:', uri);
			const { sound: newSound } = await Audio.Sound.createAsync(
				{ uri },
				{ shouldPlay: true },
				onPlaybackStatusUpdate
			);

			setSound(newSound);
			setIsPlaying(true);
			setPlayingAttachmentId(attachmentId);

			// Play the sound
			await newSound.playAsync();
		} catch (error) {
			debugLog('Failed to play audio:', error);
			setIsPlaying(false);
			setPlayingAttachmentId(null);
			Alert.alert('Error', 'Failed to play audio');
		}
	};

	// Stop audio playback
	const stopPlayback = async () => {
		if (!AUDIO_ENABLED || !Audio) return;

		if (sound) {
			try {
				await sound.stopAsync();
				await sound.unloadAsync();
			} catch (error) {
				debugLog('Error stopping sound:', error);
			}
		}

		setSound(null);
		setIsPlaying(false);
		setPlaybackPosition(0);
		setPlayingAttachmentId(null);
	};

	// Track playback status
	const onPlaybackStatusUpdate = (status) => {
		if (status.isLoaded) {
			setPlaybackPosition(status.positionMillis / 1000);

			if (status.didJustFinish) {
				// Playback finished
				stopPlayback();
			}
		}
	};

	const removeAttachment = (index) => {
		const newAttachments = [...attachments];
		newAttachments.splice(index, 1);
		setAttachments(newAttachments);
	};

	const getStatusText = (status) => {
		switch (status) {
			case 'white':
				return 'WHITE';
			case 'yellow':
				return 'YELLOW';
			case 'red':
				return 'RED';
			case 'dealbreaker':
				return 'DEALBREAKER';
			default:
				return status.toUpperCase();
		}
	};

	const getStatusColor = (status) => {
		switch (status) {
			case 'white':
				return '#f0f0f0';
			case 'yellow':
				return '#FFD700';
			case 'red':
				return '#FF0000';
			case 'dealbreaker':
				return '#FF0000'; // Using red for dealbreaker
			default:
				return '#cccccc';
		}
	};

	return (
		<Modal
			animationType='slide'
			transparent={true}
			visible={visible}
			statusBarTranslucent={true}
			hardwareAccelerated={true}
			presentationStyle='overFullScreen'
			onRequestClose={() => onClose()}>
			<View
				style={[
					styles.modalOverlay,
					{ display: visible ? 'flex' : 'none' },
				]}>
				<View style={styles.modalContent}>
					<View style={styles.header}>
						<Text style={styles.title}>
							{modalTitle || 'Change Reason'}
						</Text>
					</View>

					<ScrollView style={styles.body}>
						<Text style={styles.flagTitle}>{flagTitle}</Text>

						<View style={styles.statusChange}>
							<View
								style={[
									styles.statusBadge,
									{
										backgroundColor:
											getStatusColor(prevStatus),
									},
								]}>
								<Text style={styles.statusText}>
									{getStatusText(prevStatus)}
								</Text>
							</View>
							{prevStatus !== newStatus && (
								<>
									<Text style={styles.arrow}>→</Text>
									<View
										style={[
											styles.statusBadge,
											{
												backgroundColor:
													getStatusColor(newStatus),
											},
										]}>
										<Text style={styles.statusText}>
											{getStatusText(newStatus)}
										</Text>
									</View>
								</>
							)}
						</View>

						<Text style={styles.label}>
							{prevStatus === newStatus
								? 'Why do you want to add more context?'
								: 'Why are you making this change?'}
						</Text>
						<TextInput
							style={styles.input}
							multiline
							numberOfLines={4}
							placeholder='Enter reason...'
							value={reason}
							onChangeText={setReason}
						/>

						{/* Media attachment section */}
						<View style={styles.attachmentSection}>
							<View style={styles.attachmentHeaderRow}>
								<Text style={styles.attachmentSectionTitle}>
									{MOCK_AUDIO_ENABLED
										? 'Photos, Videos & Voice'
										: 'Photos & Videos'}
								</Text>
								<Text style={styles.optionalText}>
									(Optional)
								</Text>
							</View>

							{isPickerAvailable || __DEV__ ? (
								<>
									<Text style={styles.attachmentHelperText}>
										Add photos or videos to provide more
										context
										{MOCK_AUDIO_ENABLED
											? ', or voice memos'
											: ''}
										{!IMAGE_PICKER_ENABLED &&
											' (Using Mock Data)'}
									</Text>

									{/* Conditional button layout based on Mock Audio availability */}
									{MOCK_AUDIO_ENABLED ? (
										<View style={styles.mediaButtonsRow}>
											<TouchableOpacity
												style={styles.mediaButton}
												onPress={pickMedia}>
												<Text
													style={
														styles.mediaButtonIcon
													}>
													📷
												</Text>
												<Text
													style={
														styles.mediaButtonText
													}>
													PHOTO/VIDEO
												</Text>
											</TouchableOpacity>

											{/* Mock Recording button */}
											<TouchableOpacity
												style={[
													styles.mediaButton,
													styles.recordButton,
												]}
												onPress={addMockAudio}>
												<Text
													style={
														styles.mediaButtonIcon
													}>
													🎙️
												</Text>
												<Text
													style={
														styles.mediaButtonText
													}>
													VOICE MEMO
												</Text>
											</TouchableOpacity>
										</View>
									) : (
										/* Single button layout when Audio is not available */
										<TouchableOpacity
											style={styles.singleMediaButton}
											onPress={pickMedia}>
											<Text
												style={styles.mediaButtonIcon}>
												📷
											</Text>
											<Text
												style={styles.mediaButtonText}>
												ADD SAMPLE PHOTOS & VIDEOS
											</Text>
										</TouchableOpacity>
									)}

									{attachments.length > 0 ? (
										<View
											style={
												styles.attachmentPreviewContainer
											}>
											{attachments.map(
												(attachment, index) => (
													<View
														key={index}
														style={
															styles.attachmentPreview
														}>
														{attachment.type ===
														'image' ? (
															// Image preview
															<Image
																source={{
																	uri: attachment.url,
																}}
																style={
																	styles.attachmentImage
																}
															/>
														) : attachment.type ===
														  'video' ? (
															// Video preview
															<View
																style={
																	styles.videoPreviewContainer
																}>
																<Image
																	source={{
																		uri: 'https://picsum.photos/200/300?blur',
																	}}
																	style={
																		styles.videoThumbnail
																	}
																/>
																<View
																	style={
																		styles.videoOverlay
																	}>
																	<Text
																		style={
																			styles.videoIcon
																		}>
																		▶️
																	</Text>
																	<Text
																		style={
																			styles.videoLabel
																		}>
																		{attachment.duration
																			? imageUtils.formatDuration(
																					attachment.duration
																			  )
																			: 'Video'}
																	</Text>
																</View>
															</View>
														) : (
															// Audio preview
															<View
																style={
																	styles.audioPreviewContainer
																}>
																<View
																	style={
																		styles.audioWaveform
																	}>
																	<Text
																		style={
																			styles.audioIcon
																		}>
																		🔊
																	</Text>
																</View>
																<View
																	style={
																		styles.audioControlsContainer
																	}>
																	<TouchableOpacity
																		style={
																			styles.audioPlayButton
																		}
																		onPress={() => {
																			if (
																				isPlaying &&
																				playingAttachmentId ===
																					index
																			) {
																				stopPlayback();
																			} else {
																				playAudio(
																					index,
																					attachment.url
																				);
																			}
																		}}>
																		<Text
																			style={
																				styles.audioPlayIcon
																			}>
																			{isPlaying &&
																			playingAttachmentId ===
																				index
																				? '⏸️'
																				: '▶️'}
																		</Text>
																	</TouchableOpacity>
																	<Text
																		style={
																			styles.audioDuration
																		}>
																		{isPlaying &&
																		playingAttachmentId ===
																			index
																			? imageUtils?.formatDuration(
																					playbackPosition
																			  )
																			: imageUtils?.formatDuration(
																					attachment.duration
																			  )}
																	</Text>
																</View>
															</View>
														)}
														<TouchableOpacity
															style={
																styles.removeAttachmentButton
															}
															onPress={() =>
																removeAttachment(
																	index
																)
															}>
															<Text
																style={
																	styles.removeAttachmentText
																}>
																✕
															</Text>
														</TouchableOpacity>
													</View>
												)
											)}
										</View>
									) : (
										<View
											style={
												styles.noAttachmentsContainer
											}>
											<Text
												style={
													styles.noAttachmentsText
												}>
												No media attached yet. Use the{' '}
												{MOCK_AUDIO_ENABLED
													? 'buttons'
													: 'button'}{' '}
												above to add
												{!IMAGE_PICKER_ENABLED
													? ' sample'
													: ''}{' '}
												photos, videos
												{MOCK_AUDIO_ENABLED
													? ', or voice memos'
													: ''}
												.
												{__DEV__
													? ' (Simulator Mode)'
													: ''}
											</Text>
										</View>
									)}
								</>
							) : (
								<View style={styles.pickerUnavailableContainer}>
									<Text style={styles.pickerUnavailableText}>
										Media attachments are unavailable.
										Please check app permissions.
									</Text>
								</View>
							)}
						</View>
					</ScrollView>

					<View style={styles.footer}>
						<TouchableOpacity
							style={[styles.button, styles.cancelButton]}
							onPress={() => {
								// Stop any recording or playback in progress
								if (AUDIO_ENABLED) {
									cancelRecording();
									stopPlayback();
								}
								// Clear state
								setReason('');
								setAttachments([]);
								onClose();
							}}>
							<Text style={styles.buttonText}>Cancel</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={handleSubmit}
							disabled={isSubmitting}
							style={[
								styles.submitButton,
								!reason.trim() &&
									attachments.length === 0 &&
									styles.disabledButton,
								isSubmitting && styles.loadingButton,
							]}>
							{isSubmitting ? (
								<ActivityIndicator
									size='small'
									color='#FFFFFF'
								/>
							) : (
								<Text style={styles.submitButtonText}>
									Submit
								</Text>
							)}
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	modalOverlay: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		zIndex: 99999,
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		width: '100%',
		height: '100%',
	},
	modalContent: {
		width: '90%',
		backgroundColor: 'white',
		borderRadius: 10,
		overflow: 'hidden',
		elevation: 10,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 0.5,
		shadowRadius: 5,
		maxHeight: '80%',
	},
	header: {
		backgroundColor: '#f8f8f8',
		padding: 15,
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
	},
	title: {
		fontSize: 18,
		fontWeight: 'bold',
		textAlign: 'center',
	},
	body: {
		padding: 20,
		maxHeight: 500, // Ensure scrollable content fits
	},
	flagTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		marginBottom: 10,
		textAlign: 'center',
	},
	statusChange: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 20,
	},
	statusBadge: {
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 5,
	},
	statusText: {
		fontWeight: 'bold',
	},
	arrow: {
		fontSize: 20,
		marginHorizontal: 10,
	},
	label: {
		fontSize: 14,
		marginBottom: 8,
	},
	input: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 5,
		paddingHorizontal: 10,
		paddingVertical: 8,
		minHeight: 80,
		textAlignVertical: 'top',
	},
	footer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		padding: 15,
		borderTopWidth: 1,
		borderTopColor: '#e0e0e0',
	},
	button: {
		flex: 1,
		padding: 10,
		borderRadius: 5,
		justifyContent: 'center',
		alignItems: 'center',
		marginHorizontal: 5,
	},
	cancelButton: {
		backgroundColor: '#e0e0e0',
	},
	submitButton: {
		padding: 10,
		backgroundColor: colors.exodusFruit,
		borderRadius: 4,
		flex: 1,
		margin: 5,
		minHeight: 50,
		justifyContent: 'center',
		alignItems: 'center',
	},
	buttonText: {
		color: 'white',
		fontWeight: 'bold',
	},
	// Attachment styles
	attachmentSection: {
		marginTop: 20,
		borderTopWidth: 1,
		borderTopColor: '#eee',
		paddingTop: 15,
		borderRadius: 8,
		backgroundColor: '#f9f9f9',
		padding: 15,
		marginBottom: 20,
	},
	attachmentHeaderRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	attachmentSectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginRight: 6,
		color: '#222',
	},
	optionalText: {
		fontSize: 12,
		color: '#666',
		fontStyle: 'italic',
	},
	attachmentHelperText: {
		fontSize: 14,
		color: '#555',
		marginBottom: 12,
	},
	mediaButtonsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 15,
	},
	mediaButton: {
		flex: 1,
		backgroundColor: '#2F80ED',
		padding: 12,
		borderRadius: 8,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 3,
		elevation: 4,
		margin: 4,
	},
	recordButton: {
		backgroundColor: '#E74C3C',
	},
	mediaButtonIcon: {
		fontSize: 20,
		marginRight: 6,
		color: 'white',
	},
	mediaButtonText: {
		color: 'white',
		fontWeight: 'bold',
		fontSize: 12,
	},
	recordingContainer: {
		flex: 1,
		backgroundColor: '#FADBD8',
		borderRadius: 8,
		padding: 10,
		alignItems: 'center',
		margin: 4,
		borderWidth: 1,
		borderColor: '#E74C3C',
	},
	recordingTimer: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#E74C3C',
		marginBottom: 8,
	},
	recordingButtonsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%',
	},
	recordingControlButton: {
		backgroundColor: '#2ECC71',
		padding: 8,
		borderRadius: 6,
		flex: 1,
		margin: 3,
		alignItems: 'center',
	},
	cancelRecordingButton: {
		backgroundColor: '#7F8C8D',
	},
	recordingControlButtonText: {
		color: 'white',
		fontWeight: 'bold',
		fontSize: 12,
	},
	attachmentPreviewContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: 10,
	},
	attachmentPreview: {
		width: 100,
		height: 100,
		margin: 5,
		position: 'relative',
	},
	attachmentImage: {
		width: '100%',
		height: '100%',
		borderRadius: 5,
		borderWidth: 1,
		borderColor: '#ddd',
		backgroundColor: '#f0f0f0',
		resizeMode: 'cover',
	},
	removeAttachmentButton: {
		position: 'absolute',
		top: -8,
		right: -8,
		backgroundColor: '#ff4d4f',
		width: 24,
		height: 24,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: 1,
		elevation: 2,
	},
	removeAttachmentText: {
		color: 'white',
		fontWeight: 'bold',
		fontSize: 12,
	},
	noAttachmentsContainer: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderStyle: 'dashed',
		borderRadius: 5,
		padding: 15,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f0f0f0',
	},
	noAttachmentsText: {
		color: '#666',
		textAlign: 'center',
		fontSize: 14,
	},
	pickerUnavailableContainer: {
		padding: 15,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff3f3',
		borderRadius: 5,
		borderWidth: 1,
		borderColor: '#ffcece',
	},
	pickerUnavailableText: {
		color: '#e05151',
		textAlign: 'center',
		fontSize: 14,
	},
	// Video styles
	videoPreviewContainer: {
		width: '100%',
		height: '100%',
		position: 'relative',
		borderRadius: 5,
		overflow: 'hidden',
	},
	videoThumbnail: {
		width: '100%',
		height: '100%',
		borderRadius: 5,
		borderWidth: 1,
		borderColor: '#ddd',
		backgroundColor: '#282828',
		resizeMode: 'cover',
	},
	videoOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0,0,0,0.3)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	videoIcon: {
		fontSize: 24,
		color: 'white',
	},
	videoLabel: {
		color: 'white',
		fontSize: 10,
		fontWeight: 'bold',
		marginTop: 4,
	},
	// Audio playback styles
	audioPreviewContainer: {
		width: '100%',
		height: '100%',
		position: 'relative',
		borderRadius: 5,
		backgroundColor: '#F7F9FA',
		borderWidth: 1,
		borderColor: '#ddd',
		padding: 8,
		justifyContent: 'space-between',
	},
	audioWaveform: {
		height: 40,
		alignItems: 'center',
		justifyContent: 'center',
	},
	audioIcon: {
		fontSize: 28,
		color: '#3498DB',
	},
	audioControlsContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	audioPlayButton: {
		width: 30,
		height: 30,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#3498DB',
		borderRadius: 15,
	},
	audioPlayIcon: {
		fontSize: 16,
		color: 'white',
	},
	audioDuration: {
		fontSize: 12,
		fontWeight: 'bold',
		color: '#666',
	},
	// Single media button style for when Audio is not available
	singleMediaButton: {
		backgroundColor: '#2F80ED',
		padding: 14,
		borderRadius: 8,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 6,
		margin: 5,
		minHeight: 50,
	},
	loadingButton: {
		backgroundColor: '#ccc',
	},
	disabledButton: {
		backgroundColor: '#ccc',
	},
	submitButtonText: {
		color: 'white',
		fontWeight: 'bold',
	},
});

export default ReasonInputModal;
