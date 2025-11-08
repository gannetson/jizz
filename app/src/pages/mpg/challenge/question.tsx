import {Box, Button, Flex, Heading, Icon, Image, Link, PopoverRoot, PopoverArrow, PopoverCloseTrigger, PopoverBody, PopoverContent, PopoverTrigger, SimpleGrid, useDisclosure, CardRoot} from "@chakra-ui/react"
import {ChakraSelect} from "../../../components/chakra-select"
import {useContext, useEffect, useState} from "react"
import ReactPlayer from "react-player"
import WebsocketContext from "../../../core/websocket-context"
import AppContext, {Answer, Species} from "../../../core/app-context"
import {SpeciesName} from "../../../components/species-name"
import {FormattedMessage} from "react-intl"
import {FlagMedia} from "../play/flag-media"
import {keyframes} from "@emotion/react"
import { Loading } from "../../../components/loading"
import Page from "../../layout/page"
import { FaCheckCircle, FaDotCircle, FaHeart, FaHeartBroken, FaQuestion, FaSkull } from "react-icons/fa"
import { IconType } from "react-icons"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { AnswerFeedback } from "../../../components/answer-feedback"
import Flag from 'react-world-flags'

type ResultType = 'open' | 'correct' | 'joker' | 'incorrect'

const iconMapping: Record<ResultType, IconType> = {
  'open': FaDotCircle,
  'correct': FaCheckCircle,
  'joker': FaHeart,
  'incorrect': FaSkull
}

