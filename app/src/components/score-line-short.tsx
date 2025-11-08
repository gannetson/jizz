import {TableCell, TableRow} from "@chakra-ui/react"
import {Score} from "../core/app-context"
import getUnicodeFlagIcon from 'country-flag-icons/unicode'

export const ScoreLineShort = ({score} : {score: Score}) => {

const date = new Date(score.created)

  return (
    <TableRow>
      <TableCell>{score.ranking}</TableCell>
      <TableCell>{score.name}</TableCell>
      <TableCell>{date.toLocaleDateString()} {date.toLocaleTimeString()}</TableCell>
      <TableCell>{score.score}</TableCell>
    </TableRow>
  )
}