import React from 'react'
import { Animated, TouchableOpacity, View, Text } from 'react-native'
import { bool, func, number, object, shape, string } from 'prop-types'
import { colors, fonts, deviceWidth } from '../../constants'
import { Flag } from '../Icons'
import {
  CardContainer,
  CardWrapper,
  ColumnWrapper,
  IconRowWrapper,
  Paragraph,
  RowWrapper
} from './Card.styled'
const NEGATIVE_SPACE = 90
const Card = ({
  cardBackground,
  cardBorderRadius,
  cardContent,
  cardDescriptionTextColor,
  cardDescriptionFontSize,
  cardDescriptionFontFamily,
  cardIconColor,
  cardNameTextColor,
  cardNameFontSize,
  cardNameFontFamily,
  hidden,
  item,
  isCardWithShadow,
  onPress,
  onPressIn,
  style,
  onFlagClicked,
  onDeleteItem,
  onEditItem
}) => {
  const styles = [style]
  if (hidden) {
    styles.push({ opacity: 0 })
  }

  const iconStyles = {
    iconContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 5
    },
    iconButton: {
      padding: 5,
      marginRight: 5
    },
    iconText: {
      fontSize: 18,
      color: '#fff'
    }
  }

  return (
    <CardWrapper
      onPressIn={evt =>
        onPressIn ? onPressIn(evt.nativeEvent.pageY - NEGATIVE_SPACE) : {}
      }
      onPress={onPress}
      collapsable={false}>
      <Animated.View style={styles}>
        {cardContent !== undefined ? (
          cardContent(item ? item.row() : {})
        ) : (
          <CardContainer
            backgroundColor={
              item?.columnId() === 2 ? colors.chiGong : colors.exodusFruit
            }
            borderRadius={cardBorderRadius}
            elevation={isCardWithShadow ? 5 : 0}
            shadowOpacity={isCardWithShadow ? 0.1 : 0}>
            <RowWrapper>
              <IconRowWrapper>
                <View style={iconStyles.iconContainer}>
                  {item && onDeleteItem && (
                    <TouchableOpacity
                      onPress={() => onDeleteItem(item)}
                      style={iconStyles.iconButton}>
                      <Text style={iconStyles.iconText}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                  {item && onEditItem && (
                    <TouchableOpacity
                      onPress={() => onEditItem(item)}
                      style={iconStyles.iconButton}>
                      <Text style={iconStyles.iconText}>✏️</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <ColumnWrapper>
                  <Paragraph
                    fontSize={cardNameFontSize}
                    fontFamily={cardNameFontFamily}
                    color={cardNameTextColor}>
                    {item ? item.row().name : ''}
                  </Paragraph>
                </ColumnWrapper>
              </IconRowWrapper>
              {item?.columnId() === 2 ? null : (
                <Flag
                  color={cardIconColor}
                  onFlagClicked={onFlagClicked}
                  item={item}
                />
              )}
            </RowWrapper>
          </CardContainer>
        )}
      </Animated.View>
    </CardWrapper>
  )
}

Card.defaultProps = {
  cardBackground: colors.white,
  cardBorderRadius: 10,
  cardDescriptionTextColor: colors.bay,
  cardDescriptionFontSize: 14,
  cardDescriptionFontFamily: '',
  cardIconColor: colors.blurple,
  cardNameTextColor: colors.blurple,
  cardNameFontSize: 18,
  cardNameFontFamily: '',
  isCardWithShadow: true,
  onDeleteItem: null,
  onEditItem: null
}

Card.propTypes = {
  cardBackground: string.isRequired,
  cardBorderRadius: number.isRequired,
  cardContent: func,
  cardDescriptionTextColor: string.isRequired,
  cardDescriptionFontSize: number.isRequired,
  cardDescriptionFontFamily: string.isRequired,
  cardIconColor: string.isRequired,
  cardNameTextColor: string.isRequired,
  cardNameFontSize: number.isRequired,
  cardNameFontFamily: string.isRequired,
  hidden: bool,
  item: object,
  isCardWithShadow: bool.isRequired,
  onPress: func,
  onPressIn: func,
  style: shape({ string }),
  onDeleteItem: func,
  onEditItem: func
}

export default Card
