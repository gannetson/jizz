import {Card, CardBody, Flex, Tag} from "@chakra-ui/react"
import {FaCheckCircle, FaClock, FaMinusCircle, FaCrown} from "react-icons/fa";
import {MultiPlayer} from "../../../core/websocket-context"

export const PlayerItem = ({player, showAnswer = true, showScore= true}: { player: MultiPlayer, showAnswer?: boolean, showScore?: boolean }) => {
  let color = 'orange.200'
  if (showAnswer) {
    if (player.status === 'correct') color = 'green.200'
    if (player.status === 'incorrect') color = 'red.200'
  }


  return (
    <Card backgroundColor={color}>
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
              {player.name} {player.is_host && <FaCrown />}
            </Flex>
          </Flex>

          {showScore && (
            <Flex gap={4}>
              {showAnswer && player.last_answer?.correct && <Tag colorScheme={'green'} fontSize='sm'>+{player.last_answer.score}</Tag>}
              <Tag fontSize='xl'>{player.score}</Tag>
            </Flex>
          )}
        </Flex>

      </CardBody>
    </Card>
  )
}