export const ChallengeQuestion = () => {
  const {species, player, language, countryChallenge, challengeQuestion: question, getNewChallengeQuestion, selectChallengeAnswer: selectAnswer} = useContext(AppContext)
  const {onOpen, onClose, open: isOpen} = useDisclosure()
  const navigate = useNavigate()
  const [showFeedback, setShowFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<Answer | null>(null)
  const rotate = keyframes`
    from {
      transform: rotate(360deg)
    }
    to {
      transform: rotate(0deg)
    }
  `

  const flagMedia = () => {
    onOpen()
  }

  const level = countryChallenge?.levels[0];

  useEffect(() => {
    if (!question) {
      getNewChallengeQuestion()
    }
  }, [question, level])
  

  const game = countryChallenge?.levels[0].game

  if (!question || !game || !level) {
    return <Loading/>
  }

  if (level.status === 'failed' || level.status === 'passed') {
    navigate('/challenge');
  }


  const giveAnswer = async (answer: Species) => {
    setLoading(true)
    const result = await selectAnswer(answer)
    setResponse(result)
    setIsCorrect(!!result.correct)
    setShowFeedback(true)
  }

  const handleAnimationComplete = () => {
    setShowFeedback(false)
    setLoading(false)
    getNewChallengeQuestion()
    setResponse(null)
  }

  // Initialize array with 'open'
  const results: ResultType[] = Array.from({ length: level.game.length }, () => 'open')

  // Get answers array
  const answers = level.game.scores && level.game.scores[0] && level.game.scores[0].answers || []

  // Update results with correct/incorrect based on answers
  answers.forEach(answer => {
    const index = (answer.sequence  || 1) -1
    results[index] = answer.correct ? 'correct' : 'incorrect'
  })

  const incorrectIndices = results.reduce((indices: number[], result, index) => {
    if (result === 'incorrect') indices.push(index)
    return indices
  }, [])

  let jokers = level.challenge_level.jokers
  incorrectIndices.slice(0, jokers).forEach(index => {
    results[index] = 'joker'
  })


  return (
    <>
      <Page>
        <>
          {showFeedback && (
            <AnswerFeedback 
              correct={isCorrect} 
              onAnimationComplete={handleAnimationComplete} 
            />
          )}
        </>

        <Page.Header>
          <Heading color={'gray.800'} size={'lg'} m={0}>
            {player ? player.name : <FormattedMessage id='welcome' defaultMessage={'Welcome'}/>}
          </Heading>
          <Box display={{ base: 'none', md: 'block' }}>
            <Heading size={'md'}>
              <Flex align="center" gap={2}>
                <FormattedMessage id={"Level"} defaultMessage={"Level {level}"} values={{level: level.challenge_level.sequence + 1}}/>
                <Flag 
                  code={countryChallenge?.country?.code} 
                  style={{ width: '30px', height: 'auto' }} 
                />
                  {language === 'nl' ? level.challenge_level.title_nl : level.challenge_level.title}
              </Flex>
            </Heading>
          </Box>
          <Flex gap={2} alignItems={'center'}>
            {[...Array(level.challenge_level.jokers)].map((_, i) => (
              <Icon key={i} as={i < level.remaining_jokers ? FaHeart : FaHeartBroken} color={i < level.remaining_jokers ?  "orange.600" : "orange.300"} boxSize={6} />
            ))}
          </Flex>
        </Page.Header>
        <Page.Body>
        <Box display={{ base: 'block', md: 'none' }}>
            <Heading size={'md'}>
              <Flex align="center" gap={2}>
                <FormattedMessage id={"Level"} defaultMessage={"Level {level}"} values={{level: level.challenge_level.sequence + 1}}/>
                <Flag 
                  code={countryChallenge?.country?.code} 
                  style={{ width: '30px', height: 'auto' }} 
                />
                {language === 'nl' ? level.challenge_level.title_nl : level.challenge_level.title}
              </Flex>
            </Heading>
          </Box>

        <FlagMedia question={question} isOpen={isOpen} onClose={onClose}/>
        <Box position={'relative'}>
          {game.media === 'video' && (
            <>
              <ReactPlayer
                width={'100%'}
                height={'50%'}
                url={question.videos[question.number].url}
                controls={true}
                playing={true}
              />
            </>
          )}
          {game.media === 'images' && (
            <Image
              src={question.images[question.number].url.replace('/1800', '/900')}
              onError={(e) => {
                e.currentTarget.src = '/images/birdr-logo.png';
              }}
            />

          )}
          {game.media === 'audio' && (
            <Box py={8}>
              <ReactPlayer
                width={'100%'}
                height={'50px'}
                url={question.sounds[question.number].url}
                controls={true}
                playing={true}
              />
            </Box>

          )}
          <Flex justifyContent={'end'}>
            <Link onClick={flagMedia} fontSize={'sm'} color={'red.700'}>
              🚩 <FormattedMessage id={"this seems wrong"} defaultMessage={"This seems wrong"}/>
            </Link>
          </Flex>
        </Box>
        {question.options && question.options.length ? (
          <SimpleGrid columns={{base: 1, md: 2}} gap={4}>
            {
              question.options.map((option, key) => {
                return (
                  <Button 
                    key={key} 
                    onClick={() => giveAnswer(option)} 
                    disabled={loading} 
                    colorPalette={response?.species?.id === option.id ? 'green' : response?.answer?.id === option.id ? 'red' : 'orange'}
                  >
                    <SpeciesName species={option}/>
                  </Button>
                )
              })
            }
          </SimpleGrid>

        ) : (
          <ChakraSelect
            autoFocus={true}
            placeholder={<FormattedMessage id={"type species"} defaultMessage={"Start typing your answer..."}/>}
            options={species || []}
            getOptionLabel={(q) => player?.language === 'nl' ? q.name_nl : q.name}
            getOptionValue={(q) => String(q.id || q.name)}
            isLoading={loading}
            onChange={(answer) => answer && giveAnswer(answer)}
            chakraStyles={{
              placeholder: (provided) => ({
                ...provided,
                color: 'orange.300',
                fontWeight: 'normal',
              }),
              input: (provided) => ({
                ...provided,
                color: 'orange.500',
                fontWeight: 'bold',
              })
            }}
          />
        )}

        <Heading size={'md'}>
          <FormattedMessage id={"progress"} defaultMessage={"Progress"}/>
        </Heading>
        <CardRoot bgColor={'orange.100'} p={4}>
          <Box>
            {results.map((result, i) => (
              <Icon p={1} key={i} as={iconMapping[result]} color={result === 'open' ? "orange.300" : "orange.600"} boxSize={8} />
            ))}
            </Box>
        </CardRoot>

        </Page.Body>

      </Page>
    </> 

  )
}