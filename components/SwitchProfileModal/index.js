import { Dropdown } from 'react-native-element-dropdown'
import { StyleSheet, Modal, View, Text } from 'react-native'
import { useState, useContext, useEffect } from 'react'
import AppButton from '../AppButton'
import StoreContext from '../../store'
import { useNavigation } from '@react-navigation/native'

function SwitchProfileModal({ visible, onClose }) {
  // Move all context usage to the top level of the component
  const { currentProfile, setCurrentProfile, profile, ensureProfileExists } =
    useContext(StoreContext)

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
            <AppButton title='Close' onPress={onClose} />
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
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
