import {Td, Tr} from "@chakra-ui/react"
import {Score} from "../core/app-context"
import getUnicodeFlagIcon from 'country-flag-icons/unicode'

export const ScoreLineShort = ({score} : {score: Score}) => {

const date = new Date(score.created)

  return (
    <Tr>
      <Td>{score.ranking}</Td>
      <Td>{score.name}</Td>
      <Td>{date.toLocaleDateString()} {date.toLocaleTimeString()}</Td>
      <Td>{score.score}</Td>
    </Tr>
  )
}