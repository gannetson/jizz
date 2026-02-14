import {Box, Button, Flex, Heading, Icon, Image, PopoverRoot, PopoverArrow, PopoverCloseTrigger, PopoverBody, PopoverContent, PopoverTrigger, SimpleGrid, CardRoot} from "@chakra-ui/react"
import {useContext, useEffect, useState} from "react"
import ReactPlayer from "react-player"
import WebsocketContext from "../../../core/websocket-context"
import AppContext, {Answer, Species} from "../../../core/app-context"
import {SpeciesName} from "../../../components/species-name"
import {FormattedMessage} from "react-intl"
import {FlagMediaButton} from "../../../components/flag-media-button"
import {keyframes} from "@emotion/react"
import { Loading } from "../../../components/loading"
import { Page } from "../../../shared/components/layout"
import { FaCheckCircle, FaDotCircle, FaHeart, FaHeartBroken, FaQuestion, FaSkull } from "react-icons/fa"
import { IconType } from "react-icons"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { AnswerFeedback } from "../../../components/answer-feedback"
import Flag from 'react-world-flags'
import SpeciesCombobox from "../../../components/species-combobox"

type ResultType = 'open' | 'correct' | 'joker' | 'incorrect'

const iconMapping: Record<ResultType, IconType> = {
  'open': FaDotCircle,
  'correct': FaCheckCircle,
  'joker': FaHeart,
  'incorrect': FaSkull
}

export const ChallengeQuestion = () => {
  const {species, player, language, countryChallenge, challengeQuestion: question, getNewChallengeQuestion, selectChallengeAnswer: selectAnswer} = useContext(AppContext)
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
              <Icon key={i} as={i < level.remaining_jokers ? FaHeart : FaHeartBroken} color={i < level.remaining_jokers ?  "primary.600" : "primary.300"} boxSize={6} />
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
            {game.media === 'video' && question.videos[question.number] && (
              <FlagMediaButton media={question.videos[question.number]} />
            )}
            {game.media === 'images' && question.images[question.number] && (
              <FlagMediaButton media={question.images[question.number]} />
            )}
            {game.media === 'audio' && question.sounds[question.number] && (
              <FlagMediaButton media={question.sounds[question.number]} />
            )}
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
                    colorPalette={response?.species?.id === option.id ? 'success' : response?.answer?.id === option.id ? 'error' : 'primary'}
                  >
                    <SpeciesName species={option}/>
                  </Button>
                )
              })
            }
          </SimpleGrid>

        ) : (
          <>
          <Heading size={'md'}>
            <FormattedMessage id={"type species"} defaultMessage={"Start typing your answer..."}/>
          </Heading>
          <SpeciesCombobox
            species={species || []}
            playerLanguage={player?.language}
            onSelect={giveAnswer}
            loading={loading}
            autoFocus={true}
            placeholder={<FormattedMessage id={"type species"} defaultMessage={"Start typing your answer..."}/>}
          />
          </>
        )}

        <Heading size={'md'}>
          <FormattedMessage id={"progress"} defaultMessage={"Progress"}/>
        </Heading>
        <CardRoot bgColor={'primary.100'} p={4}>
          <Box>
            {results.map((result, i) => (
              <Icon p={1} key={i} as={iconMapping[result]} color={result === 'open' ? "primary.300" : "primary.600"} boxSize={8} />
            ))}
            </Box>
        </CardRoot>

        </Page.Body>

      </Page>
    </> 

  )
}