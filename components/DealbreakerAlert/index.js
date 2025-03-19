import React from 'react'
import { StyleSheet, View, Text, Modal, TouchableOpacity } from 'react-native'
import AppButton from '../AppButton'

const DealbreakerAlert = ({ visible, onClose, onUndo, itemTitle }) => {
  return (
    <Modal
      animationType='fade'
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <Text style={styles.modalTitle}>Dealbreaker Alert!</Text>

          <Text style={styles.modalText}>
            <Text style={styles.itemName}>"{itemTitle}"</Text> has been
            automatically moved to your dealbreaker list because it's marked as
            a dealbreaker on the main profile.
          </Text>

          <View style={styles.buttonContainer}>
            <View style={styles.buttonWrapper}>
              <AppButton
                title='Keep as Dealbreaker'
                onPress={onClose}
                color='#d9534f'
              />
            </View>
            <View style={styles.buttonWrapper}>
              <AppButton title='Undo' onPress={onUndo} color='#5bc0de' />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalView: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  alertIcon: {
    fontSize: 40,
    marginBottom: 10
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#d9534f'
  },
  modalText: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24
  },
  itemName: {
    fontWeight: 'bold'
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10
  },
  buttonWrapper: {
    flex: 1
  }
})

export default DealbreakerAlert
