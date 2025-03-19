import React, { useState, useEffect } from 'react'
import { Image, Pressable, View } from 'react-native'

export const Flag = ({ color, onFlagClicked, item }) => {
  const whiteFlag = 'white'
  const yellowFlag = 'yellow'
  const redFlag = 'red'
  const [flagColor, setFlagColor] = useState(whiteFlag)

  // Update flag color whenever item changes or when the component rerenders
  useEffect(() => {
    if (item) {
      const selectedItem = item.row()
      // Make sure we're using the latest flag value from the item
      if (selectedItem && selectedItem.flag) {
        setFlagColor(selectedItem.flag)
      }
    }
  }, [item])

  return (
    <View>
      <Pressable
        onPress={() => {
          let flag
          if (flagColor === yellowFlag) {
            flag = redFlag
          } else if (flagColor === redFlag) {
            flag = whiteFlag
          } else {
            flag = yellowFlag
          }
          setFlagColor(flag)
          onFlagClicked(flag, item)
        }}>
        <Image
          style={{
            tintColor: flagColor,
            width: 25,
            height: 25
          }}
          source={require('../../assets/icons/flag.png')}
        />
      </Pressable>
    </View>
  )
}
