import React, { useEffect, useState, useCallback, memo, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert
} from 'react-native'
import { getFlagHistory } from '../../utils/mongodb'
import AppButton from '../AppButton'
import { showToast, imageUtils } from '../../utils/functions'

// Feature flags to disable native modules
const AUDIO_ENABLED = false
const IMAGE_PREVIEW_ENABLED = true

// Only import if feature is enabled
let ImagePreviewModal = null
if (IMAGE_PREVIEW_ENABLED) {
  try {
    ImagePreviewModal = require('../ImagePreviewModal').default
    console.log('ImagePreviewModal loaded successfully')
  } catch (error) {
    console.log('ImagePreviewModal not available:', error.message)
  }
}

// Instead of directly importing Audio, which causes a crash
// We'll create a feature flag to conditionally enable audio features
let Audio = null

// Try to load Audio module only if enabled
if (AUDIO_ENABLED) {
  try {
    Audio = require('expo-av').Audio
    console.log('Audio module loaded successfully')
  } catch (error) {
    console.log('Audio module not available:', error.message)
  }
}

const FlagHistoryTimeline = ({
  profileId,
  flagId,
  flagTitle,
  onClose,
  onAddReason
}) => {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [previewImage, setPreviewImage] = useState(null)
  const [previewVisible, setPreviewVisible] = useState(false)

  // Audio playback states - only used if Audio is available
  const [sound, setSound] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackPosition, setPlaybackPosition] = useState(0)
  const [playingAttachmentId, setPlayingAttachmentId] = useState(null)

  useEffect(() => {
    loadHistory()
  }, [profileId, flagId])

  // Clean up sound resources when component unmounts - only if Audio is available
  useEffect(() => {
    return () => {
      if (AUDIO_ENABLED && sound) {
        stopPlayback()
      }
    }
  }, [])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const historyData = await getFlagHistory(profileId, flagId)
      setHistory(historyData)
    } catch (error) {
      console.error('Error loading flag history:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImagePress = imageUrl => {
    if (!IMAGE_PREVIEW_ENABLED) {
      // If image preview is disabled, just show an alert
      Alert.alert(
        'Image Preview',
        'Image viewer is not available in this version.',
        [{ text: 'OK' }]
      )
      return
    }

    setPreviewImage(imageUrl)
    setPreviewVisible(true)
  }

  const closeImagePreview = () => {
    setPreviewVisible(false)
    setPreviewImage(null)
  }

  // Play audio attachment - only if Audio is available
  const playAudio = async (attachmentId, uri) => {
    if (!AUDIO_ENABLED || !Audio) {
      showToast('error', 'Audio playback is not available')
      return
    }

    try {
      // Stop current playback if any
      await stopPlayback()

      console.log('Loading sound from URI:', uri)
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      )

      setSound(newSound)
      setIsPlaying(true)
      setPlayingAttachmentId(attachmentId)

      // Play the sound
      await newSound.playAsync()
    } catch (error) {
      console.error('Failed to play audio:', error)
      setIsPlaying(false)
      setPlayingAttachmentId(null)
      Alert.alert('Error', 'Failed to play audio')
    }
  }

  // Stop audio playback - only if Audio is available
  const stopPlayback = async () => {
    if (!AUDIO_ENABLED || !Audio || !sound) return

    try {
      await sound.stopAsync()
      await sound.unloadAsync()
    } catch (error) {
      console.error('Error stopping sound:', error)
    }

    setSound(null)
    setIsPlaying(false)
    setPlaybackPosition(0)
    setPlayingAttachmentId(null)
  }

  // Track playback status - only if Audio is available
  const onPlaybackStatusUpdate = status => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis / 1000)

      if (status.didJustFinish) {
        // Playback finished
        stopPlayback()
      }
    }
  }

  const getStatusColor = status => {
    switch (status) {
      case 'white':
        return '#f0f0f0'
      case 'yellow':
        return '#FFD700'
      case 'red':
        return '#FF0000'
      default:
        return '#cccccc'
    }
  }

  const getStatusColorText = status => {
    switch (status) {
      case 'white':
        return '#000000'
      case 'yellow':
        return '#000000'
      case 'red':
        return '#FFFFFF'
      default:
        return '#000000'
    }
  }

  const formatDate = dateString => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Helper function to get color based on flag status
  const getColorForFlag = flag => {
    switch (flag?.toLowerCase()) {
      case 'red':
        return '#e74c3c'
      case 'yellow':
        return '#f1c40f'
      case 'green':
        return '#2ecc71'
      case 'white':
      default:
        return '#ecf0f1'
    }
  }

  // Helper function to get text color for a flag status (for contrast)
  const getTextColorForFlag = flag => {
    switch (flag?.toLowerCase()) {
      case 'yellow':
      case 'green':
      case 'white':
        return '#000000'
      case 'red':
      default:
        return '#ffffff'
    }
  }

  const renderHistoryItem = ({ item, index }) => (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        <View style={styles.timelineBullet} />
        {index < history.length - 1 && <View style={styles.timelineLine} />}
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
        ) : (
          <View style={styles.flagStatusRow}>
            <Text style={styles.flagStatusLabel}>Flag changed: </Text>
            <Text
              style={[
                styles.flagStatusText,
                { color: getColorForFlag(item.previousStatus) }
              ]}>
              {item.previousStatus || 'none'}
            </Text>
            <Text style={styles.flagStatusArrow}> → </Text>
            <Text
              style={[
                styles.flagStatusText,
                { color: getColorForFlag(item.newStatus) }
              ]}>
              {item.newStatus}
            </Text>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: getColorForFlag(item.newStatus) }
              ]}
            />
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
            <Text style={styles.attachmentsTitle}>Attachments:</Text>
            <View style={styles.attachmentsGrid}>
              {item.attachments.map((attachment, i) => {
                if (attachment.type === 'image') {
                  return (
                    <TouchableOpacity
                      key={`attachment-${i}`}
                      style={styles.attachmentThumbnail}
                      onPress={() => handleImagePress(attachment.url)}>
                      <Image
                        source={{ uri: attachment.url }}
                        style={styles.thumbnailImage}
                        resizeMode='cover'
                      />
                    </TouchableOpacity>
                  )
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
                        )
                      }}>
                      <View style={styles.videoThumbnail}>
                        <Text style={styles.videoLabel}>VIDEO</Text>
                      </View>
                    </TouchableOpacity>
                  )
                } else if (attachment.type === 'audio') {
                  const isCurrentlyPlaying =
                    playingAttachmentId === `${item.id}-${i}`

                  return (
                    <TouchableOpacity
                      key={`attachment-${i}`}
                      style={styles.audioButton}
                      onPress={() =>
                        isCurrentlyPlaying
                          ? stopPlayback()
                          : playAudio(`${item.id}-${i}`, attachment.url)
                      }>
                      <Text style={styles.audioButtonText}>
                        {isCurrentlyPlaying ? '■ Stop' : '▶ Play'}
                        {' Audio'}
                      </Text>
                      {attachment.duration && (
                        <Text style={styles.audioDuration}>
                          {Math.floor(attachment.duration / 60)}:
                          {(attachment.duration % 60)
                            .toString()
                            .padStart(2, '0')}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )
                }
                return null
              })}
            </View>
          </View>
        )}
      </View>
    </View>
  )

  // Return early if no flagId
  if (!flagId && previewVisible) {
    console.log('FlagHistoryModal has no flagId but is visible, closing')
    closeImagePreview()
    return null
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{flagTitle}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.addButton} onPress={onAddReason}>
            <Text style={styles.addButtonText}>Add Context</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
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
          <Text style={styles.emptyText}>No history found for this flag.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item, index) => `history-${item._id || index}`}
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
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    margin: 10
  },
  header: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    marginTop: 10
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
    shadowRadius: 2
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#ff6b6b',
    borderRadius: 5
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666'
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    fontSize: 14,
    color: '#666'
  },
  listContent: {
    padding: 16
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center'
  },
  timelineBullet: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
    borderWidth: 2,
    borderColor: '#333'
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#ccc',
    marginTop: 4
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#ddd'
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  timelineDate: {
    fontSize: 12,
    color: '#666'
  },
  flagStatusRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  flagStatusLabel: {
    fontWeight: 'bold',
    marginRight: 8
  },
  flagStatusText: {
    fontWeight: 'bold',
    fontSize: 16
  },
  flagStatusArrow: {
    fontSize: 16,
    color: '#555',
    marginHorizontal: 4
  },
  statusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
    marginLeft: 6
  },
  reasonContainer: {
    marginTop: 8,
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4
  },
  reasonTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4
  },
  reasonText: {
    fontSize: 14
  },
  attachmentsContainer: {
    marginTop: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    padding: 10
  },
  attachmentsTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 8
  },
  attachmentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
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
    backgroundColor: '#fff'
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#282828'
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center'
  },
  videoLabel: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold'
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f1f9fe',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#cfe7fa',
    width: '100%'
  },
  audioButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  audioDuration: {
    fontSize: 12,
    color: '#666'
  }
})

export default FlagHistoryTimeline
