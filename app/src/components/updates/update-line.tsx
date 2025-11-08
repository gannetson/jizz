import {Box, CardRoot, CardBody, CardFooter, CardHeader, Flex, Text} from "@chakra-ui/react"
import AppContext, {Update} from "../../core/app-context"
import {format} from "date-fns"
import {ReactionLine} from "./reaction-line"
import {ReactionForm} from "./reaction-form"
import {useContext} from "react"

export const UpdateLine = ({update}: { update: Update }) => {
  const {player} = useContext(AppContext)

  return (
    <>
      <CardRoot border={'1px solid #eee'}>
        <CardHeader
          backgroundColor={'primary.200'}
          color={'primary.800'}
          fontWeight={'bold'}
          py={2}
        >
          {update.title}
        </CardHeader>
        <CardBody>{update.message}</CardBody>
        <CardFooter color={'primary.600'} justifyContent={'space-between'}>
          <Box>{update.user.first_name} </Box>
          <Box fontStyle={'italic'}>{format(update.created, 'PP')}</Box>
        </CardFooter>
      </CardRoot>
      <Flex direction={'column'} gap={6}>
        {update.reactions && update.reactions.map(
          (reaction, index) => <ReactionLine key={index} reaction={reaction}/>
        )}
        {player && <ReactionForm update={update} />}
      </Flex>
    </>
  )
}