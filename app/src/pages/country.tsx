import {useContext, useEffect, useState} from "react";
import {Box, Button, Flex, Heading, IconButton, Image, SimpleGrid, Text, Tooltip} from "@chakra-ui/react";
import {Select} from "chakra-react-select";
import Confetti from "react-dom-confetti"
import SelectCountry from "../components/select-country";
import {ViewSpecies} from "../components/view-species";
import {BsFillQuestionCircleFill, FiRefreshCw} from "react-icons/all";
import Page from "./layout/page";
import SelectLevel from "../components/select-level";
import AppContext from "../core/app-context";

export interface SpeciesImage {
  url: string;
}

export interface Species {
  name: string;
  name_latin: string;
  images: SpeciesImage[]
}

const CountryPage = () => {
  const [mystery, setMystery] = useState<Species | null>();
  const [answer, setAnswer] = useState<Species | null | 'dunno'>();
  const [picNum, setPicNum] = useState<number>(0);
  const [options, setOptions] = useState<Species[] | null>([])
  const {level, species, setCorrect, country, getNextQuestion} = useContext(AppContext);

  const nextPic = () => {
    setPicNum((picNum + 1) % mystery!.images.length)
  }

  const checkAnswer = (spec: Species) => {
    setAnswer(spec)
    if (spec === mystery) {
      setCorrect && setCorrect(spec)
    }
  }

  const newMystery = () => {
    if (species && species.length && getNextQuestion) {
      setAnswer(null)
      const question = getNextQuestion()
      if (question) {
        setMystery(question.species)
        setOptions(question.options || null)
      } else {
        alert('All done!!')
      }
    }
  }

  useEffect(() => {
    newMystery()
  }, [country, species])

  if (!country) {
    return (
      <Page>
        <Page.Header>
          <Heading size={'lg'} m={0} noOfLines={1}>Species by country</Heading>
        </Page.Header>
        <Page.Body>
          <SelectLevel/>
          <SelectCountry/>
        </Page.Body>
      </Page>
    )
  }
  const correctCount = species ? species.filter((sp) => sp.correct).length : '?'
  const totalCount = species ? species.length : '?'

  return (
    <Page>
      <Page.Header>
        <Heading size={'lg'} noOfLines={1}>{country && country.name}</Heading>
        <Box>
          <Box textAlign={'right'}>
            <Tooltip
              hasArrow
              label={`You have identified ${correctCount} birds correctly out of ${totalCount}. These won't be shown again.`}>
              <Flex direction={'row'} alignItems={'center'}>
                Species {correctCount} / {totalCount} <Box ml={1}><BsFillQuestionCircleFill fill={'#999'}
                                                                                            size={16}/></Box>
              </Flex>
            </Tooltip>
          </Box>
          <Box textAlign={'right'} fontWeight={'bold'} textTransform={'capitalize'}>Level: {level}</Box>
        </Box>
      </Page.Header>
      <Page.Body>
        {mystery && (
          <Box position={'relative'}>
            <Image
              src={mystery.images[picNum].url.replace('/1800', '/900')}
              fallbackSrc={'https://cdn.pixabay.com/photo/2012/06/08/06/19/clouds-49520_640.jpg'}
            />
            <Tooltip hasArrow label={'Click this to show another picture of the same species'}>
              <IconButton
                icon={<FiRefreshCw/>}
                onClick={nextPic}
                colorScheme="blue"
                aria-label="Next picture"
                size={'md'}
                isRound={true}
                variant='solid'
                position={'absolute'} top={2} right={2}>
              </IconButton>
            </Tooltip>
            <Confetti active={mystery === answer} config={{angle: 45}}/>
          </Box>
        )}

        <Box fontWeight={'bold'}>
          {answer && mystery && (
            answer === 'dunno' ? (
              <Text>
                It was <ViewSpecies species={mystery}/>
              </Text>
            ) : (
              answer === mystery ?
                'Correct!' : (
                  <>
                    <Text>
                      Incorrect! It was <ViewSpecies species={mystery}/>
                    </Text>
                    <Text>
                      Your answer: <ViewSpecies species={answer}/>
                    </Text>
                  </>
                )
            )
          )}
        </Box>
        {answer ?
          <Button onClick={newMystery} colorScheme={'blue'}>Next</Button> :
          <Button onClick={() => setAnswer('dunno')} colorScheme={'gray'}>No clue</Button>
        }
        {species && !answer && (options && options.length ? (
            <SimpleGrid columns={{base: 1, md: 2}} spacing={4}>
              {
                options.map((option, key) => (
                  <Button key={key} colorScheme={'blue'} onClick={() => checkAnswer(option)}>
                    {option.name}
                  </Button>
                ))
              }
            </SimpleGrid>

          ) : (
            <Select
              options={species.map((s) => ({label: s.name, value: s}))}
              onChange={(answer) => answer && checkAnswer(answer.value)}
            />
          )
        )}
      </Page.Body>
    </Page>
  )
}

export default CountryPage;