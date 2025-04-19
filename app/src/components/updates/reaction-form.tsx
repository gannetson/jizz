import {Box, Button, Card, CardBody, CardFooter, Textarea, useDisclosure} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import {useContext, useState} from "react"
import AppContext, {Reaction, Update} from "../../core/app-context"
import {ReactionLine} from "./reaction-line"

export const ReactionForm = ({update}: { update: Update }) => {

  const {isOpen, onOpen, onClose} = useDisclosure()
  const [message, setMessage] = useState('')
  const {player} = useContext(AppContext)
  const [reaction, setReaction] = useState<Reaction | null>(null)

  const postReaction = async () => {
    if (update?.id && player?.token) {
      const url = `/api/updates/reactions/`
      const response = await fetch(url, {
        cache: 'no-cache',
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          update_id: update?.id,
          player_token: player?.token,

        })
      })
      if (response.status === 201) {
        const reaction: Reaction = await response.json()
        setReaction(reaction)
        onClose()
      } else {
        console.log('Could not post reaction.')
      }
    } else {
      console.log('Could not post reaction.')
    }
  }

  return (
    <>
      {reaction && (
        <ReactionLine reaction={reaction}/>
      )}
      {isOpen ? (
        <Card border={'1px solid #eee'} backgroundColor={'orange.50'}>
          <CardBody>
            <Textarea backgroundColor='white' onChange={(value) => setMessage(value.target.value)}/>
          </CardBody>
          <CardFooter py={2} textColor={'orange.600'} justifyContent={'space-between'}>
            <Button variant={'outline'} onClick={onClose}>
              <FormattedMessage defaultMessage={'Cancel'} id={'cancel'}/>
            </Button>
            <Button onClick={postReaction}>
              <FormattedMessage defaultMessage={'Post'} id={'post'}/>
            </Button>
          </CardFooter>
        </Card>

      ) : (
        <Box>
          <Button variant={'outline'} onClick={onOpen}>
            <FormattedMessage defaultMessage={'Post reaction'} id={'post reaction'}/>
          </Button>
        </Box>
      )}
    </>
  )
}