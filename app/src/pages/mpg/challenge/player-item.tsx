import {CardRoot, CardBody, Flex, TagRoot} from "@chakra-ui/react"
import {FaCheckCircle, FaClock, FaMinusCircle, FaCrown} from "react-icons/fa";
import {MultiPlayer} from "../../../core/app-context"
import {FormattedMessage} from "react-intl"

export const PlayerItem = (
  {
    player, showAnswer = true, showScore = true, showRanking = true, variant = 'normal'
  }: {
    player: MultiPlayer,
    showAnswer?: boolean,
    showRanking?: boolean,
    showScore?: boolean,
    variant?: 'outline' | 'normal'
  }) => {
  let color = 'primary.200'
  if (showAnswer) {
    if (player.status === 'correct') color = 'success.200'
    if (player.status === 'incorrect') color = 'error.200'
  }


  return (
    <CardRoot backgroundColor={variant === 'outline' ? undefined : color} border={variant === 'outline' ? '2px solid #eee' : undefined}>
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
            </Flex>
          </Flex>


          {showScore && (
            <Flex gap={4}>
              {showRanking && player.ranking && (
                <Flex gap={4}>
                  <TagRoot colorPalette={'primary'} fontSize='sm'>
                    #{player.ranking} <FormattedMessage id={'high score'} defaultMessage={'high score'} />
                  </TagRoot>
                </Flex>
              )}
              {showAnswer && player.last_answer?.correct &&
                <TagRoot colorPalette={'success'} fontSize='sm'>+{player.last_answer.score}</TagRoot>}
              <TagRoot fontSize='xl'>{player.score}</TagRoot>
            </Flex>
          )}
        </Flex>

      </CardBody>
    </CardRoot>
  )
}