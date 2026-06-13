import {CardRoot, CardBody, Flex, TagRoot, Box, Text} from "@chakra-ui/react"
import {FaCheckCircle, FaClock, FaMinusCircle, FaCrown, FaTrophy} from "react-icons/fa";
import {MultiPlayer} from "../../../core/app-context"
import {FormattedMessage} from "react-intl"
import {Link as RouterLink} from "react-router-dom"

export const PlayerItem = (
  {
    player, showAnswer = true, showScore = true, showRanking = true, variant = 'normal',
    hiscoresPath, linkToHiscores = false, isTopScore = false,
  }: {
    player: MultiPlayer,
    showAnswer?: boolean,
    showRanking?: boolean,
    showScore?: boolean,
    variant?: 'outline' | 'normal',
    hiscoresPath?: string,
    linkToHiscores?: boolean,
    isTopScore?: boolean,
  }) => {
  let color = 'primary.200'
  if (showAnswer) {
    if (player.status === 'correct') color = 'success.200'
    if (player.status === 'incorrect') color = 'error.200'
  }
  if (isTopScore) color = 'yellow.100'

  const scoreBlock = (
    <Flex gap={4} alignItems="center">
      {showRanking && player.ranking && (
        <TagRoot
          colorPalette={isTopScore ? 'yellow' : 'primary'}
          fontSize={isTopScore ? 'md' : 'sm'}
          fontWeight={isTopScore ? '700' : '500'}
          px={isTopScore ? 3 : 2}
          py={isTopScore ? 1 : 0.5}
          borderWidth={isTopScore ? '2px' : undefined}
          borderColor={isTopScore ? 'yellow.500' : undefined}
        >
          {isTopScore ? <FaTrophy style={{ marginRight: 6 }} /> : null}
          #{player.ranking}{' '}
          <FormattedMessage
            id={isTopScore ? 'top high score' : 'high score'}
            defaultMessage={isTopScore ? 'top score!' : 'high score'}
          />
        </TagRoot>
      )}
      {showAnswer && player.last_answer?.correct &&
        <TagRoot colorPalette={'success'} fontSize='sm'>+{player.last_answer.score}</TagRoot>}
      <TagRoot fontSize={isTopScore ? '2xl' : 'xl'} fontWeight={isTopScore ? '800' : '600'} colorPalette={isTopScore ? 'yellow' : undefined}>
        {player.score}
      </TagRoot>
    </Flex>
  )

  return (
    <CardRoot
      backgroundColor={variant === 'outline' ? undefined : color}
      border={variant === 'outline' ? '2px solid #eee' : isTopScore ? '3px solid' : undefined}
      borderColor={isTopScore ? 'yellow.500' : undefined}
      boxShadow={isTopScore ? '0 0 24px rgba(234, 179, 8, 0.35)' : undefined}
    >
      <CardBody py={2}>
        <Flex gap={4} alignItems={'center'} justifyContent={'space-between'}>
          <Flex gap={4} alignItems={'center'}>
            {showAnswer && (
              <>
                {player.status === 'waiting' && <FaClock size={'18px'}/>}
                {player.status === 'correct' && <FaCheckCircle size={'18px'}/>}
                {player.status === 'incorrect' && <FaMinusCircle size={'18px'}/>}
              </>
            )}
            <Flex gap={2} alignItems={'center'} fontWeight={'bold'}>
              {player.name} {player.is_host && <FaCrown/>}
              {isTopScore ? <FaTrophy color="#ca8a04" /> : null}
            </Flex>
          </Flex>

          {showScore && (
            linkToHiscores && hiscoresPath ? (
              <Box
                asChild
                cursor="pointer"
                borderRadius="md"
                transition="transform 0.15s ease"
                _hover={{ transform: 'scale(1.03)' }}
                title="View high scores for this game type"
              >
                <RouterLink to={hiscoresPath}>
                  {scoreBlock}
                  <Text fontSize="xs" color="primary.600" textAlign="right" mt={1}>
                    <FormattedMessage id="view_hiscores" defaultMessage="View high scores →" />
                  </Text>
                </RouterLink>
              </Box>
            ) : scoreBlock
          )}
        </Flex>

      </CardBody>
    </CardRoot>
  )
}
