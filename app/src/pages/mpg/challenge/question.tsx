import {Box, Button, Flex, Heading, Icon, PopoverRoot, PopoverArrow, PopoverCloseTrigger, PopoverBody, PopoverContent, PopoverTrigger, SimpleGrid, CardRoot} from "@chakra-ui/react"
import {useContext, useEffect, useState, useCallback, useRef} from "react"
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
import { postQuestionMediaReady } from "../../../api/question-media-ready"
import { postQuestionNextMedia } from "../../../api/question-next-media"
import {
  currentPlayMediaItem,
  mediaArrayLengthForQuestion,
  mediaSlotIndexFromQuestion,
} from "../../../core/question-media-index"
import { ZoomablePlayImage } from "../../../components/zoomable-play-image"

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
  const [mediaReady, setMediaReady] = useState(false)
  const [mediaIndex, setMediaIndex] = useState<number | null>(null)
  const mediaPostedForQuestionId = useRef<number | null>(null)
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
  const gameMedia = game?.media ?? 'images'
  const mediaLength = question ? mediaArrayLengthForQuestion(question, gameMedia) : 0
  const currentMediaIndex =
    question != null
      ? (mediaIndex ?? mediaSlotIndexFromQuestion(question, mediaLength))
      : 0
  const currentImage = currentPlayMediaItem(question?.images, question)
  const currentVideo = currentPlayMediaItem(question?.videos, question)
  const currentSound = currentPlayMediaItem(question?.sounds, question)

  useEffect(() => {
    setMediaIndex(null)
  }, [question?.id])

  useEffect(() => {
    mediaPostedForQuestionId.current = null
    setMediaReady(false)
  }, [question?.id, currentMediaIndex])

  const handleFlagSuccess = useCallback(async () => {
    if (!question?.id || !player?.token) return
    const excludedId =
      game?.media === 'images'
        ? currentImage?.id
        : game?.media === 'video'
          ? currentVideo?.id
          : currentSound?.id
    try {
      await postQuestionNextMedia(question.id, player.token, excludedId)
      setMediaIndex(null)
      await getNewChallengeQuestion()
    } catch {
      // no alternate media
    }
  }, [question, player?.token, game, currentImage, currentSound, currentVideo, getNewChallengeQuestion])

  const notifyMediaReady = useCallback(() => {
    setMediaReady(true)
    if (!question?.id || !player?.token) return
    if (mediaPostedForQuestionId.current === question.id) return
    mediaPostedForQuestionId.current = question.id
    postQuestionMediaReady(question.id, player.token).catch(() => {})
  }, [question?.id, player?.token])

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
              speciesFrequency={response?.species_frequency}
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
          {game.media === 'video' && currentVideo && (
            <>
              <ReactPlayer
                key={`${question.id}-video-${currentMediaIndex}`}
                width={'100%'}
                height={'50%'}
                url={currentVideo.url}
                controls={true}
                playing={true}
                onReady={notifyMediaReady}
              />
            </>
          )}
          {game.media === 'images' && currentImage && (
            <ZoomablePlayImage
              key={`${question.id}-img-${currentMediaIndex}`}
              previewSrc={currentImage.url.replace('/1800', '/900')}
              fullSrc={currentImage.url}
              onLoad={notifyMediaReady}
              onError={(e) => {
                e.currentTarget.src = '/images/birdr-logo.png';
                notifyMediaReady()
              }}
            />
          )}
          {game.media === 'audio' && currentSound && (
            <Box py={8}>
              <ReactPlayer
                key={`${question.id}-audio-${currentMediaIndex}`}
                width={'100%'}
                height={'50px'}
                url={currentSound.url}
                controls={true}
                playing={true}
                onReady={notifyMediaReady}
              />
            </Box>

          )}
          <Flex justifyContent={'end'}>
            {game.media === 'video' && currentVideo && (
              <FlagMediaButton media={currentVideo} onFlagSuccess={handleFlagSuccess} />
            )}
            {game.media === 'images' && currentImage && (
              <FlagMediaButton media={currentImage} onFlagSuccess={handleFlagSuccess} />
            )}
            {game.media === 'audio' && currentSound && (
              <FlagMediaButton media={currentSound} onFlagSuccess={handleFlagSuccess} />
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
                    disabled={loading || !mediaReady} 
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
            isDisabled={!mediaReady}
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