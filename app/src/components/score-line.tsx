import {Td, Tr} from "@chakra-ui/react"
import {Score} from "../core/app-context"
import getUnicodeFlagIcon from 'country-flag-icons/unicode'

export const ScoreLine = ({score} : {score: Score}) => {

  const mediaIcon: {[key: string]: string }  = {
    'images': '📷',
    'audio': '🔊',
    'video': '🎥',
  }

  return (
    <Tr>
      <Td>{score.name}</Td>
      <Td>{getUnicodeFlagIcon(score.country.code)}</Td>
      <Td>{mediaIcon[score.media]}</Td>
      <Td>{score.level.substring(0,2)}</Td>
      <Td>{score.length}</Td>
      <Td>{score.score}</Td>
    </Tr>
  )
}