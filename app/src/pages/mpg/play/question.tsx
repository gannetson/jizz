import {
  Box,
  Button,
  Flex,
  Heading,
  Image,
  Link,
  List,
  ListItem,
  SimpleGrid,
  Text,
  useDisclosure
} from "@chakra-ui/react"
import {Select} from "chakra-react-select"
import React, {useContext, useState} from "react"
import ReactPlayer from "react-player"
import WebsocketContext from "../../../core/websocket-context"
import AppContext, {Answer, Species} from "../../../core/app-context"
import {SpeciesName} from "../../../components/species-name"
import {FormattedMessage} from "react-intl"
import {FlagMedia} from "./flag-media"
import {keyframes} from "@emotion/react"
import {ViewSpecies} from "../../../components/view-species"
import {SpeciesModal} from "../../../components/species-modal"
import {AnswerFeedback} from "../../../components/answer-feedback"
import {WaitingComponent} from "./waiting"
import {BsImageFill, BsImages} from "react-icons/bs"
import {PlayerItem} from "./player-item"
import {useNavigate} from "react-router-dom"


export const QuestionComponent = () => {
  const {species, player, game} = useContext(AppContext)
  const {players, nextQuestion, question, submitAnswer, answer} = useContext(WebsocketContext)
  const {onOpen, onClose, isOpen} = useDisclosure()
  const [showSpecies, setShowSpecies] = useState<Species | undefined>(undefined)
  const {isOpen: isSpeciesOpen, onOpen: onSpeciesOpen, onClose: onSpeciesClose} = useDisclosure()
  const [showFeedback, setShowFeedback] = useState(false)

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

  if (!question || !game) return <></>

  const flagMedia = () => {
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
    <Link float={'right'} onClick={flagMedia} fontSize={'sm'} textColor={'red.700'}>
      🚩 <FormattedMessage id={"this seems wrong"} defaultMessage={"This seems wrong"}/>
    </Link>
  )

  const nextButton = (
    <Box>
      {done ? (
        <Button onClick={endGame} width='full'>
          <FormattedMessage id={'end game'} defaultMessage={'End game'}/>
        </Button>
      ) : (
        isHost ? (
          <Button onClick={getNextQuestion} width='full'>
            <FormattedMessage id={'next question'} defaultMessage={'Next question'}/>
          </Button>
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
      <FlagMedia question={question} isOpen={isOpen} onClose={onClose}/>
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
        {game.media === 'video' && (
          <>
            <ReactPlayer
              width={'100%'}
              height={'50%'}
              url={question.videos[question.number].url}
              controls={true}
              playing={true}
            />
            {flag}
            <Text fontSize={'sm'}>
              {question.videos[question.number].contributor} {' / '}
              <Link href={question.videos[question.number].link} isExternal>
                Macaulay Library
              </Link>
            </Text>
          </>
        )}
        {game.media === 'images' && (
          <>
            <Image
              src={question.images[question.number].url.replace('/1800', '/900')}
              fallback={
                <Image
                  src='/images/birdr-logo.png'
                  animation={`${rotate} infinite 2s linear`}
                  width={'200px'}
                  maxHeight={'600px'}
                  marginX={'auto'}
                  marginY={['20px', '150px']}
                />
              }
            />
            {flag}
            <Text fontSize={'sm'}>
              {question.images[question.number].contributor} {' / '}
              <Link onClick={skipQuestion} href={question.images[question.number].link} isExternal>
                Macaulay Library
              </Link>
            </Text>
          </>

        )}
        {game.media === 'audio' && (
          <Box py={8}>
            <>
              <ReactPlayer
                width={'100%'}
                height={'50px'}
                url={question.sounds[question.number].url}
                controls={true}
                playing={true}
              />
              {flag}
              <Text fontSize={'sm'}>
                {question.images[question.number].contributor} {' / '}
                <Link href={question.images[question.number].link} isExternal>
                  Macaulay Library
                </Link>
              </Text>
            </>
          </Box>

        )}

      </Box>

      {question.options && question.options.length ? (
        <SimpleGrid columns={{base: 1, md: 2}} spacing={4}>
          {
            question.options.map((option, key) => {
              if (answer) {
                return (
                  <Button
                    key={key}
                    onClick={() => viewSpecies(option)}
                    gap={4}
                    colorScheme={answer?.species?.id === option.id ? 'green' : answer?.answer?.id === option.id ? 'red' : 'orange'}
                  >
                    <SpeciesName species={option}/>
                    <BsImages/>
                  </Button>
                )
              } else {
                return (
                  <Button key={key} onClick={() => selectAnswer(option)}>
                    <SpeciesName species={option}/>
                  </Button>
                )
              }
            })
          }
        </SimpleGrid>

      ) : (
        answer ? (
          <SimpleGrid columns={{base: 1, md: 2}} spacing={4}>
            <Button
              onClick={() => answer.species && viewSpecies(answer.species)}
              colorScheme={'green'}
              gap={4}
            >
              {answer.species?.name}
              <BsImages/>
            </Button>
            {!answer?.correct && (
              <Button
                onClick={() => answer.answer && viewSpecies(answer.answer)}
                colorScheme={'red'}
                gap={4}
              >
                {answer.answer?.name}
                <BsImages/>
              </Button>
            )}
          </SimpleGrid>
        ) : (
          <Select
            autoFocus={true}
            placeholder={<FormattedMessage id={"type species"} defaultMessage={"Start typing your answer..."}/>}

            options={species?.map((q) => ({
              label: player?.language === 'nl' ? q.name_nl : q.name,
              value: q
            }))}
            onChange={(answer) => answer && selectAnswer(answer.value)}
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
        )
      )}
      {answer && (
        <>
          {nextButton}
          <Box position={'relative'} mt={8}>
            <Flex direction={'column'} gap={8}>
              <List spacing={4}>
                {players && players.map((player, index) => (
                  <ListItem key={index}>
                    <PlayerItem showRanking={false} player={player}/>
                  </ListItem>
                ))}
              </List>
            </Flex>
          </Box>
        </>
      )}
    </>

  )
}