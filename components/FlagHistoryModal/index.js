import React, { useState } from 'react'
import { Modal, View, StyleSheet, TouchableOpacity, Text } from 'react-native'
import FlagHistoryTimeline from '../FlagHistoryTimeline'

const FlagHistoryModal = ({
  visible,
  onClose,
  profileId,
  flagId,
  flagTitle
}) => {
  return (
    <Modal
      animationType='slide'
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <FlagHistoryTimeline
            profileId={profileId}
            flagId={flagId}
            flagTitle={flagTitle}
            onClose={onClose}
          />
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
    height: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden'
  }
})

export default FlagHistoryModal
