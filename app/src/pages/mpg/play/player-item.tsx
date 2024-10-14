import {Box, Card, CardBody, Flex} from "@chakra-ui/react"
import {ImBinoculars} from "react-icons/im";
import {MultiPlayer} from "../../../core/websocket-context"

export const PlayerItem = ({player}:{player:MultiPlayer}) => {
  return (
    <Card backgroundColor={'orange.200'} color={'orange.800'} width={['full', '300px']}>
      <CardBody py={2}>
        <Flex gap={4} alignItems={'center'}>
          <ImBinoculars size={'18px'} />
          <Box fontWeight={'bold'}>{player.name}</Box>
          {player.is_host && <Box>host</Box>}
        </Flex>
      </CardBody>
    </Card>
  )
}