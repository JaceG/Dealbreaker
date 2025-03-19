import React, { useState } from 'react'
import {
  Modal,
  View,
  StyleSheet,
  TextInput,
  Text,
  TouchableOpacity
} from 'react-native'

const ReasonInputModal = ({
  visible,
  onClose,
  onSubmit,
  flagTitle,
  prevStatus,
  newStatus
}) => {
  const [reason, setReason] = useState('')

  const handleSubmit = () => {
    onSubmit(reason)
    setReason('') // Clear after submission
  }

  const getStatusText = status => {
    switch (status) {
      case 'white':
        return 'WHITE'
      case 'yellow':
        return 'YELLOW'
      case 'red':
        return 'RED'
      default:
        return status.toUpperCase()
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

  return (
    <Modal
      animationType='slide'
      transparent={true}
      visible={visible}
      onRequestClose={() => onClose()}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Change Reason</Text>
          </View>

          <View style={styles.body}>
            <Text style={styles.flagTitle}>{flagTitle}</Text>

            <View style={styles.statusChange}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(prevStatus) }
                ]}>
                <Text style={styles.statusText}>
                  {getStatusText(prevStatus)}
                </Text>
              </View>
              <Text style={styles.arrow}>→</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(newStatus) }
                ]}>
                <Text style={styles.statusText}>
                  {getStatusText(newStatus)}
                </Text>
              </View>
            </View>

            <Text style={styles.label}>Why are you making this change?</Text>
            <TextInput
              style={styles.input}
              multiline
              numberOfLines={4}
              placeholder='Enter reason...'
              value={reason}
              onChangeText={setReason}
            />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setReason('')
                onClose()
              }}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden'
  },
  header: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  body: {
    padding: 20
  },
  flagTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  statusChange: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5
  },
  statusText: {
    fontWeight: 'bold'
  },
  arrow: {
    fontSize: 20,
    marginHorizontal: 10
  },
  label: {
    fontSize: 14,
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 80,
    textAlignVertical: 'top'
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  button: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5
  },
  cancelButton: {
    backgroundColor: '#e0e0e0'
  },
  submitButton: {
    backgroundColor: '#4CAF50'
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold'
  }
})

export default ReasonInputModal
