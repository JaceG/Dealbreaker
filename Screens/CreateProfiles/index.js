import { StyleSheet, Text, View, TextInput, Button } from 'react-native'
import { color } from 'react-native-reanimated'
import { useMemo, useState, useContext, useCallback } from 'react'
import { showToast } from '../../utils/functions'
import { set } from 'react-native-reanimated'
import StoreContext from '../../store'
import { useFocusEffect } from '@react-navigation/native'

export default function CreateUsers({ navigation }) {
  const { profiles, createProfile } = useContext(StoreContext)

  const [name, setName] = useState('')
  const [error, setError] = useState({
    name: ''
  })

  // Reset form when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('Create Profile screen focused - resetting form')
      setName('')
      setError({
        name: ''
      })

      return () => {
        // Clean up when screen is unfocused
      }
    }, [])
  )

  function handleSubmit() {
    if (validate()) {
      // Check if profile name already exists
      if (profiles.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        showToast('error', 'Profile name already exists')
        return
      }

      // Create new profile with a unique ID
      const newProfileId = createProfile(name)

      if (newProfileId) {
        showToast('success', 'Profile created successfully')
        setName('')

        // Navigate with a refresh param to ensure UI updates
        navigation.navigate('Flags List', { refresh: Date.now() })
      } else {
        showToast('error', 'Failed to create profile')
      }
    } else showToast('error', 'Fix the following errors')
  }

  function handleNameChange(text) {
    setName(text)
    handleValidation('name', text)
  }

  function handleValidation(
    type,
    text = '',
    isShow = true,
    initialError = null
  ) {
    let newError = {
      name: initialError ? initialError.name : error.name
    }
    newError[type] = ''
    if (!text && type === 'name') {
      newError[type] = `${type} is required`
    }
    if (text && type === 'name' && text.toLowerCase() === 'main') {
      newError[type] = `Cannot use 'main' as a profile name`
    }
    if (text && type === 'name' && text.length > 50) {
      newError[type] = `${type} too long`
    }
    if (isShow) setError(newError)

    return newError
  }

  function validate() {
    let newError = handleValidation('name', name, false, error)
    setError(newError)
    const errorList = Object.values(newError)
    return !errorList.find(item => item)
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.text}>Name:</Text>
        <TextInput
          value={name}
          onChangeText={handleNameChange}
          style={styles.textInput}
          placeholder='Enter Name'
          placeholderTextColor={'white'}
        />
        {error.name ? <Text style={styles.errorText}>{error.name}</Text> : null}
      </View>
      <View style={{ width: '100%', marginTop: 20 }}>
        <Button color={'white'} title='Create' onPress={handleSubmit} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'blue',
    padding: 10
  },
  row: {
    flexDirection: 'column',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  textInput: {
    padding: 13,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 5,
    width: '100%'
  },
  text: {
    fontSize: 20,
    marginBottom: 10,
    fontWeight: 'bold',
    color: '#fff'
  },
  description: {
    height: 120,
    textAlignVertical: 'top',
    color: '#fff'
  },
  radioButtonStyle: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 3,
    marginBottom: 3
  }
})
