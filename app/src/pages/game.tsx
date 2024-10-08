import {useCallback, useContext, useEffect, useState} from "react";
import {Box, Button, Flex, Heading, IconButton, Image, Show, SimpleGrid, Text, Tooltip} from "@chakra-ui/react";
import {Select} from "chakra-react-select";
import Confetti from "react-dom-confetti"
import {ViewSpecies} from "../components/view-species";
import {BsFillQuestionCircleFill, FiRefreshCw} from "react-icons/all";
import Page from "./layout/page";
import AppContext, {Question, Species} from "../core/app-context";
import {Kbd} from '@chakra-ui/react'

const GamePage = () => {
  const [success, setSuccess] = useState<boolean>(false);
  const [question, setQuestion] = useState<Question | null>();
  const [answer, setAnswer] = useState<Species | null | 'dunno'>();
  const [picNum, setPicNum] = useState<number>(0);
  const [options, setOptions] = useState<Species[] | null>([])
  const {setCorrect, setWrong, country, getNextQuestion, game} = useContext(AppContext);

  const nextPic = () => {
    setPicNum((picNum + 1) % question!.species.images.length)
  }

  const shortcuts = ['a', 'j', 's', 'k', 'd', 'l']

  const checkAnswer = (answer: Species) => {
    setAnswer(answer)
    if (answer === question?.species) {
      setCorrect && question && setCorrect(question)
    } else {
      setWrong && question && setWrong(question)
    }
  }

  const questions = game?.questions

  const newQuestion = () => {
    if (questions && questions.length && getNextQuestion) {
      setAnswer(null)
      const question = getNextQuestion()
      if (question) {
        setQuestion(question)
        setOptions(question?.options || null)
      } else {
        setSuccess(true)
      }
    }
  }


  useEffect(() => {
    newQuestion()
  }, [country, questions])

  const handleKeyPress = useCallback((event: { key: any; }) => {
    if (event.key === ' ') {
      if (answer) {
        newQuestion()
      } else {
        options && setAnswer('dunno')
      }
    } else if (!answer) {
      options && checkAnswer(options[shortcuts.indexOf(event.key)])
    }
  }, [options, answer]);

  useEffect(() => {
    // attach the event listener
    document.addEventListener('keydown', handleKeyPress);

    // remove the event listener
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  const correctCount = questions ? questions.filter((sp) => sp.correct).length : '?'
  const totalCount = questions ? questions.length : '?'

  const firstTry = game?.questions.filter((q) => q.errors === 0).length
  const hardest = game?.questions.sort((a, b) => (b.errors || 0) - (a.errors || 0))[0]

  return (
    <Page>
      <Page.Header>
        <Flex textColor={'gray.800'} width='full' justifyContent={'space-between'}>
          <Heading size={'lg'} noOfLines={1}>{game?.country.name}</Heading>
          <Box>
            <Box textAlign={'right'}>
              <Tooltip
                hasArrow
                label={`You have identified ${correctCount} birds correctly out of ${totalCount}. These won't be shown again.`}>
                <Flex direction={'row'} alignItems={'center'}>
                  Species {correctCount} / {totalCount}
                  <Box ml={1}><BsFillQuestionCircleFill size={16}/></Box>
                </Flex>
              </Tooltip>
            </Box>
            <Box textAlign={'right'} fontWeight={'bold'} textTransform={'capitalize'}>Level: {game?.level}</Box>
          </Box>
        </Flex>
      </Page.Header>
      <Page.Body>
        {success ? (
          <>
            <Heading size={'lg'}>Congratulations!</Heading>
            <Heading size={'md'}> You've identified all {game?.questions.length} the species
              from {game?.country.name}</Heading>
            <Text>You got <b>{firstTry} species</b> the first time right</Text>
            {hardest && (hardest.errors || 0) > 0 && (
              <Text>You some problems with <b>{hardest.species.name}</b>, which guessed
                wrong <b>{hardest.errors} times</b>, before you got it right</Text>
            )}
          </>
        ) : (
          <>
            {question && (
              <Box position={'relative'}>
                {question.species.images.length && question.species.images[picNum] ? (
                  <Image
                    src={question.species.images[picNum].url.replace('/1800', '/900')}
                    fallbackSrc={'https://cdn.pixabay.com/photo/2012/06/08/06/19/clouds-49520_640.jpg'}
                  />
                ) : (
                  <Text>No images for this species, you'll get it for free it's {question.species.name}</Text>
                )}

                <Tooltip hasArrow label={'Click this to show another picture of the same species'}>
                  <IconButton
                    icon={<FiRefreshCw/>}
                    onClick={nextPic}
                    colorScheme="orange"
                    aria-label="Next picture"
                    size={'md'}
                    isRound={true}
                    variant='solid'
                    position={'absolute'} top={2} right={2}>
                  </IconButton>
                </Tooltip>
                <Confetti active={question.species === answer} config={{angle: 45}}/>
              </Box>
            )}

            <Box fontWeight={'bold'}>
              {answer && question?.species && (
                answer === 'dunno' ? (
                  <Text>
                    It was <ViewSpecies species={question.species}/>
                  </Text>
                ) : (
                  answer === question.species ?
                    'Correct!' : (
                      <>
                        <Text>
                          Incorrect! It was <ViewSpecies species={question.species}/>
                        </Text>
                        <Text>
                          Your answer: <ViewSpecies species={answer}/>
                        </Text>
                      </>
                    )
                )
              )}
            </Box>
            {answer ?
              <Button onClick={newQuestion} colorScheme={'orange'}>
                <Flex justifyContent={'space-between'} width={'100%'}>
                  Next
                  <Show above={'md'}>
                    <Kbd size='lg' backgroundColor={'orange.600'} borderColor={'orange.800'}>space</Kbd>
                  </Show>
                </Flex>
              </Button> :
              <Button onClick={() => setAnswer('dunno')} colorScheme={'gray'}>
                <Flex justifyContent={'space-between'} width={'100%'}>
                  No clue
                  <Show above={'md'}>
                    <Kbd size='lg' backgroundColor={'gray.100'} borderColor={'gray.300'}>space</Kbd>
                  </Show>
                </Flex>
              </Button>
            }
            {questions && !answer && (options && options.length ? (
                <SimpleGrid columns={{base: 1, md: 2}} spacing={4}>
                  {
                    options.map((option, key) => {
                      return (
                        <Button key={key} colorScheme='orange' onClick={() => checkAnswer(option)}>
                          <Flex justifyContent={'space-between'} width={'100%'}>
                            {option && game.language === 'nl' ? option.name_nl : option.name}
                            <Show above={'md'}>
                              <Kbd size='lg' backgroundColor={'orange.600'}
                                   borderColor={'orange.800'}>{shortcuts[key]}</Kbd>
                            </Show>
                          </Flex>
                        </Button>
                      )
                    })
                  }
                </SimpleGrid>

              ) : (
                <Select
                  options={questions.map((q) => ({label: q.species.name, value: q.species}))}
                  onChange={(answer) => answer && checkAnswer(answer.value)}
                />
              )
            )}

          </>
        )}
      </Page.Body>
    </Page>
  )
}

export default GamePage;