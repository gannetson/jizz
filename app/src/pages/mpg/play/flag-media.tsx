import AppContext, {Question} from "../../../core/app-context"
import {
  Button, Flex,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay, ModalProps, Textarea, useToast
} from "@chakra-ui/react"
import {FormattedMessage, useIntl} from "react-intl"
import {useContext, useState} from "react"


type Props = {
  question: Question
} & Omit<ModalProps, 'children'>

export const FlagMedia = ({question, isOpen, onClose}: Props) => {
  const toast = useToast({})
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
      toast({title: intl.formatMessage({id:"question flagged", defaultMessage: "Question flagged. We'll look into this."}), status: 'success'})
    } else {
      toast({title: intl.formatMessage({id:"problem flagging", defaultMessage: "Error flagging."}), status: 'error'})
    }
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay/>
      <ModalContent>
        <ModalHeader>
          <FormattedMessage id={'flag modal title'} defaultMessage={'Flag question'}/>
        </ModalHeader>
        <ModalBody>
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

        </ModalBody>
        <ModalFooter>
          <Flex justifyContent={'space-between'} width={'full'}>
            <Button onClick={onClose}>
              <FormattedMessage defaultMessage={'Cancel'} id='cancel'/>
            </Button>
            <Button onClick={onSubmit}>
              <FormattedMessage defaultMessage={'Flag'} id='flag'/>
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )

}