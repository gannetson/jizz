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
  useDisclosure,
  Select,
  Portal,
  createListCollection
} from "@chakra-ui/react"
import React, {useContext, useState, useMemo} from "react"
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

const SpeciesSelect = ({ species, player, onSelect, autoFocus, placeholder }: { 
  species: Species[], 
  player: any, 
  onSelect: (species: Species) => void,
  autoFocus?: boolean,
  placeholder?: React.ReactNode
}) => {
  const collection = useMemo(() => {
    const items = species.map((s, index) => ({
      label: player?.language === 'nl' ? s.name_nl : s.name,
      value: String(s.id || s.name),
      original: s,
      index,
    }));
    return createListCollection({ items });
  }, [species, player?.language]);

  const handleValueChange = (details: { value: string[] }) => {
    const selectedValue = details.value[0];
    const selectedSpecies = species.find((s) => String(s.id || s.name) === selectedValue);
    if (selectedSpecies) {
      onSelect(selectedSpecies);
    }
  };

  const placeholderText = typeof placeholder === 'string' ? placeholder : 'Start typing your answer...';

  return (
    <Select.Root
      collection={collection}
      value={[]}
      onValueChange={handleValueChange}
    >
      <Select.HiddenSelect />
      <Select.Control>
        <Select.Trigger autoFocus={autoFocus}>
          <Select.ValueText placeholder={placeholderText} />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content bg="white" borderRadius="md" borderWidth="2px" borderColor="primary.300" boxShadow="xl" p={1}>
            {collection.items.map((item: any) => (
              <Select.Item key={item.value} item={item}>
                <Select.ItemIndicator />
                <Select.ItemText>{item.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );
};

export const QuestionComponent = () => {
  const {species, player, game} = useContext(AppContext)
  const {players, nextQuestion, question, submitAnswer, answer} = useContext(WebsocketContext)
  const {onOpen, onClose, open: isOpen} = useDisclosure()
  const [showSpecies, setShowSpecies] = useState<Species | undefined>(undefined)
  const {open: isSpeciesOpen, onOpen: onSpeciesOpen, onClose: onSpeciesClose} = useDisclosure()
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
    <Link float={'right'} onClick={flagMedia} fontSize={'sm'} color={'error.700'}>
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
          <Button onClick={getNextQuestion} width='full' colorPalette={'primary'}>
            <FormattedMessage id={'next question'} defaultMessage={'Hext question'}/>
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
              <Link href={question.videos[question.number].link} target="_blank" rel="noopener noreferrer">
                Macaulay Library
              </Link>
            </Text>
          </>
        )}
        {game.media === 'images' && (
          <>
            <Image
              src={question.images[question.number].url.replace('/1800', '/900')}
              onError={(e) => {
                e.currentTarget.src = '/images/birdr-logo.png';
              }}
            />
            {flag}
            <Text fontSize={'sm'}>
              {question.images[question.number].contributor} {' / '}
              <Link onClick={skipQuestion} href={question.images[question.number].link} target="_blank" rel="noopener noreferrer">
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
                <Link href={question.images[question.number].link} target="_blank" rel="noopener noreferrer">
                  Macaulay Library
                </Link>
              </Text>
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
                  <Button colorPalette={'primary'} key={key} onClick={() => selectAnswer(option)}>
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
              {answer.species?.name}
              <BsImages/>
            </Button>
            {!answer?.correct && (
              <Button
                onClick={() => answer.answer && viewSpecies(answer.answer)}
                colorPalette={'error'}
                gap={4}
              >
                {answer.answer?.name}
                <BsImages/>
              </Button>
            )}
          </SimpleGrid>
        ) : (
          <SpeciesSelect
            species={species || []}
            player={player}
            onSelect={selectAnswer}
            autoFocus={true}
            placeholder={<FormattedMessage id={"type species"} defaultMessage={"Start typing your answer..."}/>}
          />
        )
      )}
      {nextButton}
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