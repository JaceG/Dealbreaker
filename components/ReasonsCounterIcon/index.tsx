import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

/**
 * A component that displays a counter for the number of reasons/comments
 * associated with a flag item
 */
const ReasonsCounterIcon = ({ count = 0 }) => {
  if (count <= 0) return null

  return (
    <View style={styles.container}>
      <Text style={styles.count}>{count}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#007bff',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4
  },
  count: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  }
})

export default ReasonsCounterIcon
