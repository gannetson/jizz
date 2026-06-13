import {Box, TableCell, TableRow} from "@chakra-ui/react"
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
  const isMine = !!score.is_mine

  return (
    <TableRow
      bg={isMine ? 'primary.100' : undefined}
      fontWeight={isMine ? 'semibold' : undefined}
      borderLeftWidth={isMine ? '4px' : undefined}
      borderLeftColor={isMine ? 'primary.500' : undefined}
    >
      <TableCell>{score.ranking}</TableCell>
      <TableCell>
        {score.name}
        {isMine ? (
          <Box as="span" color="primary.600" fontWeight="600" ml={1}>
            <FormattedMessage id="your_score" defaultMessage="(you)" />
          </Box>
        ) : null}
      </TableCell>
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
