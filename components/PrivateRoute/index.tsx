import React from 'react'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { useAuth } from '../../context/Auth'

// Component to render authenticated routes
const PrivateRoute = ({ children, redirectTo = 'Auth' }) => {
  const { isAuthenticated, isLoading } = useAuth()

  // If loading, show a spinner
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size='large' color='#007bff' />
      </View>
    )
  }

  // If not authenticated, redirect to the specified route
  if (!isAuthenticated) {
    // We're using React Navigation, so we need to return null and handle redirection in App.js
    return null
  }

  // If authenticated, render the children
  return children
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  }
})

export default PrivateRoute
