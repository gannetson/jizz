import {Box, Button, Flex, Image, Kbd, Show} from "@chakra-ui/react";
import AppContext from "../../core/app-context";
import {useCallback, useContext, useEffect} from "react";
import {ViewSpecies} from "../view-species"
import {FormattedMessage} from "react-intl"
import Confetti from "react-dom-confetti"

export const AnswerComponent = () => {

  const {answer, getNextQuestion} = useContext(AppContext);


  const handleKeyPress = useCallback((event: KeyboardEvent) => {
      if (event.key === ' ') {
        getNextQuestion && getNextQuestion()
      }
  }, [getNextQuestion])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress)
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [handleKeyPress, answer])


  if (!answer) return <></>

  return (
    <>
      <Box position={'relative'}>
        <Image
          src={answer.species?.images[answer.number || 0].url.replace('/1800', '/900')}
          fallback={
            <Image src='/images/jizz-logo.png' width={'200px'} marginX={'auto'} marginY={['20px', '150px']}/>
          }
        />
        <Confetti active={true} config={{angle: 90}}/>
      </Box>
      <Box fontWeight={'bold'}>
        {answer.correct ? (
          <>
            <Box>
              <FormattedMessage id={'correct'} defaultMessage={'Correct!'}/>
            </Box>
            <Box>
              <FormattedMessage
                id={'right answer'}
                defaultMessage={'It was indeed {species}'}
                values={{species: <ViewSpecies species={answer.answer}/>}}
              />
            </Box>
          </>

        ) : (
          !answer.answer ? (
              <FormattedMessage
                id={'right answer'}
                defaultMessage={'It was {species}'}
                values={{species: <ViewSpecies species={answer?.species}/>}}
              />
            ) :
            (
              <>
                <Box>
                  <FormattedMessage
                    id={'incorrect'}
                    defaultMessage={'Incorrect!'}
                  />
                </Box>
                <Box>
                  <FormattedMessage
                    id={'right answer'}
                    defaultMessage={'It was {species}'}
                    values={{species: <ViewSpecies species={answer?.species}/>}}
                  />
                </Box>
                <Box>
                  <FormattedMessage
                    id={'right answer'}
                    defaultMessage={'Your answer was {species}'}
                    values={{species: <ViewSpecies species={answer.answer}/>}}
                  />
                </Box>
              </>
            )
        )}
      </Box>
      <Button onClick={getNextQuestion} colorScheme={'orange'}>
        <Flex justifyContent={'space-between'} width={'100%'}>
          Next
          <Show above={'md'}>
            <Kbd size='lg' backgroundColor={'orange.600'} borderColor={'orange.800'}>space</Kbd>
          </Show>
        </Flex>
      </Button>

    </>
  )
}