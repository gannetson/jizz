import {TableCell, TableRow, Box} from "@chakra-ui/react"
import {Score} from "../core/app-context"
import getUnicodeFlagIcon from 'country-flag-icons/unicode'
import {FormattedMessage} from "react-intl"

export const ScoreLineShort = ({score} : {score: Score}) => {

const date = new Date(score.created)
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
      <TableCell>{date.toLocaleDateString()} {date.toLocaleTimeString()}</TableCell>
      <TableCell>{score.score}</TableCell>
    </TableRow>
  )
}