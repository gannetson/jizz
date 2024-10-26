import {Table} from "@chakra-ui/react"
import {Score} from "../core/app-context"
import getUnicodeFlagIcon from 'country-flag-icons/unicode'

export const ScoreLine = ({score} : {score: Score}) => {

  const mediaIcon: {[key: string]: string }  = {
    'images': '📷',
    'audio': '🔊',
    'video': '🎥',
  }

  return (
    <Table.Row>
      <Table.Cell>{score.name}</Table.Cell>
      <Table.Cell>{getUnicodeFlagIcon(score.country.code)}</Table.Cell>
      <Table.Cell>{mediaIcon[score.media]}</Table.Cell>
      <Table.Cell>{score.level.substring(0,2)}</Table.Cell>
      <Table.Cell>{score.length}</Table.Cell>
      <Table.Cell>{score.score}</Table.Cell>
    </Table.Row>
  )
}