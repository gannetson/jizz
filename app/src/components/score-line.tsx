import {TableCell, TableRow} from "@chakra-ui/react"
import {Score} from "../core/app-context"
import getUnicodeFlagIcon from 'country-flag-icons/unicode'

export const ScoreLine = ({score} : {score: Score}) => {

  const mediaIcon: {[key: string]: string }  = {
    'images': '📷',
    'audio': '🔊',
    'video': '🎥',
  }

  return (
    <TableRow>
      <TableCell>{score.ranking}</TableCell>
      <TableCell>{score.name}</TableCell>
      <TableCell>{getUnicodeFlagIcon(score.country.code)}</TableCell>
      <TableCell>{mediaIcon[score.media]}</TableCell>
      <TableCell>{score.level.substring(0,2)}</TableCell>
      <TableCell>{score.length}</TableCell>
      <TableCell>{score.rarity ? score.rarity.substring(0, 3) : ''}</TableCell>
      <TableCell>{score.score}</TableCell>
    </TableRow>
  )
}