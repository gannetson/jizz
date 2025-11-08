import AppContext, {Question} from "../../../core/app-context"
import {
  Button, Flex,
  Dialog,
  Textarea, Toast
} from "@chakra-ui/react"
import {FormattedMessage, useIntl} from "react-intl"
import {useContext, useState} from "react"
import { toaster } from "../../../App"


type Props = {
  question: Question
  isOpen: boolean
  onClose: () => void
}

export const FlagMedia = ({question, isOpen, onClose}: Props) => {
  const [message, setMessage] = useState<string>('')
  const intl = useIntl()
  const {player} = useContext(AppContext)

  const onSubmit = async () => {
    const response = await fetch('/api/flag/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question_id: question.id,
        player_token: player?.token,
        description: message
      })
    })
    if (response.status === 201) {
      toaster.create({
        render: () => (
          <Toast.Root status="success">
            <Toast.Title>{intl.formatMessage({id:"question flagged", defaultMessage: "Question flagged. We'll look into this."})}</Toast.Title>
          </Toast.Root>
        )
      })
    } else {
      toaster.create({
        render: () => (
          <Toast.Root status="error">
            <Toast.Title>{intl.formatMessage({id:"problem flagging", defaultMessage: "Error flagging."})}</Toast.Title>
          </Toast.Root>
        )
      })
    }
    onClose()
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e: { open: boolean }) => !e.open && onClose()}>
      <Dialog.Backdrop/>
      <Dialog.Content>
        <Dialog.Header>
          <FormattedMessage id={'flag modal title'} defaultMessage={'Flag question'}/>
        </Dialog.Header>
        <Dialog.Body>
          <Flex direction={'column'} gap={8}>
            <FormattedMessage
              id={'flag modal description'}
              defaultMessage={'Can you tell us what was wrong with this question?'}
            />
            <Textarea
              cursor="text"
              onChange={(val) => setMessage(val.currentTarget.value)}
              placeholder={intl.formatMessage({
                id: 'flag description',
                defaultMessage: 'Description'
              }) as string}
            />
          </Flex>

        </Dialog.Body>
        <Dialog.Footer>
          <Flex justifyContent={'space-between'} width={'full'}>
            <Button onClick={onClose} colorPalette="primary">
              <FormattedMessage defaultMessage={'Cancel'} id='cancel'/>
            </Button>
            <Button onClick={onSubmit} colorPalette="primary">
              <FormattedMessage defaultMessage={'Flag'} id='flag'/>
            </Button>
          </Flex>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )

}