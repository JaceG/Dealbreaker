import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image
} from 'react-native'
import { getFlagHistory } from '../../utils/mongodb'

const FlagHistoryTimeline = ({ profileId, flagId, flagTitle, onClose }) => {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [profileId, flagId])

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

  const renderHistoryItem = ({ item, index }) => (
    <View style={styles.historyItem}>
      <View style={styles.timeline}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: getStatusColor(item.newStatus) }
          ]}
        />
        {index < history.length - 1 && <View style={styles.timelineBar} />}
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.newStatus) }
          ]}>
          <Text
            style={[
              styles.statusText,
              { color: getStatusColorText(item.newStatus) }
            ]}>
            {item.newStatus.toUpperCase()}
          </Text>
        </View>

        <Text style={styles.changeText}>
          Changed from{' '}
          <Text
            style={{
              fontWeight: 'bold',
              color: getStatusColor(item.previousStatus)
            }}>
            {item.previousStatus.toUpperCase()}
          </Text>{' '}
          to{' '}
          <Text
            style={{
              fontWeight: 'bold',
              color: getStatusColor(item.newStatus)
            }}>
            {item.newStatus.toUpperCase()}
          </Text>
        </Text>

        {item.reason && (
          <View style={styles.reasonContainer}>
            <Text style={styles.reasonTitle}>Reason:</Text>
            <Text style={styles.reasonText}>{item.reason}</Text>
          </View>
        )}

        {item.attachments && item.attachments.length > 0 && (
          <View style={styles.attachmentsContainer}>
            {item.attachments.map((attachment, i) => (
              <View key={i} style={styles.attachment}>
                {attachment.type === 'image' ? (
                  <Image
                    source={{ uri: attachment.url }}
                    style={styles.attachmentImage}
                  />
                ) : (
                  <Text style={styles.attachmentText}>
                    {attachment.type} attachment
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{flagTitle} - History</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color='#0000ff' />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No history found for this flag</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item, index) =>
            item._id ? item._id.toString() : index.toString()
          }
          contentContainerStyle={styles.listContent}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold'
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
  historyItem: {
    flexDirection: 'row',
    marginBottom: 20
  },
  timeline: {
    width: 24,
    alignItems: 'center'
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333'
  },
  timelineBar: {
    width: 2,
    flex: 1,
    backgroundColor: '#ccc',
    marginTop: 4
  },
  contentContainer: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#ddd'
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8
  },
  statusText: {
    fontWeight: 'bold'
  },
  changeText: {
    fontSize: 14,
    marginBottom: 8
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
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  attachment: {
    marginRight: 8,
    marginBottom: 8
  },
  attachmentImage: {
    width: 80,
    height: 80,
    borderRadius: 4
  },
  attachmentText: {
    backgroundColor: '#eee',
    padding: 8,
    borderRadius: 4
  }
})

export default FlagHistoryTimeline
