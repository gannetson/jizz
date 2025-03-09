import {Box, Button, Flex, Image, Link, SimpleGrid, useDisclosure} from "@chakra-ui/react"
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

export const ChallengeQuestion = () => {
  const {species, player, countryChallenge, challengeQuestion: question, getNewChallengeQuestion, selectChallengeAnswer: selectAnswer} = useContext(AppContext)
  const {onOpen, onClose, isOpen} = useDisclosure()

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

  useEffect(() => {
    if (!question) {
    getNewChallengeQuestion()
    }
  }, [question])
  
  const game = countryChallenge?.levels[0].game
  console.log('question', question)
  console.log('countryChallenge', countryChallenge)
  console.log('game', game)


  if (!question || !game) {
    return <Loading/>
  }


  return (
    <>
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
    </>

  )
}