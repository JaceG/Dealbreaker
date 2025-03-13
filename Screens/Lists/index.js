import { StatusBar } from 'expo-status-bar'
import { useState, useContext, useEffect, useRef } from 'react'
import { StyleSheet, Text, View, Dimensions, Button } from 'react-native'
import { Board, BoardRepository } from '../../libs/board/components'
import StoreContext from '../../store'
import AppButton from '../../components/AppButton'
import SwitchProfileModal from '../../components/SwitchProfileModal'
import React, { createContext } from 'react'

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

export const BoardRepositoryContext = createContext(null)

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
          id: data.id,
          name: data.title,
          description: data.description
        }
      }) || []
    newData[1].rows =
      dealbreakerList.map((data, index) => {
        dealbreakerListIndexRef.current.set(data.id, index)
        return {
          id: data.id,
          name: data.title,
          description: data.description
        }
      }) || []
    console.log('Initializing boardRepository with newData:', newData)
    const boardRepo = new BoardRepository(newData)
    console.log('boardRepository initialized:', boardRepo)
    setList(boardRepo)
  }
  const updateListOrder = (newIndex, oldIndex, id, isDealbreaker) => {
    console.log('updateListOrder called with:', {
      newIndex,
      oldIndex,
      id,
      isDealbreaker
    })
    const { flag, dealbreaker: dealbreakerList } = dealbreaker[currentProfile]
    console.log('Current flag and dealbreaker lists:', {
      flag,
      dealbreakerList
    })

    const processList = isDealbreaker ? dealbreakerList : flag
    let unprocessedList = null
    const newList = JSON.parse(JSON.stringify(processList))
    let oldItem = null

    console.log('Initial newList:', newList)

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

    console.log('Old item:', oldItem)

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

    console.log('Updated lists:', { newList, unprocessedList })

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
    <BoardRepositoryContext.Provider value={list}>
      <View style={styles.container}>
        <SwitchProfileModal
          visible={visible}
          onClose={() => setVisible(false)}
        />
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
                  console.log('onDragEnd called with boardRepository:', list)
                  try {
                    if (!list) {
                      console.error('boardRepository is undefined at onDragEnd')
                      return
                    }

                    if (
                      !draggedItem ||
                      !draggedItem.attributes ||
                      !draggedItem.attributes.row
                    ) {
                      console.error(
                        'Dragged item or its attributes are undefined:',
                        draggedItem
                      )
                      return
                    }

                    const isDealbreaker = draggedItem.attributes.columnId === 2
                    let oldIndex = flagListIndexRef.current.get(
                      draggedItem.attributes.row.id
                    )
                    if (oldIndex === undefined) {
                      oldIndex = dealbreakerListIndexRef.current.get(
                        draggedItem.attributes.row.id
                      )
                    }

                    const newIndex = draggedItem.attributes.index

                    console.log(
                      'oldIndex:',
                      oldIndex,
                      'newIndex:',
                      newIndex,
                      'isDealbreaker:',
                      isDealbreaker
                    )

                    if (oldIndex === undefined || newIndex === undefined) {
                      console.error('Invalid indices detected:', {
                        oldIndex,
                        newIndex
                      })
                      return
                    }

                    updateListOrder(
                      newIndex,
                      oldIndex,
                      draggedItem.attributes.row.id,
                      isDealbreaker
                    )
                  } catch (error) {
                    console.error('Error in onDragEnd:', error)
                  }
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
    </BoardRepositoryContext.Provider>
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
