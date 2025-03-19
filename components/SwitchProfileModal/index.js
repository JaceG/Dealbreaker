import { Dropdown } from 'react-native-element-dropdown'
import { StyleSheet, Modal, View, Text, Alert } from 'react-native'
import { useState, useContext, useEffect } from 'react'
import AppButton from '../AppButton'
import StoreContext from '../../store'
import { useNavigation } from '@react-navigation/native'

function SwitchProfileModal({ visible, onClose }) {
  // Move all context usage to the top level of the component
  const {
    currentProfile,
    setCurrentProfile,
    profile,
    ensureProfileExists,
    deleteProfile
  } = useContext(StoreContext)

  const [value, setValue] = useState(null)
  const [isFocus, setIsFocus] = useState(false)
  const [data, setData] = useState([])
  const navigation = useNavigation()

  // Update dropdown data and selected value when modal becomes visible
  useEffect(() => {
    if (visible) {
      setData(profile.map(item => ({ label: item, value: item })))
      setValue(currentProfile)
    }
  }, [profile, currentProfile, visible])

  // Check if a profile can be deleted (not main and not the only profile)
  const canDeleteProfile = profileName => {
    return profileName !== 'main' && profile.length > 1
  }

  // Handle profile change with proper error handling
  const handleProfileChange = () => {
    if (!value || value === currentProfile) {
      onClose()
      return
    }

    // Close modal first for better UX
    onClose()

    // Ensure profile exists before switching
    ensureProfileExists(value)

    // Change the profile
    setCurrentProfile(value)

    // Force the UI to refresh
    setTimeout(() => {
      navigation.navigate('Flags List', { refresh: Date.now() })
    }, 100)
  }

  // Handle profile deletion
  const handleDeleteProfile = () => {
    // Extra protection - don't allow deleting main profile or if only one profile exists
    if (!canDeleteProfile(value)) {
      console.log(
        'Prevented attempt to delete profile - either main or only profile'
      )
      return
    }

    // Show confirmation alert
    Alert.alert(
      'Delete Profile',
      `Are you sure you want to delete the "${value}" profile? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Final safety check before deletion
            if (!canDeleteProfile(value)) {
              console.error('Attempted to delete protected profile - prevented')
              return
            }

            // Close modal first
            onClose()

            // Delete the profile
            const success = deleteProfile(value)

            if (success) {
              // Show success message
              Alert.alert(
                'Success',
                `Profile "${value}" was deleted successfully.`
              )

              // Force UI refresh
              navigation.navigate('Flags List', { refresh: Date.now() })
            }
          }
        }
      ]
    )
  }

  return (
    <Modal visible={visible} animationType='slide'>
      <View style={styles.modalContainer}>
        <View style={styles.modalInnerContainer}>
          <Text style={styles.modalTitle}>Switch Profile</Text>
          <Dropdown
            data={data}
            style={[styles.dropdown, isFocus && { borderColor: 'blue' }]}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            inputSearchStyle={styles.inputSearchStyle}
            iconStyle={styles.iconStyle}
            search
            maxHeight={300}
            labelField='label'
            valueField='value'
            placeholder={!isFocus ? 'Select profile' : '...'}
            searchPlaceholder='Search...'
            value={value}
            onFocus={() => setIsFocus(true)}
            onBlur={() => setIsFocus(false)}
            onChange={item => {
              setValue(item.value)
              setIsFocus(false)
            }}
          />
          <View style={styles.buttonContainer}>
            <AppButton title='Select Profile' onPress={handleProfileChange} />
            {canDeleteProfile(value) ? (
              <AppButton
                title='Delete Profile'
                onPress={handleDeleteProfile}
                color='#d9534f'
              />
            ) : null}
            <AppButton title='Close' onPress={onClose} color='#6c757d' />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16
  },
  dropdown: {
    height: 50,
    width: '200',
    borderColor: 'gray',
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 8
  },
  icon: {
    marginRight: 5
  },
  label: {
    position: 'absolute',
    backgroundColor: 'white',
    left: 22,
    top: 8,
    zIndex: 999,
    paddingHorizontal: 8,
    fontSize: 14
  },
  placeholderStyle: {
    fontSize: 16
  },
  selectedTextStyle: {
    fontSize: 16
  },
  iconStyle: {
    width: 20,
    height: 20
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10
  },
  buttonContainer: {
    flexDirection: 'column',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'stretch',
    marginTop: 20,
    gap: 10
  },
  modalInnerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold'
  }
})

export default SwitchProfileModal
