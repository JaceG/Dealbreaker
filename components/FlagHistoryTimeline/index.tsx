import { useEffect, useState, useCallback, memo, useRef } from 'react';
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	ActivityIndicator,
	TouchableOpacity,
	Image,
	Alert,
	Modal,
	ScrollView,
} from 'react-native';
import { getFlagHistory } from '../../utils/mongodb';
import { showToast } from '../../utils';
import { colors } from '../../libs/board/constants/colors';
import { FlagHistoryTimelineProps } from '../../models/modalModels';
import { Audio } from 'expo-av';

// Set to false to disable debug logs
const DEBUG_LOGGING = false;

// Helper to prevent excessive logging
const debugLog = (...args: any[]) => {
	if (DEBUG_LOGGING) {
		console.log(...args);
	}
};

// Feature flags to disable native modules
const AUDIO_ENABLED = false;
const IMAGE_PREVIEW_ENABLED = true;

// Only import if feature is enabled
let ImagePreviewModal: any = null;
if (IMAGE_PREVIEW_ENABLED) {
	try {
		ImagePreviewModal = require('../ImagePreviewModal').default;
		console.log('ImagePreviewModal loaded successfully');
	} catch (error: any) {
		console.log(
			'ImagePreviewModal not available:',
			error?.message || 'Unknown error'
		);
	}
}

// Instead of directly importing Audio, which causes a crash
// We'll create a feature flag to conditionally enable audio features
let AudioModule: typeof Audio | null = null;

// Try to load Audio module only if enabled
if (AUDIO_ENABLED) {
	try {
		AudioModule = require('expo-av').Audio;
		console.log('Audio module loaded successfully');
	} catch (error: any) {
		console.log(
			'Audio module not available:',
			error?.message || 'Unknown error'
		);
	}
}

interface HistoryItem {
	_id?: string;
	id?: string;
	timestamp: string;
	type?: string;
	cardTypeChange?: string;
	previousStatus?: string;
	newStatus?: string;
	reason?: string;
	attachments?: Array<{
		type: string;
		url: string;
		timestamp?: string;
		duration?: number;
	}>;
}

interface TestS3Result {
	success: boolean;
	url?: string;
	note?: string;
	error?: string;
	details?: any;
	stack?: string;
}

