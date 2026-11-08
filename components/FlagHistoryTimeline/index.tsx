import { useContext, useEffect, useState } from 'react';
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	ActivityIndicator,
	TouchableOpacity,
	Image,
	Alert,
	Pressable,
	useWindowDimensions,
} from 'react-native';
import { getFlagHistory } from '../../utils/mongodb';
import { getCardHistoryAcrossProfiles } from '../../utils/api';
import StoreContext from '../../store';
import { showToast } from '../../utils';
import { colors } from '../../libs/board/constants/colors';
import { FlagHistoryTimelineProps } from '../../models/modalModels';
import AppButton from '../AppButton';
import CloseButton from '../CloseButton';
import Feather from '@expo/vector-icons/Feather';
import AudioAttachment from '../MediaPlayer/AudioAttachment';
import VideoPlayerModal from '../MediaPlayer/VideoPlayerModal';
import { useAttachmentAudio } from '../MediaPlayer/useAttachmentAudio';

// Set to false to disable debug logs
const DEBUG_LOGGING = false;

// Helper to prevent excessive logging
const debugLog = (...args: any[]) => {
	if (DEBUG_LOGGING) {
		console.log(...args);
	}
};

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

interface HistoryItem {
	_id?: string;
	id?: string;
	profileId?: string;
	profileName?: string;
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
	flagDescription,
	onClose,
	onAddReason,
}: FlagHistoryTimelineProps) => {
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [previewImage, setPreviewImage] = useState<string | null>(null);
	const [previewVisible, setPreviewVisible] = useState(false);
	const [isTestingS3, setIsTestingS3] = useState(false);

	// Everyone tab: this card's entries on every person, loaded the first time the tab opens
	const { dealbreaker, profiles } = useContext(StoreContext) as unknown as {
		dealbreaker: Record<string, { ended?: unknown } | undefined>;
		profiles: { id: string; name: string }[];
	};
	const showTabs = profileId !== 'main';
	const [tab, setTab] = useState<'person' | 'everyone'>('person');
	const [everyone, setEveryone] = useState<HistoryItem[] | null>(null);
	const [everyoneError, setEveryoneError] = useState(false);

	// One memo plays at a time; the player is released (and stops) when the popup closes.
	const audio = useAttachmentAudio();
	const [videoUrl, setVideoUrl] = useState<string | null>(null);

	// Add a state for tracking image loading errors
	const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>(
		{}
	);

	useEffect(() => {
		loadHistory();
		setTab('person');
		setEveryone(null);
	}, [profileId, flagId]);

	const loadEveryone = async () => {
		setEveryoneError(false);
		try {
			setEveryone(
				(await getCardHistoryAcrossProfiles(flagId)) as unknown as HistoryItem[]
			);
		} catch (error) {
			setEveryoneError(true);
		}
	};

	useEffect(() => {
		if (tab === 'everyone' && everyone === null && !everyoneError) loadEveryone();
	}, [tab, everyone, everyoneError]);

	// The person's current name when they still exist, else the name saved with the entry
	const personLabel = (item: HistoryItem) => {
		const id = item.profileId || '';
		const name = profiles.find((p) => p.id === id)?.name || item.profileName || 'Unknown person';
		const notes = [
			id === profileId && 'this person',
			dealbreaker[id]?.ended && 'ended',
		].filter(Boolean);
		return notes.length ? `${name} (${notes.join(', ')})` : name;
	};

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

			const historyData = ((await getFlagHistory(profileId, flagId)) ?? []) as HistoryItem[];
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

	const renderHistoryItem = (list: HistoryItem[], withPerson = false) => ({
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
				{index < list.length - 1 && (
					<View style={styles.timelineLine} />
				)}
			</View>
			<View style={styles.timelineContent}>
				{withPerson && (
					<Text style={styles.personName}>{personLabel(item)}</Text>
				)}
				<View style={styles.timelineHeader}>
					<Text style={styles.timelineDate}>
						{new Date(item.timestamp).toLocaleString()}
					</Text>
				</View>

				{/* Add Context saves the current color as both old and new */}
				{item.type === 'add-reason' ||
				((!item.cardTypeChange || item.cardTypeChange === 'none') &&
					item.previousStatus === item.newStatus) ? (
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

						{/* Debug section to see raw attachment data
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
						</View> */}

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
											accessibilityRole='button'
											accessibilityLabel='Play video'
											onPress={() => setVideoUrl(attachment.url)}>
											<View style={styles.videoThumbnail}>
												<Feather name='play-circle' size={40} color={colors.white} />
												<Text style={styles.videoLabel}>VIDEO</Text>
											</View>
										</TouchableOpacity>
									);
								} else if (attachment.type === 'audio') {
									return (
										<AudioAttachment
											key={`attachment-${i}`}
											url={attachment.url}
											duration={attachment.duration}
											audio={audio}
											style={styles.audioButton}
										/>
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
	const { width, height } = useWindowDimensions();
	const isPortrait = height >= width;
	return (
		<View style={styles.container}>
			<View style={isPortrait ? styles.header : styles.headerHorizontal}>
				<View style={styles.headerText}>
					<Text style={styles.headerTitle}>{flagTitle}</Text>
					{flagDescription ? (
						<Text style={styles.headerDescription}>{flagDescription}</Text>
					) : null}
				</View>
				<View
					style={
						isPortrait
							? styles.headerButtons
							: styles.headerButtonsHorizontal
					}>
					<View style={styles.addButton}>
						<AppButton title='Add Context' onPress={onAddReason} />
					</View>
					<CloseButton onPress={onClose} />
				</View>
			</View>

			{showTabs && (
				<View style={styles.tabs} accessibilityRole='tablist'>
					{(
						[
							['person', 'This person'],
							['everyone', 'Everyone'],
						] as const
					).map(([key, label]) => {
						const selected = tab === key;
						return (
							<Pressable
								key={key}
								accessibilityRole='tab'
								accessibilityLabel={label}
								accessibilityState={{ selected }}
								onPress={() => setTab(key)}
								style={[styles.tab, selected && styles.tabSelected]}>
								<Text
									style={[
										styles.tabText,
										selected && styles.tabTextSelected,
									]}>
									{label}
								</Text>
							</Pressable>
						);
					})}
				</View>
			)}

			{tab === 'everyone' ? (
				everyoneError ? (
					<View style={styles.emptyContainer}>
						<Text style={styles.emptyText}>
							Couldn't load everyone's history. Check your connection.
						</Text>
						<View style={styles.retryButton}>
							<AppButton
								title='Try Again'
								variant='secondary'
								onPress={() => setEveryoneError(false)}
							/>
						</View>
					</View>
				) : everyone === null ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size='large' color='#4A90E2' />
						<Text style={styles.loadingText}>Loading history...</Text>
					</View>
				) : everyone.length === 0 ? (
					<View style={styles.emptyContainer}>
						<Text style={styles.emptyText}>
							No one else has history on this card yet.
						</Text>
					</View>
				) : (
					<FlatList
						data={everyone}
						renderItem={renderHistoryItem(everyone, true)}
						keyExtractor={(item, index) =>
							`everyone-${item._id || index}`
						}
						contentContainerStyle={styles.listContent}
					/>
				)
			) : loading ? (
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
					renderItem={renderHistoryItem(history)}
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
			{videoUrl && (
				<VideoPlayerModal url={videoUrl} onClose={() => setVideoUrl(null)} />
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
		margin: 5,
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
	headerHorizontal: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
		alignItems: 'center',
		padding: 1,
		paddingHorizontal: 30,
		backgroundColor: '#f0f0f0',
		borderBottomWidth: 1,
		borderBottomColor: '#ccc',
	},
	headerTitle: {
		fontSize: 18,
		fontWeight: 'bold',
	},
	// Title and description stack, so in landscape they don't squeeze the buttons
	headerText: {
		flexShrink: 1,
		alignItems: 'center',
	},
	headerDescription: {
		fontSize: 14,
		color: colors.bay,
		textAlign: 'center',
		marginTop: 4,
	},
	headerButtons: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		alignItems: 'center',
		width: '100%',
		marginTop: 10,
	},
	headerButtonsHorizontal: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		alignItems: 'center',
		paddingHorizontal: 30,
		paddingTop: 10,
		marginBottom: 10,
		width: '100%',
		marginTop: 10,
	},
	addButton: {
		marginRight: 8,
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
	tabs: {
		flexDirection: 'row',
		margin: 12,
		borderWidth: 2,
		borderColor: colors.blurple,
		borderRadius: 8,
		overflow: 'hidden',
	},
	tab: {
		flex: 1,
		minHeight: 44,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.white,
	},
	tabSelected: {
		backgroundColor: colors.blurple,
	},
	tabText: {
		fontSize: 16,
		fontWeight: '600',
		color: colors.blurple,
	},
	tabTextSelected: {
		color: colors.white,
	},
	retryButton: {
		marginTop: 12,
	},
	personName: {
		fontSize: 15,
		fontWeight: 'bold',
		color: '#fff',
		marginBottom: 4,
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
		backgroundColor: '#282828',
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
