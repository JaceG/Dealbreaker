// Create a navigation reference that can be used to navigate from outside of components
import { createRef } from 'react'

export const navigationRef = createRef()

// Function to navigate from anywhere in the app
export const navigate = (name, params) => {
  if (navigationRef.current) {
    // Log navigation attempt for debugging
    console.log(`Navigating to ${name} with params:`, params)
    navigationRef.current.navigate(name, params)
  } else {
    console.error('Navigation ref is not set')
  }
}

// Function to reset navigation state
export const reset = state => {
  if (navigationRef.current) {
    console.log('Resetting navigation to state:', state)
    navigationRef.current.reset(state)
  } else {
    console.error('Navigation ref is not set')
  }
}

// Function to go back
export const goBack = () => {
  if (navigationRef.current) {
    console.log('Going back in navigation')
    navigationRef.current.goBack()
  } else {
    console.error('Navigation ref is not set')
  }
}