const FlagHistoryTimeline = ({
	profileId,
	flagId,
	flagTitle,
	onClose,
	onAddReason,
}: FlagHistoryTimelineProps) => {
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [previewImage, setPreviewImage] = useState<string | null>(null);
	const [previewVisible, setPreviewVisible] = useState(false);
	const [isTestingS3, setIsTestingS3] = useState(false);

	// Audio playback states - only used if Audio is available
	const [sound, setSound] = useState<Audio.Sound | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [playbackPosition, setPlaybackPosition] = useState(0);
	const [playingAttachmentId, setPlayingAttachmentId] = useState<
		string | null
	>(null);

	// Add a state for tracking image loading errors
	const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>(
		{}
	);

	useEffect(() => {
		loadHistory();
	}, [profileId, flagId]);

	// Clean up sound resources when component unmounts - only if Audio is available
	useEffect(() => {
		return () => {
			if (AUDIO_ENABLED && sound) {
				stopPlayback();
			}
		};
	}, []);

	const loadHistory = async () => {
		setLoading(true);
		try {
			debugLog(
				`Loading history for profile "${profileId}" and flag "${flagId}"`
			);

			if (!profileId || !flagId) {
				debugLog(
					'Missing required parameters for loading history:',
					!profileId ? 'Missing profileId' : 'Missing flagId'
				);
				setHistory([]);
				return;
			}

			const historyData = await getFlagHistory(profileId, flagId);
			console.log(
				'FlagHistoryTimeline: History loaded:',
				JSON.stringify(historyData, null, 2)
			);

			// Check for flag color changes (without card type changes)
			const regularFlagChanges = historyData.filter(
				(item: HistoryItem) =>
					(!item.cardTypeChange || item.cardTypeChange === 'none') &&
					item.previousStatus !== item.newStatus
			);
			console.log(
				'FlagHistoryTimeline: Regular flag color changes:',
				regularFlagChanges.length
			);

			if (regularFlagChanges.length > 0) {
				console.log(
					'FlagHistoryTimeline: First regular flag change:',
					JSON.stringify(regularFlagChanges[0], null, 2)
				);
			}

			// Check for card type changes
			const cardTypeChanges = historyData.filter(
				(item: HistoryItem) =>
					item.cardTypeChange && item.cardTypeChange !== 'none'
			);
			console.log(
				'FlagHistoryTimeline: Card type changes:',
				cardTypeChanges.length
			);

			if (cardTypeChanges.length > 0) {
				console.log(
					'FlagHistoryTimeline: First card type change:',
					JSON.stringify(cardTypeChanges[0], null, 2)
				);
			}

			debugLog(
				`History data loaded: ${
					historyData ? historyData.length : 0
				} items`,
				historyData && historyData.length > 0
					? `First item timestamp: ${new Date(
							historyData[0].timestamp
					  ).toLocaleString()}`
					: ''
			);

			// Log any attachments found
			if (historyData && historyData.length > 0) {
				historyData.forEach((item: HistoryItem, index: number) => {
					if (item.attachments && item.attachments.length > 0) {
						debugLog(
							`Item ${index} has ${item.attachments.length} attachments:`,
							JSON.stringify(
								item.attachments.map((a) => ({
									type: a.type,
									url: a.url?.substring(0, 30) + '...',
								}))
							)
						);
					}
				});
			}

			setHistory(historyData);
		} catch (error) {
			debugLog('Error loading flag history:', error);
			setHistory([]);
		} finally {
			setLoading(false);
		}
	};

	const handleImagePress = (imageUrl: string) => {
		if (!IMAGE_PREVIEW_ENABLED) {
			// If image preview is disabled, just show an alert
			Alert.alert(
				'Image Preview',
				'Image viewer is not available in this version.',
				[{ text: 'OK' }]
			);
			return;
		}

		debugLog(`Opening image preview for: ${imageUrl?.substring(0, 50)}...`);

		setPreviewImage(imageUrl);
		setPreviewVisible(true);
	};

	const closeImagePreview = () => {
		setPreviewVisible(false);
		setPreviewImage(null);
	};

	// Play audio attachment - only if Audio is available
	const playAudio = async (attachmentId: string, uri: string) => {
		if (!AUDIO_ENABLED || !AudioModule) {
			showToast('error', 'Audio playback is not available');
			return;
		}

		try {
			// Stop current playback if any
			await stopPlayback();

			debugLog('Loading sound from URI:', uri);
			const { sound: newSound } = await AudioModule.Sound.createAsync(
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

	// Stop audio playback - only if Audio is available
	const stopPlayback = async () => {
		if (!AUDIO_ENABLED || !AudioModule || !sound) return;

		try {
			await sound.stopAsync();
			await sound.unloadAsync();
		} catch (error) {
			debugLog('Error stopping sound:', error);
		}

		setSound(null);
		setIsPlaying(false);
		setPlaybackPosition(0);
		setPlayingAttachmentId(null);
	};

	// Track playback status - only if Audio is available
	const onPlaybackStatusUpdate = (status: any) => {
		if (status.isLoaded) {
			setPlaybackPosition(status.positionMillis / 1000);

			if (status.didJustFinish) {
				// Playback finished
				stopPlayback();
			}
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'white':
				return '#f0f0f0';
			case 'yellow':
				return '#FFD700';
			case 'red':
				return '#FF0000';
			default:
				return '#cccccc';
		}
	};

	const getStatusColorText = (status: string) => {
		switch (status) {
			case 'white':
				return '#000000';
			case 'yellow':
				return '#000000';
			case 'red':
				return '#FFFFFF';
			default:
				return '#000000';
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	// Helper function to get flag colors
	const getColorForFlag = (status: string) => {
		switch (status) {
			case 'white':
				return '#f0f0f0'; // Light gray for white flags to be visible
			case 'yellow':
				return '#FFD700';
			case 'red':
				return '#FF0000';
			case 'dealbreaker':
				return '#FF0000';
			default:
				return '#cccccc';
		}
	};

	// Helper function to get text color for a flag status (for contrast)
	const getTextColorForFlag = (flag: string) => {
		switch (flag?.toLowerCase()) {
			case 'yellow':
			case 'green':
			case 'white':
				return '#000000';
			case 'red':
			default:
				return '#ffffff';
		}
	};

	const handleImageError = (attachmentId: string) => {
		setImageErrors((prev) => ({
			...prev,
			[attachmentId]: true,
		}));
	};

	const renderHistoryItem = ({
		item,
		index,
	}: {
		item: HistoryItem;
		index: number;
	}) => (
		<View style={styles.timelineItem}>
			<View style={styles.timelineLeft}>
				<View
					style={[
						styles.timelineBullet,
						item.cardTypeChange === 'flag-to-dealbreaker' &&
							styles.redTimelineBullet,
					]}
				/>
				{index < history.length - 1 && (
					<View style={styles.timelineLine} />
				)}
			</View>
			<View style={styles.timelineContent}>
				<View style={styles.timelineHeader}>
					<Text style={styles.timelineDate}>
						{new Date(item.timestamp).toLocaleString()}
					</Text>
				</View>

				{item.type === 'add-reason' ? (
					<Text style={styles.flagStatusLabel}>
						Additional context provided
					</Text>
				) : item.cardTypeChange === 'flag-to-dealbreaker' ? (
					<View style={styles.flagStatusRow}>
						<Text style={styles.flagStatusLabel}>
							Flag changed to Dealbreaker
						</Text>
					</View>
				) : item.cardTypeChange === 'dealbreaker-to-flag' ? (
					<View style={styles.flagStatusRow}>
						<Text style={styles.flagStatusLabel}>
							Flag changed from Dealbreaker
						</Text>
					</View>
				) : (
					<View style={styles.flagStatusRow}>
						<Text style={styles.flagStatusLabel}>
							Flag changed:{' '}
						</Text>
						<View style={styles.flagContainer}>
							<Image
								style={[
									styles.flagImage,
									{
										tintColor: getColorForFlag(
											item.previousStatus || ''
										),
									},
								]}
								source={require('../../libs/board/assets/icons/flag.png')}
							/>
						</View>
						<Text style={styles.flagStatusArrow}> → </Text>
						<View style={styles.flagContainer}>
							<Image
								style={[
									styles.flagImage,
									{
										tintColor: getColorForFlag(
											item.newStatus || ''
										),
									},
								]}
								source={require('../../libs/board/assets/icons/flag.png')}
							/>
						</View>
					</View>
				)}

				{item.reason && (
					<View style={styles.reasonContainer}>
						<Text style={styles.reasonTitle}>Reason:</Text>
						<Text style={styles.reasonText}>{item.reason}</Text>
					</View>
				)}

				{item.attachments && item.attachments.length > 0 && (
					<View style={styles.attachmentsContainer}>
						<Text style={styles.attachmentsTitle}>
							Attachments: {item.attachments.length}
						</Text>

						{/* Debug section to see raw attachment data */}
						<View style={styles.debugContainer}>
							<Text style={styles.debugTitle}>
								Attachment Debug Info:
							</Text>
							{item.attachments.map((att, i) => (
								<Text
									key={`debug-${i}`}
									style={styles.debugText}>
									{i + 1}: {att.type} | URL:{' '}
									{att.url
										? att.url.substring(0, 30) + '...'
										: 'Missing'}{' '}
									| Created:{' '}
									{att.timestamp
										? new Date(
												att.timestamp
										  ).toLocaleString()
										: 'No Date'}
								</Text>
							))}
						</View>

						<View style={styles.attachmentsGrid}>
							{item.attachments.map((attachment, i) => {
								debugLog(
									`Rendering attachment ${i}:`,
									attachment.type,
									attachment.url ? 'Has URL' : 'No URL'
								);

								if (attachment.type === 'image') {
									// Create a unique ID for this attachment for tracking errors
									const attachmentId = `${
										item._id || index
									}-${i}`;

									return (
										<TouchableOpacity
											key={`attachment-${attachmentId}`}
											style={styles.attachmentThumbnail}
											onPress={() =>
												handleImagePress(attachment.url)
											}>
											{imageErrors[attachmentId] ? (
												// Show error placeholder if image fails to load
												<View
													style={
														styles.errorImagePlaceholder
													}>
													<Text
														style={
															styles.errorImageText
														}>
														Image Error
													</Text>
													<Text
														style={
															styles.errorImageSubtext
														}>
														Tap to try viewing
													</Text>
												</View>
											) : (
												<View
													style={
														styles.imageContainer
													}>
													{/* The actual image */}
													<Image
														source={{
															uri: attachment.url,
														}}
														style={
															styles.thumbnailImage
														}
														resizeMode='cover'
														onError={(e: any) => {
															debugLog(
																'Image error:',
																e.nativeEvent
																	.error ||
																	'Unknown error'
															);
															handleImageError(
																attachmentId
															);
														}}
													/>
												</View>
											)}
											<Text
												style={styles.attachmentLabel}>
												Image
											</Text>
										</TouchableOpacity>
									);
								} else if (attachment.type === 'video') {
									return (
										<TouchableOpacity
											key={`attachment-${i}`}
											style={styles.attachmentThumbnail}
											onPress={() => {
												// Handle video preview or just show a message
												Alert.alert(
													'Video',
													'Video preview is not available in this version'
												);
											}}>
											<View style={styles.videoThumbnail}>
												<Text style={styles.videoLabel}>
													VIDEO
												</Text>
											</View>
										</TouchableOpacity>
									);
								} else if (attachment.type === 'audio') {
									const isCurrentlyPlaying =
										playingAttachmentId ===
										`${item.id}-${i}`;

									return (
										<TouchableOpacity
											key={`attachment-${i}`}
											style={styles.audioButton}
											onPress={() =>
												isCurrentlyPlaying
													? stopPlayback()
													: playAudio(
															`${item.id}-${i}`,
															attachment.url
													  )
											}>
											<Text
												style={styles.audioButtonText}>
												{isCurrentlyPlaying
													? '■ Stop'
													: '▶ Play'}
												{' Audio'}
											</Text>
											{attachment.duration && (
												<Text
													style={
														styles.audioDuration
													}>
													{Math.floor(
														attachment.duration / 60
													)}
													:
													{(attachment.duration % 60)
														.toString()
														.padStart(2, '0')}
												</Text>
											)}
										</TouchableOpacity>
									);
								} else {
									// For any other type of attachment
									return (
										<View
											key={`attachment-${i}`}
											style={styles.genericAttachment}>
											<Text
												style={
													styles.genericAttachmentText
												}>
												{attachment.type || 'Unknown'}{' '}
												attachment
											</Text>
										</View>
									);
								}
							})}
						</View>
					</View>
				)}
			</View>
		</View>
	);

	// Return early if no flagId
	if (!flagId && previewVisible) {
		debugLog('FlagHistoryModal has no flagId but is visible, closing');
		closeImagePreview();
		return null;
	}
	console.log('History: ', JSON.stringify(history, null, 2));
	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.headerTitle}>{flagTitle}</Text>
				<View style={styles.headerButtons}>
					<TouchableOpacity
						style={styles.addButton}
						onPress={onAddReason}>
						<Text style={styles.addButtonText}>Add Context</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.closeButton}
						onPress={onClose}>
						<Text style={styles.closeButtonText}>✕</Text>
					</TouchableOpacity>
				</View>
			</View>

			{loading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size='large' color='#4A90E2' />
					<Text style={styles.loadingText}>Loading history...</Text>
				</View>
			) : history.length === 0 ? (
				<View style={styles.emptyContainer}>
					<Text style={styles.emptyText}>
						No history found for this flag.
					</Text>
				</View>
			) : (
				<FlatList
					data={history}
					renderItem={renderHistoryItem}
					keyExtractor={(item, index) =>
						`history-${item._id || index}`
					}
					contentContainerStyle={styles.listContent}
				/>
			)}

			{/* Render the ImagePreviewModal if it was successfully imported */}
			{IMAGE_PREVIEW_ENABLED && ImagePreviewModal && (
				<ImagePreviewModal
					visible={previewVisible}
					imageUri={previewImage}
					onClose={closeImagePreview}
				/>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
		borderRadius: 10,
		overflow: 'hidden',
		margin: 10,
	},
	header: {
		flexDirection: 'column',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		backgroundColor: '#f0f0f0',
		borderBottomWidth: 1,
		borderBottomColor: '#ccc',
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: 'bold',
	},
	headerButtons: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		alignItems: 'center',
		width: '100%',
		marginTop: 10,
	},
	addButton: {
		padding: 10,
		backgroundColor: '#4CAF50',
		borderRadius: 5,
		marginRight: 8,
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 2,
	},
	addButtonText: {
		color: 'white',
		fontWeight: 'bold',
		fontSize: 14,
	},
	closeButton: {
		padding: 8,
		backgroundColor: '#ff6b6b',
		borderRadius: 5,
	},
	closeButtonText: {
		color: 'white',
		fontWeight: 'bold',
	},
	loadingContainer: {
		padding: 30,
		alignItems: 'center',
		justifyContent: 'center',
	},
	loadingText: {
		marginTop: 10,
		fontSize: 14,
		color: '#666',
	},
	emptyContainer: {
		padding: 30,
		alignItems: 'center',
		justifyContent: 'center',
	},
	emptyText: {
		fontSize: 14,
		color: '#666',
	},
	listContent: {
		padding: 16,
	},
	timelineItem: {
		flexDirection: 'row',
		marginBottom: 20,
	},
	timelineLeft: {
		width: 24,
		alignItems: 'center',
	},
	timelineBullet: {
		width: 16,
		height: 16,
		borderRadius: 8,
		backgroundColor: '#4A90E2',
		borderWidth: 2,
		borderColor: '#333',
	},
	redTimelineBullet: {
		backgroundColor: '#FF0000',
	},
	timelineLine: {
		width: 2,
		flex: 1,
		backgroundColor: '#ccc',
		marginTop: 4,
	},
	timelineContent: {
		flex: 1,
		marginLeft: 12,
		backgroundColor: colors.exodusFruit,
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 15,
		width: '94.5%',
		shadowRadius: 15,
		shadowColor: colors.black,
		shadowOffset: { width: 0, height: 3 },
		elevation: 6,
		marginTop: 4,
		marginBottom: 4,
	},
	timelineHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	timelineDate: {
		fontSize: 12,
		color: '#fff',
	},
	flagStatusRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginVertical: 8,
	},
	flagStatusLabel: {
		fontWeight: 'bold',
		marginRight: 8,
		color: '#fff',
	},
	flagStatusText: {
		fontWeight: 'bold',
		fontSize: 16,
	},
	flagStatusArrow: {
		fontSize: 16,
		color: '#fff',
		marginHorizontal: 4,
	},
	statusIndicator: {
		width: 16,
		height: 16,
		borderRadius: 8,
		borderWidth: 2,
		borderColor: '#333',
		marginLeft: 6,
	},
	reasonContainer: {
		marginTop: 8,
		backgroundColor: 'rgba(255, 255, 255, 0.9)',
		padding: 8,
		borderRadius: 4,
	},
	reasonTitle: {
		fontWeight: 'bold',
		fontSize: 14,
		marginBottom: 4,
		color: '#333',
	},
	reasonText: {
		fontSize: 14,
		color: '#333',
	},
	attachmentsContainer: {
		marginTop: 12,
		backgroundColor: '#f5f5f5',
		borderRadius: 4,
		padding: 10,
	},
	attachmentsTitle: {
		fontWeight: 'bold',
		fontSize: 14,
		marginBottom: 8,
	},
	attachmentsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	attachmentThumbnail: {
		marginRight: 8,
		marginBottom: 8,
		width: 120,
		height: 120,
		borderRadius: 6,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: '#ddd',
		backgroundColor: '#fff',
	},
	thumbnailImage: {
		width: '100%',
		height: '100%',
		borderRadius: 6,
		borderWidth: 1,
		borderColor: '#ddd',
		backgroundColor: '#282828',
	},
	videoThumbnail: {
		width: '100%',
		height: '100%',
		borderRadius: 6,
		overflow: 'hidden',
		justifyContent: 'center',
		alignItems: 'center',
	},
	videoLabel: {
		color: 'white',
		fontSize: 10,
		fontWeight: 'bold',
	},
	audioButton: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 10,
		backgroundColor: '#f1f9fe',
		borderRadius: 5,
		borderWidth: 1,
		borderColor: '#cfe7fa',
		width: '100%',
	},
	audioButtonText: {
		flex: 1,
		fontSize: 14,
		fontWeight: 'bold',
		color: '#333',
	},
	audioDuration: {
		fontSize: 12,
		color: '#666',
	},
	attachmentLabel: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		color: 'white',
		padding: 4,
		borderBottomLeftRadius: 6,
		borderBottomRightRadius: 6,
	},
	genericAttachment: {
		marginRight: 8,
		marginBottom: 8,
		padding: 10,
		backgroundColor: '#f0f0f0',
		borderRadius: 6,
		overflow: 'hidden',
	},
	genericAttachmentText: {
		fontSize: 14,
		color: '#666',
	},
	debugContainer: {
		marginVertical: 8,
		padding: 8,
		backgroundColor: '#f9f9f9',
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 4,
	},
	debugTitle: {
		fontWeight: 'bold',
		fontSize: 14,
		marginBottom: 8,
	},
	debugText: {
		fontSize: 12,
		color: '#666',
	},
	errorImagePlaceholder: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f0f0f0',
		borderRadius: 6,
		padding: 10,
	},
	errorImageText: {
		fontSize: 14,
		fontWeight: 'bold',
		color: '#666',
	},
	errorImageSubtext: {
		fontSize: 12,
		color: '#666',
	},
	imageContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	testButton: {
		backgroundColor: '#3498db',
		padding: 8,
		borderRadius: 5,
		marginRight: 8,
	},
	testButtonText: {
		color: 'white',
		fontWeight: 'bold',
		fontSize: 12,
	},
	disabledButton: {
		backgroundColor: '#cccccc',
	},
	cardTypeTransitionContainer: {
		marginTop: 8,
		backgroundColor: '#e8f4fd',
		padding: 8,
		borderRadius: 4,
	},
	cardTypeTransitionLabel: {
		fontWeight: 'bold',
		fontSize: 14,
		marginBottom: 4,
	},
	cardTypeTransitionDetails: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	cardTypeTransitionText: {
		fontSize: 14,
		color: '#333',
	},
	flagContainer: {
		flexDirection: 'column',
		alignItems: 'center',
		marginHorizontal: 8,
	},
	flagColorLabel: {
		fontSize: 10,
		color: '#555',
		marginTop: 4,
	},
	flagImage: {
		width: 20,
		height: 20,
	},
	whiteFlagBackground: {
		backgroundColor: '#333333',
		borderRadius: 4,
		padding: 4,
	},
});

export default FlagHistoryTimeline;
