import {Box, Button, Card, Flex, Heading, Text, Textarea, useToast} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import StarRating from "./rating/star-rating"
import {useState} from "react"

export const Feedback = () => {

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const toast = useToast({});

  const submit = async () => {
    setSubmitted(true)
    const player_token = localStorage.getItem('player-token');
    const response = await fetch('/api/feedback/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({rating, comment, player_token})
    })
    setTimeout(() => {
      setSubmitted(false)
    }, 3000)
  }

  return (
    <Card border={"1px solid"} shadow={'lg'} borderColor={'gray.300'} backgroundColor={submitted ? 'orange.100' : undefined} borderRadius='8px' p={8}>
      <Flex direction={'column'} gap={4}>
        {submitted ? (
          <>
            <Heading size={'md'} textColor={'orange.500'}>
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
              <Text as={'span'} fontStyle={'italic'} textColor={'gray.400'}>
                <FormattedMessage id={'optional'} defaultMessage={'optional'}/>
              </Text>
            </Flex>

            <Textarea onChange={(val) => setComment(val.target.value)}/>
            <Box>
              <Button onClick={submit} isDisabled={!rating && !comment}>
                <FormattedMessage id={'submit'} defaultMessage={'Submit'}/>
              </Button>
            </Box>

          </>
        )}
      </Flex>
    </Card>
  )
}