import { StatusBar } from 'expo-status-bar'
import { useState, useContext, useEffect, useRef } from 'react'
import { StyleSheet, Text, View, Dimensions, Button } from 'react-native'
import { Board, BoardRepository } from '../../libs/board/components'
import StoreContext from '../../store'
import AppButton from '../../components/AppButton'
import SwitchProfileModal from '../../components/SwitchProfileModal'

const data = [
  {
    id: 1,
    name: 'Flags',
    rows: []
  },
  {
    id: 2,
    name: 'Dealbreakers',
    rows: []
  }
]

export default function Lists({ navigation }) {
  let ScreenHeight = Dimensions.get('window').height - 150
  const { dealbreaker, currentProfile, setDealbreaker } =
    useContext(StoreContext)
  const [visible, setVisible] = useState(false)
  const listIndexRef = useRef(new Map())
  const skipUpdateRef = useRef(false)

  useEffect(() => {
    if (
      dealbreaker &&
      (dealbreaker[currentProfile].dealbreaker?.length ||
        dealbreaker[currentProfile].flag?.length) &&
      !skipUpdateRef.current
    ) {
      setTimeout(() => {
        updateBoard()
      }, 100)
    } else {
      skipUpdateRef.current = false
    }
  }, [dealbreaker])

  const updateBoard = () => {
    if (skipUpdateRef.current) {
      skipUpdateRef.current = false
      return
    }
    const { flag, dealbreaker: dealbreakerList } = dealbreaker[currentProfile]
    listIndexRef.current = new Map()
    const newData = JSON.parse(JSON.stringify(data))
    newData[0].rows =
      flag.map((data, index) => {
        listIndexRef.current.set(data.id, index)
        return {
          id: index,
          name: data.title,
          description: data.description
        }
      }) || []
    newData[1].rows =
      dealbreakerList.map((data, index) => {
        return {
          id: index,
          name: data.title,
          description: data.description
        }
      }) || []
    setList(new BoardRepository(newData))
  }
  const updateListOrder = (newIndex, oldIndex) => {
    const { flag, dealbreaker: dealbreakerList } = dealbreaker[currentProfile]
    const newList = JSON.parse(JSON.stringify(flag))
    const oldItem = { ...newList[oldIndex] }
    newList.splice(oldIndex, 1)
    newList.splice(newIndex, 0, oldItem)
    const type = 'flag'
    skipUpdateRef.current = true
    listIndexRef.current = new Map()
    newList?.forEach((item, index) => {
      listIndexRef.current.set(item.id, index)
    })
    setDealbreaker({
      ...dealbreaker,
      [currentProfile]: {
        ...dealbreaker[currentProfile],
        [type]: newList
      }
    })
  }

  var Styles = StyleSheet.create({ container: { height: ScreenHeight } })

  const [list, setList] = useState(null)

  return (
    <View style={styles.container}>
      <SwitchProfileModal visible={visible} onClose={() => setVisible(false)} />
      <View>
        {list ? (
          <View>
            <View style={styles.profileButtonContainer}>
              <View style={styles.innerProfileButtonContainer}>
                <AppButton
                  title={`Switch Profile`}
                  onPress={() => {
                    setVisible(true)
                  }}
                />
                <Text style={styles.profileText}>{currentProfile}</Text>
              </View>
            </View>
            <Board
              boardRepository={list}
              open={() => {}}
              onDragEnd={(boardItemOne, boardItemTwo, draggedItem) => {
                const oldIndex = listIndexRef.current.get(
                  draggedItem.attributes.row.id
                )
                updateListOrder(draggedItem.attributes.index, oldIndex)
              }}
              isWithCountBadge={false}
              cardNameTextColor='white'
            />
          </View>
        ) : (
          <View style={styles.noDealbreakerContainer}>
            <View style={styles.noDealbreakerInContainer}>
              <Text style={styles.noDealbreakerText}>No Flags Yet</Text>
              <AppButton
                title='Create Flag'
                onPress={() => {
                  navigation.navigate('Create Flag')
                }}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  noDealbreakerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  noDealbreakerInContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  noDealbreakerText: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  profileButtonContainer: {
    flex: 0.7,
    marginTop: 10,
    width: 200,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center'
  },
  profileText: {
    fontSize: 16,
    fontWeight: 'bold',
    justifyContent: 'center',
    alignItems: 'center'
  },
  innerProfileButtonContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5
  }
})
