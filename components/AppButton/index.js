import { Pressable, StyleSheet, Text, View } from 'react-native'

const AppButton = ({ title, onPress, color = 'blue' }) => {
  return (
    <Pressable onPress={onPress}>
      <View style={[styles.container, { backgroundColor: color }]}>
        <Text style={styles.buttonText}>{title}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  }
})

export default AppButton
