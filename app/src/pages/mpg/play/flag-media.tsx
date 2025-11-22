import AppContext, {Question} from "../../../core/app-context"
import {
  Button, Flex,
  Dialog,
  Textarea,
  Checkbox, VStack, Box, Link, Text
} from "@chakra-ui/react"
import {FormattedMessage, useIntl} from "react-intl"
import {useContext, useEffect, useState} from "react"
import { toaster } from "@/components/ui/toaster"

const {
  Root: DialogRoot,
  Backdrop: DialogBackdrop,
  Positioner: DialogPositioner,
  Content: DialogContent,
  Header: DialogHeader,
  Body: DialogBody,
  Footer: DialogFooter,
  CloseTrigger: DialogCloseTrigger,
} = Dialog


type MediaInfo = {
  type: 'image' | 'video' | 'audio'
  url: string
  link?: string | null
  contributor?: string | null
  index: number
}

type Props = {
  question: Question
  isOpen: boolean
  onClose: () => void
  media?: MediaInfo | null
}

type CheckboxOption = {
  id: string
  defaultMessage: string
  key: string
}

const CHECKBOX_OPTIONS: CheckboxOption[] = [
  { id: 'wrong species', defaultMessage: "This is not the right species", key: 'wrongSpecies' },
  { id: 'no bird visible', defaultMessage: "I can't see a bird in this picture", key: 'noBirdVisible' },
  { id: 'multiple species', defaultMessage: "There are multiple species in this picture", key: 'multipleSpecies' },
  { id: 'chick egg nest corpse', defaultMessage: "It's a chick, egg, nest or a dead bird", key: 'chickEggNestCorpse' },
  { id: 'poor quality', defaultMessage: "The quality of the image is very poor", key: 'poorQuality' },

]

export const FlagMedia = ({question, isOpen, onClose, media}: Props) => {
  const [message, setMessage] = useState<string>('')
  const [checkboxStates, setCheckboxStates] = useState<Record<string, boolean>>(
    CHECKBOX_OPTIONS.reduce((acc, option) => ({ ...acc, [option.key]: false }), {})
  )

  const intl = useIntl()
  const {player} = useContext(AppContext)

  const resetForm = () => {
    setMessage('')
    setCheckboxStates(
      CHECKBOX_OPTIONS.reduce((acc, option) => ({ ...acc, [option.key]: false }), {})
    )
  }

  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])
  const onSubmit = async () => {
    // Build description text from checkboxes and media info
    const checkboxLabels: string[] = []
    
    CHECKBOX_OPTIONS.forEach(option => {
      if (checkboxStates[option.key]) {
        checkboxLabels.push(intl.formatMessage({id: option.id, defaultMessage: option.defaultMessage}))
      }
    })
    
    // Combine all information into description
    const descriptionParts: string[] = []
    
    if (checkboxLabels.length > 0) {
      descriptionParts.push(`Issues: ${checkboxLabels.join(' | ')}`)
    }
    
    if (message.trim()) {
      descriptionParts.push(`Additional notes: ${message.trim()}`)
    }
    
    const combinedDescription = descriptionParts.join('\n\n')
    
    const response = await fetch('/api/flag/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question_id: question.id,
        player_token: player?.token,
        media_url: media?.url,
        media_type: media?.type,
        description: combinedDescription,
      })
    })
    const successMessage = intl.formatMessage({id:"question flagged", defaultMessage: "Question flagged. We'll look into this."})
    const errorMessage = intl.formatMessage({id:"problem flagging", defaultMessage: "Error flagging."})
    
    if (response.status === 201) {
      toaster.create({
        title: successMessage,
        colorPalette: "success",
        duration: 4000,
        isClosable: true,
      });
    } else {
      toaster.create({
        title: errorMessage,
        colorPalette: "error",
        duration: 4000,
        isClosable: true,
      })
    }
    onClose()
  }

  return (
    <DialogRoot open={isOpen} onOpenChange={(e: { open: boolean }) => {
      if (!e.open) {
        onClose()
      }
    }}>
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent>
          <DialogCloseTrigger />
          <DialogHeader>
            <FormattedMessage id={'flag media title'} defaultMessage={'Flag media'}/>
          </DialogHeader>
          <DialogBody>
            <VStack gap={6} align="stretch">
              <FormattedMessage
                id={'flag modal description'}
                defaultMessage={'Can you tell us what was wrong with this question?'}
              />
              
              <VStack gap={4} align="stretch">
                {CHECKBOX_OPTIONS.map((option) => (
                  <Box key={option.key} as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
                    <Checkbox.Root
                      colorPalette="primary"
                      checked={checkboxStates[option.key]}
                      onCheckedChange={(e: { checked: boolean }) => 
                        setCheckboxStates(prev => ({ ...prev, [option.key]: e.checked === true }))
                      }
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control cursor="pointer">
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.Label>
                        <FormattedMessage 
                          id={option.id} 
                          defaultMessage={option.defaultMessage}
                        />
                      </Checkbox.Label>
                    </Checkbox.Root>
                  </Box>
                ))}
              </VStack>
              <FormattedMessage
                id={'flag description explanation'}
                defaultMessage={'Eloborate on your answer. This will help us improve the game.'}
              />
              <Textarea
                cursor="text"
                onChange={(val) => setMessage(val.currentTarget.value)}
                placeholder={intl.formatMessage({
                  id: 'flag description',
                  defaultMessage: 'Description'
                }) as string}
              />
            </VStack>
          </DialogBody>
          <DialogFooter>
            <Flex justifyContent={'space-between'} width={'full'}>
              <Button onClick={onClose} colorPalette="primary">
                <FormattedMessage defaultMessage={'Cancel'} id='cancel'/>
              </Button>
              <Button onClick={onSubmit} colorPalette="primary">
                <FormattedMessage defaultMessage={'Flag'} id='flag'/>
              </Button>
            </Flex>
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  )

}