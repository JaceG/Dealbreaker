import React, { useState, useEffect, useRef } from 'react'
import { Image, Pressable, View } from 'react-native'

export const Flag = ({ color, onFlagClicked, item }) => {
  const whiteFlag = 'white'
  const yellowFlag = 'yellow'
  const redFlag = 'red'

  // Use a ref to track if this is the first render
  const isFirstRender = useRef(true)

  // Get the initial flag color from the item
  const getItemFlagColor = () => {
    if (item && item.row && item.row()) {
      return item.row().flag || whiteFlag
    }
    return whiteFlag
  }

  // Initialize with the item's flag color
  const [flagColor, setFlagColor] = useState(getItemFlagColor())

  // Update the flag color when the item changes
  useEffect(() => {
    // Get the current flag color from the item
    const currentColor = getItemFlagColor()

    // Only update if the color is different
    if (currentColor !== flagColor) {
      setFlagColor(currentColor)
    }

    // Mark that we're no longer on first render
    isFirstRender.current = false
  }, [item])

  const handleFlagClick = () => {
    let newFlag
    if (flagColor === yellowFlag) {
      newFlag = redFlag
    } else if (flagColor === redFlag) {
      newFlag = whiteFlag
    } else {
      newFlag = yellowFlag
    }

    // Update local state immediately
    setFlagColor(newFlag)

    // Notify parent of the change
    onFlagClicked(newFlag, item)
  }

  return (
    <View>
      <Pressable onPress={handleFlagClick}>
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
