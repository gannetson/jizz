import {
  Box,
  Button,
  Flex,
  Heading,
  Link,
  ListRoot,
  ListItem,
  SimpleGrid,
  Text,
  useDisclosure
} from "@chakra-ui/react"
import React, {useContext, useState, useEffect, useCallback, useRef} from "react"
import ReactPlayer from "react-player"
import WebsocketContext from "../../../core/websocket-context"
import AppContext, {Answer, Species} from "../../../core/app-context"
import {SpeciesName} from "../../../components/species-name"
import {FormattedMessage} from "react-intl"
import {FlagMedia} from "./flag-media"
import { MediaCredits } from "../../../components/media-credits"
import {keyframes} from "@emotion/react"
import {ViewSpecies} from "../../../components/view-species"
import {SpeciesModal} from "../../../components/species-modal"
import {AnswerFeedback} from "../../../components/answer-feedback"
import {WaitingComponent} from "./waiting"
import {BsImageFill, BsImages} from "react-icons/bs"
import {PlayerItem} from "./player-item"
import SpeciesCombobox from "../../../components/species-combobox"
import { ComparisonButton } from "../../../components/comparison-button"
import { ZoomablePlayImage } from "../../../components/zoomable-play-image"
import { postQuestionMediaReady } from "../../../api/question-media-ready"
import { postQuestionNextMedia } from "../../../api/question-next-media"
import {
  currentPlayMediaItem,
  mediaArrayLengthForQuestion,
  mediaSlotIndexFromQuestion,
} from "../../../core/question-media-index"

