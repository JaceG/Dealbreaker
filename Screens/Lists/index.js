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
  const flagListIndexRef = useRef(new Map())
  const skipUpdateRef = useRef(false)
  const dealbreakerListIndexRef = useRef(new Map())
  const isMountRef = useRef(false)

  useEffect(() => {
    if (
      dealbreaker &&
      (dealbreaker[currentProfile].dealbreaker?.length ||
        dealbreaker[currentProfile].flag?.length) &&
      !skipUpdateRef.current &&
      isMountRef.current
    ) {
      console.log('updateBoard')
      setTimeout(() => {
        updateBoard()
      }, 100)
    } else {
      skipUpdateRef.current = false
      isMountRef.current = true
    }
  }, [dealbreaker])

  const updateBoard = () => {
    if (skipUpdateRef.current) {
      skipUpdateRef.current = false
      return
    }
    const { flag, dealbreaker: dealbreakerList } = dealbreaker[currentProfile]
    flagListIndexRef.current = new Map()
    dealbreakerListIndexRef.current = new Map()
    const newData = JSON.parse(JSON.stringify(data))
    newData[0].rows =
      flag.map((data, index) => {
        flagListIndexRef.current.set(data.id, index)
        return {
          id: index,
          name: data.title,
          description: data.description
        }
      }) || []
    newData[1].rows =
      dealbreakerList.map((data, index) => {
        dealbreakerListIndexRef.current.set(data.id, index)
        return {
          id: index,
          name: data.title,
          description: data.description
        }
      }) || []
    setList(new BoardRepository(newData))
  }
  const updateListOrder = (newIndex, oldIndex, id, isDealbreaker) => {
    const { flag, dealbreaker: dealbreakerList } = dealbreaker[currentProfile]
    const processList = isDealbreaker ? dealbreakerList : flag
    let unprocessedList = null
    const newList = JSON.parse(JSON.stringify(processList))
    let oldItem = null
    if (
      (isDealbreaker && dealbreakerListIndexRef.current.get(id)) ||
      (!isDealbreaker && flagListIndexRef.current.get(id))
    ) {
      oldItem = { ...newList[oldIndex] }
      newList.splice(oldIndex, 1)
    } else if (isDealbreaker) {
      unprocessedList = JSON.parse(JSON.stringify(flag))
      oldItem = { ...unprocessedList[oldIndex] }
      unprocessedList.splice(oldIndex, 1)
    } else {
      unprocessedList = JSON.parse(JSON.stringify(dealbreakerList))
      oldItem = { ...unprocessedList[oldIndex] }
      unprocessedList.splice(oldIndex, 1)
    }
    newList.splice(newIndex, 0, oldItem)
    const type = isDealbreaker ? 'dealbreaker' : 'flag'
    skipUpdateRef.current = true
    flagListIndexRef.current = new Map()
    dealbreakerListIndexRef.current = new Map()
    newList?.forEach((item, index) => {
      if (isDealbreaker) {
        dealbreakerListIndexRef.current.set(item.id, index)
      } else {
        flagListIndexRef.current.set(item.id, index)
      }
    })
    if (unprocessedList) {
      unprocessedList.forEach((item, index) => {
        if (isDealbreaker) {
          flagListIndexRef.current.set(item.id, index)
        } else {
          dealbreakerListIndexRef.current.set(item.id, index)
        }
      })
    }
    setDealbreaker({
      ...dealbreaker,
      [currentProfile]: {
        ...dealbreaker[currentProfile],
        [isDealbreaker ? 'flag' : 'dealbreaker']: unprocessedList
          ? unprocessedList
          : dealbreaker[currentProfile][isDealbreaker ? 'flag' : 'dealbreaker'],
        [type]: newList
      }
    })
  }

  var Styles = StyleSheet.create({ container: { height: ScreenHeight } })

  const [list, setList] = useState(null)
  console.log('flag: ', dealbreaker[currentProfile].flag)
  console.log('dealbreaker: ', dealbreaker[currentProfile].dealbreaker)
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
                // let isDealbreaker = false
                // if (draggedItem.attributes.columnId === 2) {
                //   isDealbreaker = true
                // }
                // let oldIndex = flagListIndexRef.current.get(
                //   draggedItem.attributes.row.id
                // )
                // console.log('oldIndex: ', oldIndex)
                // console.log('draggedItem: ', draggedItem.attributes.row.id)
                // if (!oldIndex && oldIndex !== 0) {
                //   oldIndex = dealbreakerListIndexRef.current.get(
                //     draggedItem.attributes.row.id
                //   )
                // }
                // updateListOrder(
                //   draggedItem.attributes.index,
                //   oldIndex,
                //   draggedItem.attributes.row.id,
                //   isDealbreaker
                // )
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
