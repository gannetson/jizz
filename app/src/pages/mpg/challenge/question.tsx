import {Box, Button, Flex, Heading, Icon, Image, Link, SimpleGrid, useDisclosure} from "@chakra-ui/react"
import {Select} from "chakra-react-select"
import {useContext, useEffect} from "react"
import ReactPlayer from "react-player"
import WebsocketContext from "../../../core/websocket-context"
import AppContext, {Answer, Species} from "../../../core/app-context"
import {SpeciesName} from "../../../components/species-name"
import {FormattedMessage} from "react-intl"
import {FlagMedia} from "../play/flag-media"
import {keyframes} from "@emotion/react"
import { Loading } from "../../../components/loading"
import Page from "../../layout/page"
import { FaCheckCircle, FaDotCircle, FaHeart, FaHeartBroken, FaSkull } from "react-icons/fa"
import { IconType } from "react-icons"
import { useNavigate } from "react-router-dom"

type ResultType = 'open' | 'correct' | 'joker' | 'incorrect'

const iconMapping: Record<ResultType, IconType> = {
  'open': FaDotCircle,
  'correct': FaCheckCircle,
  'joker': FaHeart,
  'incorrect': FaSkull
}

export const ChallengeQuestion = () => {
  const {species, player, countryChallenge, challengeQuestion: question, getNewChallengeQuestion, selectChallengeAnswer: selectAnswer} = useContext(AppContext)
  const {onOpen, onClose, isOpen} = useDisclosure()
  const navigate = useNavigate()

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
    console.log(level?.status)
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
      <Page.Header>
        <Heading textColor={'gray.800'} size={'lg'} m={0} noOfLines={1}>
          {player ? player.name : <FormattedMessage id='welcome' defaultMessage={'Welcome'}/>}
        </Heading>
        <Flex gap={2} alignItems={'center'}>
          {results.map((result, i) => (
            <Icon key={i} as={iconMapping[result]} color={result === 'open' ? "orange.300" : "orange.600"} boxSize={6} />
          ))}
        </Flex>
        <Flex gap={2} alignItems={'center'}>
          {[...Array(level.challenge_level.jokers)].map((_, i) => (
            <Icon key={i} as={i < level.remaining_jokers ? FaHeart : FaHeartBroken} color={i < level.remaining_jokers ?  "orange.600" : "orange.300"} boxSize={6} />
          ))}
        </Flex>
      </Page.Header>
      <Page.Body>
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
            fallback={
              <Image
                src='/images/jizz-logo.png'
                animation={`${rotate} infinite 2s linear`}
                width={'200px'}
                maxHeight={'600px'}
                marginX={'auto'}
                marginY={['20px', '150px']}
              />
            }
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
          <Link onClick={flagMedia} fontSize={'sm'} textColor={'red.700'}>
            🚩 <FormattedMessage id={"this seems wrong"} defaultMessage={"This seems wrong"}/>
          </Link>
        </Flex>
      </Box>
      {question.options && question.options.length ? (
        <SimpleGrid columns={{base: 1, md: 2}} spacing={4}>
          {
            question.options.map((option, key) => {
              return (
                <Button key={key} colorScheme='orange' onClick={() => selectAnswer(option)}>
                  <SpeciesName species={option}/>
                </Button>
              )
            })
          }
        </SimpleGrid>

      ) : (
        <Select
          autoFocus={true}
          options={species?.map((q) => ({
            label: player?.language === 'nl' ? q.name_nl : q.name,
            value: q
          }))}
          onChange={(answer) => answer && selectAnswer(answer.value)}
        />
      )}
      </Page.Body>
    </Page>
    </> 

  )
}