export const QuestionComponent = () => {
  const {species, player, game, speciesLanguage} = useContext(AppContext)
  const {players, nextQuestion, question, submitAnswer, answer, endGame: endGameSession, patchQuestionMedia} = useContext(WebsocketContext)
  const {onOpen, onClose, open: isOpen} = useDisclosure()
  const [flagMediaInfo, setFlagMediaInfo] = useState<{
    id?: number
    type: 'image' | 'video' | 'audio'
    url: string
    link?: string | null
    contributor?: string | null
    index: number
  } | null>(null)
  const [showSpecies, setShowSpecies] = useState<Species | undefined>(undefined)
  const {open: isSpeciesOpen, onOpen: onSpeciesOpen, onClose: onSpeciesClose} = useDisclosure()
  const [showFeedback, setShowFeedback] = useState(false)
  const [mediaIndex, setMediaIndex] = useState<number | null>(null)
  const [mediaReady, setMediaReady] = useState(false)
  const [advancingQuestion, setAdvancingQuestion] = useState(false)
  const mediaPostedKey = useRef<string | null>(null)

  const done = (game?.length || 1) <= (question?.sequence || 0)

  const endGame = () => {
    endGameSession()
  }
  const isHost = player?.name === game?.host?.name
  const viewSpecies = (species: Species) => {
    setShowSpecies(species)
    onSpeciesOpen()
  }

  useEffect(() => {
    setMediaIndex(null)
  }, [question?.id])

  useEffect(() => {
    setAdvancingQuestion(false)
  }, [question?.id])

  const gameMedia = game?.media ?? 'images'
  const mediaLength = question ? mediaArrayLengthForQuestion(question, gameMedia) : 0
  const currentMediaIndex =
    mediaIndex ??
    (question ? mediaSlotIndexFromQuestion(question, mediaLength) : 0)
  const currentImage = currentPlayMediaItem(question?.images, question)
  const currentVideo = currentPlayMediaItem(question?.videos, question)
  const currentSound = currentPlayMediaItem(question?.sounds, question)

  useEffect(() => {
    mediaPostedKey.current = null
    setMediaReady(false)
  }, [question?.id, currentMediaIndex])

  const notifyMediaReady = useCallback(() => {
    setMediaReady(true)
    if (!question?.id || !player?.token) return
    const key = `${question.id}-${currentMediaIndex}`
    if (mediaPostedKey.current === key) return
    mediaPostedKey.current = key
    postQuestionMediaReady(question.id, player.token).catch(() => {})
  }, [question?.id, player?.token, currentMediaIndex])

  const selectAnswer = async (species?: Species) => {
    setShowFeedback(false)
    if (player && submitAnswer) {
      const answer: Answer = {
        question,
        player,
        answer: species,
      }
      await submitAnswer(answer)
      setShowFeedback(true)
    }
  }

  const rotate = keyframes`
      from {
          transform: rotate(360deg)
      }
      to {
          transform: rotate(0deg)
      }
  `

  if (!game) return <></>
  
  // Show loading state when question is being fetched (cleared during game transition)
  if (!question) {
    return (
      <Box textAlign="center" py={8}>
        <Text fontSize="lg">
          <FormattedMessage id="loading question" defaultMessage="Loading question..." />
        </Text>
      </Box>
    )
  }

  const flagMedia = () => {
    if (!question || !game) return
    const currentIndex = currentMediaIndex
    let mediaData: {
      id?: number
      type: 'image' | 'video' | 'audio'
      url: string
      link?: string | null
      contributor?: string | null
      index: number
    } | null = null

    if (game.media === 'images' && currentImage) {
      const item = currentImage
      if (item) {
        mediaData = {
          id: item.id,
          type: 'image',
          url: item.url,
          link: item.link,
          contributor: item.contributor,
          index: currentIndex,
        }
      }
    } else if (game.media === 'video' && currentVideo) {
      const item = currentVideo
      if (item) {
        mediaData = {
          id: item.id,
          type: 'video',
          url: item.url,
          link: item.link,
          contributor: item.contributor,
          index: currentIndex,
        }
      }
    } else if (game.media === 'audio' && currentSound) {
      const item = currentSound
      if (item) {
        mediaData = {
          id: item.id,
          type: 'audio',
          url: item.url,
          link: item.link,
          contributor: item.contributor,
          index: currentIndex,
        }
      }
    }

    setFlagMediaInfo(mediaData)
    onOpen()
  }

  const skipQuestion = () => {
    selectAnswer(undefined)
  }


  const handleAnimationComplete = () => {
    setShowFeedback(false)
  }

  const getNextQuestion = () => {
    if (advancingQuestion) return
    setShowFeedback(false)
    setAdvancingQuestion(true)
    nextQuestion()
  }


  const flag = (
    <Link onClick={flagMedia} fontSize={'sm'} color={'error.700'}>
      🚩 <FormattedMessage id={"this seems wrong"} defaultMessage={"This seems wrong"}/>
    </Link>
  )

  const nextButton = (
    <Box>
      {done ? (
        <Button onClick={endGame} width='full' colorPalette={'primary'}>
          <FormattedMessage id={'end game'} defaultMessage={'End game'}/>
        </Button>
      ) : (
        isHost ? (
          answer ? (
          <Button
            onClick={getNextQuestion}
            width='full'
            colorPalette={'primary'}
            autoFocus
            disabled={advancingQuestion}
            loading={advancingQuestion}
          >
            <FormattedMessage id={'next question'} defaultMessage={'Next question'}/>
          </Button>
          ) : (
            <Button disabled width='full' colorPalette={'primary'}>
              <FormattedMessage id={'next question'} defaultMessage={'Next question'}/>
            </Button>
          )
        ) : (
          <FormattedMessage
            defaultMessage={'Waiting for {host} to continue to the next question'}
            id={'waiting for host to click next question'}
            values={{host: game?.host?.name || 'host'}}/>
        )

      )}
    </Box>

  )

  return (
    <>
      <SpeciesModal species={showSpecies} onClose={onSpeciesClose} isOpen={isSpeciesOpen}/>
      <FlagMedia
        isOpen={isOpen}
        onClose={() => {
          setFlagMediaInfo(null)
          onClose()
        }}
        media={flagMediaInfo}
        useMediaReview
        onSuccess={async () => {
          if (!question?.id || !player?.token) return
          const excludedId = flagMediaInfo?.id
          try {
            const patch = await postQuestionNextMedia(
              question.id,
              player.token,
              excludedId
            )
            patchQuestionMedia(patch)
            setMediaIndex(null)
            mediaPostedKey.current = null
            setMediaReady(false)
          } catch {
            // No alternate media or request failed — keep current question state
          }
        }}
      />
      {nextButton}
      <>
        {showFeedback && (
          <AnswerFeedback
            correct={Boolean(answer?.correct)}
            speciesFrequency={answer?.species_frequency}
            onAnimationComplete={handleAnimationComplete}
          />
        )}
      </>
      <Box position={'relative'}>
        {game.media === 'video' && currentVideo && (
          <>
            <ReactPlayer
              width={'100%'}
              height={'50%'}
              url={currentVideo.url}
              controls={true}
              playing={true}
              onReady={notifyMediaReady}
            />
            <Flex direction="row" justify="space-between" align="center" wrap="wrap" gap={2}>
              <MediaCredits media={currentVideo} />
              {flag}
            </Flex>
          </>
        )}
        {game.media === 'images' && currentImage && (
          <>
            <ZoomablePlayImage
              previewSrc={currentImage.url.replace('/1800', '/900')}
              fullSrc={currentImage.url}
              onLoad={notifyMediaReady}
              onError={(e) => {
                e.currentTarget.src = '/images/birdr-logo.png';
                notifyMediaReady()
              }}
            />
            <Flex direction="row" justify="space-between" align="center" wrap="wrap" gap={2}>
              <MediaCredits 
                media={currentImage} 
                onClick={skipQuestion}
              />
              {flag}
            </Flex>
          </>

        )}
        {game.media === 'audio' && currentSound && (
          <Box py={8}>
            <>
              <ReactPlayer
                width={'100%'}
                height={'50px'}
                url={currentSound.url}
                controls={true}
                playing={true}
                onReady={notifyMediaReady}
              />
              <Flex direction="row" justify="space-between" align="center" wrap="wrap" gap={2}>
                <MediaCredits media={currentSound} />
                {flag}
              </Flex>
            </>
          </Box>

        )}

      </Box>

      {question.options && question.options.length ? (
        <SimpleGrid columns={{base: 1, md: 2}} gap={4}>
          {
            question.options.map((option, key) => {
              if (answer) {
                return (
                  <Button
                    key={key}
                    onClick={() => viewSpecies(option)}
                    gap={4}
                    colorPalette={
                      answer?.species?.id === option.id
                      ? 'success'
                      : answer?.answer?.id === option.id ? 'error' : 'warning'}
                  >
                    <SpeciesName species={option}/>
                  </Button>
                )
              } else {
                return (
                  <Button colorPalette={'primary'} key={key} onClick={() => selectAnswer(option)} disabled={!mediaReady}>
                    <SpeciesName species={option}/>
                  </Button>
                )
              }
            })
          }
        </SimpleGrid>

      ) : (
        answer ? (
          <SimpleGrid columns={{base: 1, md: 2}} gap={4}>
            <Button
              onClick={() => answer.species && viewSpecies(answer.species)}
              colorPalette={'success'}
              gap={4}
            >
              <SpeciesName species={answer.species}/>
            </Button>
            {!answer?.correct && (
              <Button
                onClick={() => answer.answer && viewSpecies(answer.answer)}
                colorPalette={'error'}
                gap={4}
              >
                <SpeciesName species={answer.answer}/>
              </Button>
            )}
          </SimpleGrid>
        ) : (
          <SpeciesCombobox
            species={species || []}
            playerLanguage={speciesLanguage ?? player?.language}
            onSelect={(selected) => selectAnswer(selected)}
            isDisabled={!mediaReady}
            autoFocus={true}
            placeholder={<FormattedMessage id={"type species"} defaultMessage={"Start typing your answer..."}/>}
          />
        )
      )}
      {nextButton}
      {answer && answer.correct === false && answer.species && answer.answer && (
        <ComparisonButton
          species1Id={answer.species.id}
          species2Id={answer.answer.id}
          species1Name={answer.species.name_translated || answer.species.name}
          species2Name={answer.answer.name_translated || answer.answer.name}
          buttonLabel={<FormattedMessage id="view_comparison" defaultMessage="Comparison" />}
        />
      )}
      {answer && (
          <Box position={'relative'} mt={8}>
            <Flex direction={'column'} gap={8}>
              <ListRoot gap={4}>
                {players && players.map((player, index) => (
                  <ListItem key={index}>
                    <PlayerItem showRanking={false} player={player}/>
                  </ListItem>
                ))}
              </ListRoot>
            </Flex>
          </Box>
      )}
    </>

  )
}