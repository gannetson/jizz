import {
  Box,
  Button,
  Flex,
  Heading,
  Image,
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
import {useNavigate} from "react-router-dom"
import SpeciesCombobox from "../../../components/species-combobox"
import { ComparisonButton } from "../../../components/comparison-button"
import { postQuestionMediaReady } from "../../../api/question-media-ready"

export const QuestionComponent = () => {
  const {species, player, game, speciesLanguage} = useContext(AppContext)
  const {players, nextQuestion, question, submitAnswer, answer} = useContext(WebsocketContext)
  const {onOpen, onClose, open: isOpen} = useDisclosure()
  const [flagMediaInfo, setFlagMediaInfo] = useState<{
    type: 'image' | 'video' | 'audio'
    url: string
    link?: string | null
    contributor?: string | null
    index: number
  } | null>(null)
  const [showSpecies, setShowSpecies] = useState<Species | undefined>(undefined)
  const {open: isSpeciesOpen, onOpen: onSpeciesOpen, onClose: onSpeciesClose} = useDisclosure()
  const [showFeedback, setShowFeedback] = useState(false)
  // Local state for media index (after flagging). null = use question.sequence so we don't flash first image on reload.
  const [mediaIndex, setMediaIndex] = useState<number | null>(null)
  const [mediaReady, setMediaReady] = useState(false)
  const mediaPostedKey = useRef<string | null>(null)

  const done = (game?.length || 1) <= (question?.sequence || 0)
  const navigate = useNavigate()

  const endGame = () => {
    navigate('/game/ended')
  }
  const isHost = player?.name === game?.host?.name
  const viewSpecies = (species: Species) => {
    setShowSpecies(species)
    onSpeciesOpen()
  }

  // Initialize or reset mediaIndex when question changes
  useEffect(() => {
    if (question) {
      setMediaIndex(question.sequence ?? 0)
    }
  }, [question?.id]) // Reset when question ID changes

  const currentMediaIndex = mediaIndex ?? question?.sequence ?? 0

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
    const currentIndex = mediaIndex ?? question.sequence ?? 0
    let mediaData: {
      id?: number
      type: 'image' | 'video' | 'audio'
      url: string
      link?: string | null
      contributor?: string | null
      index: number
    } | null = null

    if (game.media === 'images' && question.images?.length) {
      const item = question.images[currentIndex]
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
    } else if (game.media === 'video' && question.videos?.length) {
      const item = question.videos[currentIndex]
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
    } else if (game.media === 'audio' && question.sounds?.length) {
      const item = question.sounds[currentIndex]
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
    setShowFeedback(false)
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
          <Button onClick={getNextQuestion} width='full' colorPalette={'primary'} autoFocus>
            <FormattedMessage id={'next question'} defaultMessage={'Next question'}/>
          </Button>
          ) : (
            <Button disabled={true} width='full' colorPalette={'primary'}>
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
        onSuccess={() => {
          // After successful flagging, change to next media item in the sequence
          if (question && game) {
            let maxIndex = 0
            if (game.media === 'images' && question.images?.length) {
              maxIndex = question.images.length - 1
            } else if (game.media === 'video' && question.videos?.length) {
              maxIndex = question.videos.length - 1
            } else if (game.media === 'audio' && question.sounds?.length) {
              maxIndex = question.sounds.length - 1
            }
            
            // Increment media index, wrap around if at the end
            const nextIndex = currentMediaIndex >= maxIndex ? 0 : currentMediaIndex + 1
            setMediaIndex(nextIndex)
          }
        }}
      />
      {nextButton}
      <>
        {showFeedback && (
          <AnswerFeedback
            correct={Boolean(answer?.correct)}
            onAnimationComplete={handleAnimationComplete}
          />
        )}
      </>
      <Box position={'relative'}>
        {game.media === 'video' && question.videos[currentMediaIndex] && (
          <>
            <ReactPlayer
              width={'100%'}
              height={'50%'}
              url={question.videos[currentMediaIndex].url}
              controls={true}
              playing={true}
              onReady={notifyMediaReady}
            />
            <Flex direction="row" justify="space-between" align="center" wrap="wrap" gap={2}>
              <MediaCredits media={question.videos[currentMediaIndex]} />
              {flag}
            </Flex>
          </>
        )}
        {game.media === 'images' && question.images[currentMediaIndex] && (
          <>
            <Image
              src={question.images[currentMediaIndex].url.replace('/1800', '/900')}
              onLoad={notifyMediaReady}
              onError={(e) => {
                e.currentTarget.src = '/images/birdr-logo.png';
                notifyMediaReady()
              }}
            />
            <Flex direction="row" justify="space-between" align="center" wrap="wrap" gap={2}>
              <MediaCredits 
                media={question.images[currentMediaIndex]} 
                onClick={skipQuestion}
              />
              {flag}
            </Flex>
          </>

        )}
        {game.media === 'audio' && question.sounds[currentMediaIndex] && (
          <Box py={8}>
            <>
              <ReactPlayer
                width={'100%'}
                height={'50px'}
                url={question.sounds[currentMediaIndex].url}
                controls={true}
                playing={true}
                onReady={notifyMediaReady}
              />
              <Flex direction="row" justify="space-between" align="center" wrap="wrap" gap={2}>
                <MediaCredits media={question.sounds[currentMediaIndex]} />
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