import {Box, Button, Flex, Image, Kbd, keyframes, Show, SimpleGrid} from "@chakra-ui/react"
import {Select} from "chakra-react-select"
import {useCallback, useContext, useEffect} from "react"
import ReactPlayer from "react-player"
import WebsocketContext from "../../../core/websocket-context"
import AppContext, {Answer, Species} from "../../../core/app-context"
import {SpeciesName} from "../../../components/species-name"


export const QuestionComponent = () => {
  const {player} = useContext(AppContext)
  const {question, mpg: game, species, submitAnswer} = useContext(WebsocketContext)
  const shortcuts = ['a', 'j', 's', 'k', 'd', 'l']

  const selectAnswer = (species?: Species) => {
    console.log(species)
    if (player && submitAnswer) {
      const answer: Answer = {
        question,
        player,
        answer: species,
      }
      submitAnswer(answer)

    }

  }
  const rotate = keyframes`
      from {
          transform: rotate(0deg)
      }
      to {
          transform: rotate(360deg)
      }
  `

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (game?.level !== 'expert') {
      if (event.key === ' ') {
        selectAnswer(undefined)
      } else {
        const index = shortcuts.indexOf(event.key)
        if (index !== -1 && question?.options) {
          selectAnswer(question.options[index])
        }
      }
    }
  }, [game?.level, question?.options, selectAnswer, shortcuts])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress)
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [handleKeyPress])

  if (!question || !game) return <></>

  return (
    <>
      <Box position={'relative'}>
        {game.media === 'video' && (
          <>
            <ReactPlayer
              width={'100%'}
              height={'50%'}
              url={question.videos[0].url}
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
              url={question.sounds[0].url}
              controls={true}
              playing={true}
            />
          </Box>

        )}
      </Box>
      {question.options && question.options.length ? (
        <SimpleGrid columns={{base: 1, md: 2}} spacing={4}>
          {
            question.options.map((option, key) => {
              return (
                <Button key={key} colorScheme='orange' onClick={() => selectAnswer(option)}>
                  <Flex justifyContent={'space-between'} width={'100%'}>
                    <SpeciesName species={option} />
                    <Show above={'md'}>
                      <Kbd size='lg' backgroundColor={'orange.600'}
                           borderColor={'orange.800'}>{shortcuts[key]}</Kbd>
                    </Show>
                  </Flex>
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