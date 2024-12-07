import {
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  Text,
  Textarea,
  useDisclosure
} from "@chakra-ui/react"
import {Reaction, Update} from "../../core/app-context"
import {format} from "date-fns"
import {FormattedMessage} from "react-intl"
import {useState} from "react"

export const ReactionForm = () => {

  const {isOpen, onOpen, onClose} = useDisclosure()
  const [message, setMessage] = useState('')

  const postReaction = async () => {
    const url = `/api/updates/reactions/`
    const response = await fetch(url, {
      cache: 'no-cache',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({message})
    })
    if (response.status === 201) {
      onClose()
    } else {
      console.log('Could not post reaction.')
    }
  }

  return (
    <>
      {isOpen ? (
        <Card border={'1px solid #eee'} backgroundColor={'orange.50'}>
          <CardBody>
            <Textarea onChange={(value) => setMessage(value.target.value)}/>
          </CardBody>
          <CardFooter py={2} textColor={'orange.600'} justifyContent={'space-between'}>
            <Button variant={'ghost'} colorScheme={'orange'} onClick={postReaction}>
              <FormattedMessage defaultMessage={'Cancel'} id={'cancel'}/>
            </Button>
            <Button variant={'ghost'} colorScheme={'orange'} onClick={onClose}>
              <FormattedMessage defaultMessage={'Post'} id={'post'}/>
            </Button>
          </CardFooter>
        </Card>

      ) : (
        <Box>
          <Button variant={'outline'} colorScheme={'orange'} onClick={onOpen}>
            <FormattedMessage defaultMessage={'Post reaction'} id={'post reaction'}/>
          </Button>
        </Box>
      )}
    </>
  )
}