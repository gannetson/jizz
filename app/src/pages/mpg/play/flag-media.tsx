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
          <Toast.Root status="success" title={intl.formatMessage({id:"question flagged", defaultMessage: "Question flagged. We'll look into this."})} />
        )
      })
    } else {
      toaster.create({
        render: () => (
          <Toast.Root status="error" title={intl.formatMessage({id:"problem flagging", defaultMessage: "Error flagging."})} />
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
            <Button onClick={onClose}>
              <FormattedMessage defaultMessage={'Cancel'} id='cancel'/>
            </Button>
            <Button onClick={onSubmit}>
              <FormattedMessage defaultMessage={'Flag'} id='flag'/>
            </Button>
          </Flex>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )

}