import {Box, Card, CardBody, CardFooter, CardHeader, Flex, Text} from "@chakra-ui/react"
import {Reaction, Update} from "../../core/app-context"
import {format} from "date-fns"

export const ReactionLine = ({reaction}: { reaction: Reaction }) => {

  return (
    <>
      <Box borderLeft={'4px solid'} borderColor={'orange.200'} pl={4} ml={2}>
        <Box py={2}>{reaction.message}</Box>
        <Flex py={2} textColor={'orange.600'} justifyContent={'space-between'}>
          <Box>{reaction.name} </Box>
          <Box fontStyle={'italic'}>{format(reaction?.created || new Date(), 'PP')}</Box>
        </Flex>
      </Box>
    </>
  )
}