import AppContext, {Question} from "../../../core/app-context"
import {
  Button, Dialog, DialogRootProps, Flex, Textarea
} from "@chakra-ui/react"
import {FormattedMessage, useIntl} from "react-intl"
import {useContext, useState} from "react"
import {toaster} from "../../../components/ui/toaster"


type Props = {
  question: Question
} & Omit<DialogRootProps, 'children'>

export const FlagMedia = ({question, open, onClose}: Props) => {
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
      toaster.create({title: intl.formatMessage({id:"question flagged", defaultMessage: "Question flagged. We'll look into this."}), status: 'success'})
    } else {
      toaster.create({title: intl.formatMessage({id:"problem flagging", defaultMessage: "Error flagging."}), status: 'error'})
    }
    onClose()
  }

  return (
    <Dialog.Root open={open} onClose={onClose}>
      <Dialog.Backdrop/>
      <Dialog.Content>
        <Dialog.Header>
          <FormattedMessage id={'flag modal title'} defaultMessage={'Flag question'}/>
        </Dialog.Header>
        <Dialog.Body>
          <Flex direction={'column'} gap={8}>
            <FormattedMessage
              id={'flag modal title'}
              defaultMessage={'Can you tell us what was wrong with this question?'}
            />
            <Textarea
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
            <Button colorScheme={'gray'} onClick={onClose}>
              <FormattedMessage defaultMessage={'Cancel'} id='cancel'/>
            </Button>
            <Button colorScheme={'orange'} onClick={onSubmit}>
              <FormattedMessage defaultMessage={'Flag'} id='flag'/>
            </Button>
          </Flex>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  )

}