import {Box, Button, Image, Link, SimpleGrid, Text, useDisclosure} from "@chakra-ui/react"
import {Select} from "chakra-react-select"
import {useContext} from "react"
import ReactPlayer from "react-player"
import WebsocketContext from "../../../core/websocket-context"
import AppContext, {Answer, Species} from "../../../core/app-context"
import {SpeciesName} from "../../../components/species-name"
import {FormattedMessage} from "react-intl"
import {FlagMedia} from "./flag-media"
import {keyframes} from "@emotion/react"


export const QuestionComponent = () => {
  const {species, player} = useContext(AppContext)
  const {question, submitAnswer} = useContext(WebsocketContext)
  const {game} = useContext(AppContext)
  const {onOpen, onClose, isOpen} = useDisclosure()

  const selectAnswer = (species?: Species) => {
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

  const flag = (
    <Link float={'right'} onClick={flagMedia} fontSize={'sm'} textColor={'red.700'}>
      🚩 <FormattedMessage id={"this seems wrong"} defaultMessage={"This seems wrong"}/>
    </Link>
  )

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
            {flag}
            <Text fontSize={'sm'}>
              {question.videos[question.number].contributor} {' / '}
              <Link href={question.videos[question.number].link} isExternal>
                Macaulay Library at the Cornell Lab
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
                Macaulay Library at the Cornell Lab
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
                  Macaulay Library at the Cornell Lab
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
              return (
                <Button key={key} onClick={() => selectAnswer(option)}>
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