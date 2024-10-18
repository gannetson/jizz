import {Td, Tr} from "@chakra-ui/react"
import {Score} from "../core/app-context"

export const ScoreLine = ({score} : {score: Score}) => {

  const scoreDate = new Date(score.created).toLocaleString()

  return (
    <Tr>
      <Td>{score.name}</Td>
      <Td>{score.country.name}</Td>
      <Td>{score.media}</Td>
      <Td>{score.level}</Td>
      <Td>{score.length}</Td>
      <Td>{score.score}</Td>
    </Tr>
  )
}