import {Box, Button, CardRoot, CardBody, Flex, Heading, Text, Textarea} from "@chakra-ui/react"
import {FormattedMessage, useIntl} from "react-intl"
import StarRating from "./rating/star-rating"
import {useState} from "react"
import { toaster } from "@/components/ui/toaster"

export const Feedback = () => {
  const intl = useIntl()
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    const player_token = localStorage.getItem('player-token');
    const response = await fetch('/api/feedback/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({rating, comment, player_token})
    })
    
    if (response.ok) {
      setSubmitted(true)
      toaster.create({
        title: intl.formatMessage({id: 'thanks', defaultMessage: 'Thanks!'}),
        description: intl.formatMessage({id: 'thanks for your feedback message', defaultMessage: 'Thank you for your feedback!'}),
        colorPalette: "success",
        duration: 3000,
        isClosable: true,
      })
      setTimeout(() => {
        setSubmitted(false)
      }, 3000)
    } else {
      toaster.create({
        title: intl.formatMessage({id: 'error', defaultMessage: 'Error'}),
        description: intl.formatMessage({id: 'error submitting feedback', defaultMessage: 'Failed to submit feedback. Please try again.'}),
        colorPalette: "error",
        duration: 4000,
        isClosable: true,
      })
    }
  }

  return (
    <CardRoot border={"1px solid"} shadow={'lg'} borderColor={'gray.300'} backgroundColor={submitted ? 'primary.100' : undefined} borderRadius='8px' p={8}>
      <Flex direction={'column'} gap={4}>
        {submitted ? (
          <>
            <Heading size={'md'} color={'primary.500'}>
              <FormattedMessage id={'thanks'} defaultMessage={'Thanks!'}/>
            </Heading>
            <FormattedMessage id={'thanks for your feedback message'} defaultMessage={'Thank you for your feedback!'}/>
          </>
        ) : (
          <>
            <Heading size={'md'}>
              <FormattedMessage id={'feedback'} defaultMessage={'Feedback'}/>
            </Heading>
            <FormattedMessage id={'do you like this'} defaultMessage={'Do you like this app?'}/>
            <StarRating rating={rating} setRating={setRating} count={5} size={20}/>
            <Flex gap={2}>
              <FormattedMessage id={'comments'} defaultMessage={'Comments / suggestions'}/>
              <Text as={'span'} fontStyle={'italic'} color={'gray.400'}>
                <FormattedMessage id={'optional'} defaultMessage={'optional'}/>
              </Text>
            </Flex>

            <Textarea cursor="text" onChange={(val) => setComment(val.target.value)}/>
            <Box>
              <Button onClick={submit} disabled={!rating && !comment} colorPalette="primary">
                <FormattedMessage id={'submit'} defaultMessage={'Submit'}/>
              </Button>
            </Box>

          </>
        )}
      </Flex>
    </CardRoot>
  )
}