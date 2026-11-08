import React, { useState, useEffect } from 'react';
import {
	Modal,
	View,
	StyleSheet,
	TextInput,
	Text,
	TouchableOpacity,
	Image,
	ScrollView,
	Alert,
	Linking,
	Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import Feather from '@expo/vector-icons/Feather';
import { showToast, uploadToS3 } from '../../utils';
import { imageUtils } from '../../utils/functions';
import AppButton from '../AppButton';
import { SimpleAttachment } from '../../models';
import { colors } from '../../libs/board/constants';
import AudioAttachment from '../MediaPlayer/AudioAttachment';
import VideoPlayerModal from '../MediaPlayer/VideoPlayerModal';
import VoiceMemoRecorder from '../MediaPlayer/VoiceMemoRecorder';
import { useAttachmentAudio } from '../MediaPlayer/useAttachmentAudio';

const ReasonInputModal = ({
	visible,
	onClose,
	onSubmit,
	flagTitle,
	prevStatus,
	newStatus,
	modalTitle,
}: {
	visible: boolean;
	onClose: () => void;
	onSubmit: (reason: string, attachments: SimpleAttachment[]) => void;
	flagTitle: string;
	prevStatus: string;
	newStatus: string;
	modalTitle?: string;
}) => {
	const [reason, setReason] = useState('');
	const [attachments, setAttachments] = useState<SimpleAttachment[]>([]);
	const [recording, setRecording] = useState(false);
	const [videoUrl, setVideoUrl] = useState<string | null>(null);
	const audio = useAttachmentAudio();

	// Add state to track submission progress
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (visible) {
			setReason('');
			setAttachments([]);
			return;
		}
		// Closing the popup discards a recording in progress and stops any memo or video.
		setRecording(false);
		setVideoUrl(null);
		audio.stop();
	}, [visible]);

	const startVoiceMemo = async () => {
		const { granted } = await requestRecordingPermissionsAsync();
		if (!granted) {
			Alert.alert(
				'Microphone is off',
				'To record a voice memo, allow microphone access for Dealbreaker in Settings.',
				[
					{ text: 'Not now', style: 'cancel' },
					{ text: 'Open Settings', onPress: () => Linking.openSettings() },
				]
			);
			return;
		}
		audio.stop();
		setRecording(true);
	};

	const addVoiceMemo = (uri: string, seconds: number) => {
		setRecording(false);
		setAttachments((prev) => [
			...prev,
			{
				type: 'audio',
				url: uri,
				name: `voice-memo-${Date.now()}.m4a`,
				timestamp: new Date().toISOString(),
				duration: seconds,
			},
		]);
	};

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
			const processedAttachments: SimpleAttachment[] = [];
			// Uploads that failed for a reason a retry can fix (server asleep, offline). Nothing is saved while any remain.
			const failedUploads: SimpleAttachment[] = [];

			// Upload any image attachments to S3
			for (let i = 0; i < attachments.length; i++) {
				const attachment = attachments[i];
				console.log(
					`SUBMIT: Processing attachment ${i}, type: ${
						attachment.type
					}, URL: ${attachment.url.substring(0, 50)}...`
				);

				// Already uploaded on an earlier try: keep it as is.
				if (/^https?:\/\//.test(attachment.url)) {
					processedAttachments.push(attachment);
					continue;
				}
				// Photos, videos and voice memos all go to S3; a phone-local file:// path breaks on any other device.
				if (['image', 'video', 'audio'].includes(attachment.type)) {
					console.log(
						`SUBMIT: Uploading ${attachment.type} attachment ${i} to S3...`
					);
					try {
						// Generate a unique filename that keeps the file's own extension
						const timestamp = Date.now();
						// The picker names every video .mp4 and photo .jpg, so the real extension comes from the file path.
						const extOf = (path = '') => {
							const last = path.split('?')[0].split('/').pop() || '';
							return last.includes('.') ? last.split('.').pop()!.toLowerCase() : '';
						};
						const extension =
							extOf(attachment.url) || extOf(attachment.name) || 'jpg';
						const filename = `attachment_${timestamp}_${i}.${extension}`;

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
								duration: attachment.duration,
							});
							console.log(
								`SUBMIT: Successfully added S3 attachment to processedAttachments list`
							);
						} else {
							console.error(
								`SUBMIT: S3 Upload Failed: No URL returned for ${filename}`
							);
							// Show a toast notification about the upload failure
							failedUploads.push(attachment);
						}
					} catch (error: any) {
						console.error(
							`SUBMIT: Error uploading attachment ${i} to S3:`,
							error
						);
						// Too big to upload: leave it off rather than save a path only this phone can open.
						if (error?.name === 'FileTooLargeError') {
							showToast(
								'error',
								'Not attached',
								`This ${attachment.type} is over 10 MB, the upload limit`
							);
							continue;
						}
						failedUploads.push(attachment);
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

			// A local file path saved in history only works on this phone and can be cleared by iOS, so stop here:
			// keep the popup open with what uploaded (now remote) plus what didn't, and let the user try again.
			if (failedUploads.length > 0) {
				audio.stop(); // uploaded memos change URL below, so a playing one would lose its tile
				setAttachments([...processedAttachments, ...failedUploads]);
				Alert.alert(
					'Upload Failed',
					`${failedUploads.length === 1 ? 'An attachment' : `${failedUploads.length} attachments`} couldn't upload. The server may be waking up or you may be offline. Try again in a moment, or remove ${failedUploads.length === 1 ? 'it' : 'them'} to save without.`
				);
				return;
			}

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

	const pickMedia = async () => {
		try {
			const permissionResult =
				await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (!permissionResult.granted) {
				showToast('error', 'Permission to access media library was denied');
				return;
			}

			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ['images', 'videos'],
				allowsMultipleSelection: true,
				aspect: [4, 3],
				quality: 0.8,
			});
			if (result.canceled || !result.assets?.length) return;

			setAttachments((prev) => [
				...prev,
				...result.assets.map((asset, i): SimpleAttachment => {
					const type =
						asset.uri.endsWith('.mp4') || asset.type === 'video'
							? 'video'
							: 'image';
					return {
						type,
						url: asset.uri,
						name: `media-${Date.now()}-${prev.length + i}.${
							type === 'video' ? 'mp4' : 'jpg'
						}`,
						timestamp: new Date().toISOString(),
						// The picker reports video length in milliseconds
						duration: asset.duration ? Math.round(asset.duration / 1000) : undefined,
						needsProcessing: type === 'image',
					};
				}),
			]);
			showToast(
				'success',
				`Added ${result.assets.length} ${
					result.assets.length === 1 ? 'item' : 'items'
				}`
			);
		} catch (error) {
			console.error('MEDIA PICKER: Error using ImagePicker:', error);
			showToast('error', 'Could not open the media library');
		}
	};

	const removeAttachment = (index: number) => {
		const newAttachments = [...attachments];
		newAttachments.splice(index, 1);
		setAttachments(newAttachments);
	};

	const getStatusText = (status: string) => {
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

	const getStatusColor = (status: string) => {
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
			supportedOrientations={[
				'portrait',
				'portrait-upside-down',
				'landscape',
				'landscape-left',
				'landscape-right',
			]}
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
									Photos, Videos & Voice
								</Text>
								<Text style={styles.optionalText}>(Optional)</Text>
							</View>
							<Text style={styles.attachmentHelperText}>
								Add photos, videos or a voice memo for more context
							</Text>

							{recording ? (
								<VoiceMemoRecorder
									onDone={addVoiceMemo}
									onCancel={() => setRecording(false)}
								/>
							) : (
								<View style={styles.mediaButtonsRow}>
									<TouchableOpacity
										style={styles.mediaButton}
										accessibilityRole='button'
										accessibilityLabel='Add photo or video'
										onPress={pickMedia}>
										<Feather name='image' size={20} color={colors.white} />
										<Text style={styles.mediaButtonText}>PHOTO/VIDEO</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[styles.mediaButton, styles.recordButton]}
										accessibilityRole='button'
										accessibilityLabel='Record voice memo'
										onPress={startVoiceMemo}>
										<Feather name='mic' size={20} color={colors.white} />
										<Text style={styles.mediaButtonText}>VOICE MEMO</Text>
									</TouchableOpacity>
								</View>
							)}

							{attachments.length > 0 ? (
								<View style={styles.attachmentPreviewContainer}>
									{attachments.map((attachment, index) => (
										<View key={index} style={styles.attachmentPreview}>
											{attachment.type === 'image' ? (
												<Image
													source={{ uri: attachment.url }}
													style={styles.attachmentImage}
												/>
											) : attachment.type === 'video' ? (
												<Pressable
													accessibilityRole='button'
													accessibilityLabel='Play video'
													// Playback switches the audio session out of record mode, which ends a recording.
													disabled={recording}
													accessibilityState={{ disabled: recording }}
													onPress={() => setVideoUrl(attachment.url)}
													style={styles.videoTile}>
													<Feather name='play-circle' size={36} color={colors.white} />
													<Text style={styles.videoLabel}>
														{attachment.duration
															? imageUtils.formatDuration(attachment.duration)
															: 'Video'}
													</Text>
												</Pressable>
											) : (
												<AudioAttachment
													url={attachment.url}
													duration={attachment.duration}
													audio={audio}
													style={styles.audioTile}
													disabled={recording}
												/>
											)}
											<TouchableOpacity
												style={styles.removeAttachmentButton}
												accessibilityRole='button'
												accessibilityLabel={`Remove ${
													attachment.type === 'audio' ? 'voice memo' : attachment.type
												}`}
												hitSlop={10}
												onPress={() => {
													if (audio.url === attachment.url) audio.stop();
													removeAttachment(index);
												}}>
												<Text style={styles.removeAttachmentText}>✕</Text>
											</TouchableOpacity>
										</View>
									))}
								</View>
							) : (
								<View style={styles.noAttachmentsContainer}>
									<Text style={styles.noAttachmentsText}>
										No media attached yet.
									</Text>
								</View>
							)}
						</View>
					</ScrollView>

					<View style={styles.footer}>
						<View style={styles.footerButton}>
							<AppButton
								title='Cancel'
								variant='secondary'
								onPress={() => {
									// Discard a recording in progress and stop playback
									setRecording(false);
									audio.stop();
									setReason('');
									setAttachments([]);
									onClose();
								}}
							/>
						</View>
						<View style={styles.footerButton}>
							<AppButton
								title='Submit'
								onPress={handleSubmit}
								loading={isSubmitting}
								disabled={recording}
							/>
						</View>
					</View>
				</View>
				{videoUrl && (
					<VideoPlayerModal url={videoUrl} onClose={() => setVideoUrl(null)} />
				)}
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
	footerButton: {
		flex: 1,
		margin: 5,
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
		minHeight: 48,
		gap: 6,
	},
	recordButton: {
		backgroundColor: '#E74C3C',
	},
	mediaButtonText: {
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
	videoTile: {
		width: '100%',
		height: '100%',
		borderRadius: 5,
		backgroundColor: '#282828',
		alignItems: 'center',
		justifyContent: 'center',
	},
	videoLabel: {
		color: 'white',
		fontSize: 10,
		fontWeight: 'bold',
		marginTop: 4,
	},
	audioTile: {
		width: '100%',
		height: '100%',
		flexDirection: 'column',
		justifyContent: 'center',
		borderRadius: 5,
		borderWidth: 1,
		borderColor: '#ddd',
		backgroundColor: '#F7F9FA',
	},
});

export default ReasonInputModal;