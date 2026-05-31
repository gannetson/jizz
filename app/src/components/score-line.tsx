import {TableCell, TableRow} from "@chakra-ui/react"
import {Score} from "../core/app-context"
import getUnicodeFlagIcon from 'country-flag-icons/unicode'
import {FormattedMessage} from "react-intl"
import {playLevelFromSettings} from "../core/play-level"

export const ScoreLine = ({score} : {score: Score}) => {

  const mediaIcon: {[key: string]: string }  = {
    'images': '📷',
    'audio': '🔊',
    'video': '🎥',
  }

  const playLevel = playLevelFromSettings(score.level, score.rarity ?? 'regular')

  return (
    <TableRow>
      <TableCell>{score.ranking}</TableCell>
      <TableCell>{score.name}</TableCell>
      <TableCell>{getUnicodeFlagIcon(score.country.code)}</TableCell>
      <TableCell>{mediaIcon[score.media]}</TableCell>
      <TableCell>
        <FormattedMessage id={playLevel} defaultMessage={playLevel} />
      </TableCell>
      <TableCell>{score.length}</TableCell>
      <TableCell>{score.score}</TableCell>
    </TableRow>
  )
}
