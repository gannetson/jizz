import {Box, Button, Flex, Heading, Icon, Image, Link, Popover, PopoverArrow,PopoverCloseButton,  PopoverBody, PopoverContent, PopoverTrigger, SimpleGrid, useDisclosure, Card, useColorModeValue, Show} from "@chakra-ui/react"
import {Select} from "chakra-react-select"
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
  const [showAnimation, setShowAnimation] = useState<'correct' | 'incorrect' | null>(null)
  const [heartState, setHeartState] = useState<'whole' | 'broken'>('whole')
  const [loading, setLoading] = useState(false)

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
    const correct = await selectAnswer(answer)
    setShowAnimation(correct ? 'correct' : 'incorrect')
    if (!correct) {
      // Toggle between whole and broken heart
      const interval = setInterval(() => {
        setHeartState('broken')
      }, 700)
      setTimeout(() => {
        clearInterval(interval)
        setShowAnimation(null)
        setHeartState('whole')
        setLoading(false)
        getNewChallengeQuestion()
      }, 2000)
    } else {
      setTimeout(() => {
        setShowAnimation(null)
        setLoading(false)
        getNewChallengeQuestion()
      }, 2000)
    }
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
            {showAnimation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed',
                  top: 150,
                  left: 0,
                  right: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                }}
              >
                {showAnimation === 'correct' ? (
                  <motion.div
                    initial={{ scale: 0, y: -100 }}
                    animate={{ 
                      scale: [0, 1.2, 1],
                      y: [0, -20, 0],
                    }}
                    transition={{
                      duration: 0.5,
                      times: [0, 0.3, 1],
                      ease: "easeOut"
                    }}
                  >
                    <Box
                      position="relative"
                      width="160px"
                      height="160px"
                      borderRadius="50%"
                      bg="white"
                      boxShadow="0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1), inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      _before={{
                        content: '""',
                        position: 'absolute',
                        top: '2px',
                        left: '2px',
                        right: '2px',
                        bottom: '2px',
                        borderRadius: '50%',
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.3))',
                        zIndex: 1
                      }}
                    >
                      <Icon
                        as={FaCheckCircle}
                        boxSize={32}
                        color="orange.600"
                        position="relative"
                        zIndex={2}
                      />
                    </Box>
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ 
                      x: [0, 20, -20, 20, -20, 0],
                      rotate: [0, 10, -10, 10, 0, 0],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: 2,
                      ease: "easeInOut"
                    }}
                  >
                    <Box
                      position="relative"
                      width="160px"
                      height="160px"
                      borderRadius="50%"
                      bg="white"
                      boxShadow="0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1), inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      _before={{
                        content: '""',
                        position: 'absolute',
                        top: '2px',
                        left: '2px',
                        right: '2px',
                        bottom: '2px',
                        borderRadius: '50%',
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.3))',
                        zIndex: 1
                      }}
                    >
                      <Icon
                        as={heartState === 'whole' ? FaHeart : FaHeartBroken}
                        boxSize={32}
                        color="orange.600"
                        position="relative"
                        zIndex={2}
                      />
                    </Box>
                  </motion.div>
                )}
              </motion.div>
            )}
        </>

        <Page.Header>
          <Heading textColor={'gray.800'} size={'lg'} m={0} noOfLines={1}>
            {player ? player.name : <FormattedMessage id='welcome' defaultMessage={'Welcome'}/>}
          </Heading>
          <Show above="md">
            <Heading size={'md'}>
              <FormattedMessage id={"Level"} defaultMessage={"Level {level}"} values={{level: level.challenge_level.sequence + 1}}/>
              &nbsp;&middot;&nbsp;
              {level.challenge_level.title}
            </Heading>
          </Show>
          <Flex gap={2} alignItems={'center'}>
            {[...Array(level.challenge_level.jokers)].map((_, i) => (
              <Icon key={i} as={i < level.remaining_jokers ? FaHeart : FaHeartBroken} color={i < level.remaining_jokers ?  "orange.600" : "orange.300"} boxSize={6} />
            ))}
          </Flex>
        </Page.Header>
        <Page.Body>
        <Show below="md">
            <Heading size={'md'}>
              <FormattedMessage id={"Level"} defaultMessage={"Level {level}"} values={{level: level.challenge_level.sequence + 1}}/>
              &nbsp;&middot;&nbsp;
              {level.challenge_level.title}
            </Heading>
          </Show>

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
                  <Button key={key} onClick={() => giveAnswer(option)} isLoading={loading}>
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
            isLoading={loading}
            onChange={(answer) => answer && giveAnswer(answer.value)}
          />
        )}

        <Heading size={'md'}>
          <FormattedMessage id={"progress"} defaultMessage={"Progress"}/>
        </Heading>
        <Card bgColor={'orange.100'} p={4}>
          <Box>
            {results.map((result, i) => (
              <Icon p={1} key={i} as={iconMapping[result]} color={result === 'open' ? "orange.300" : "orange.600"} boxSize={8} />
            ))}
            </Box>
        </Card>

        </Page.Body>

      </Page>
    </> 

  )
}