import {useEffect, useState} from "react";
import {Box, Button, Flex, Heading, IconButton, Image, SimpleGrid, Spacer, Text} from "@chakra-ui/react";
import {Select} from "chakra-react-select";
import {PageProperties} from "./layout";
import Confetti from "react-dom-confetti"
import SelectCountry from "../components/select-country";
import {ViewSpecies} from "../components/view-species";
import {FiRefreshCw} from "react-icons/all";

export interface SpeciesImage {
  url: string;
}

export interface Species {
  name: string;
  name_latin: string;
  images: SpeciesImage[]
}

const CountryPage = ({level, country, setCountry}: PageProperties) => {
  const [species, setSpecies] = useState<Species[]>([]);
  const [mystery, setMystery] = useState<Species | null>();
  const [answer, setAnswer] = useState<Species | null | 'dunno'>();
  const [picNum, setPicNum] = useState<number>(0);
  const [options, setOptions] = useState<Species[] | null>([])

  const randomBird = () => {
    return species[Math.floor(Math.random() * species.length)];
  }

  const shuffleSet = (array: Species[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  const getOptions = (mystery: Species) => {
    setOptions(null)
    if (level === 'beginner') {
      const options: Species[] = [mystery, randomBird(), randomBird(), randomBird()]
      setOptions(shuffleSet(options))
    } else if (level === 'advanced') {
      let index = species.indexOf(mystery)
      index -= 2
      if (index < 0) index = 0
      const options: Species[] = [
        species[index],
        species[index + 1],
        species[index + 2],
        species[index + 3],
        species[index + 4],
        species[index + 5],
      ]
      setOptions(options.sort(() => Math.random() - 0.5))
    }
  }

  const newMystery = () => {
    if (species.length === 0) return;
    setAnswer(null)
    setMystery(null)
    const newBird = randomBird()
    setPicNum(Math.floor(Math.random() * newBird.images.length))
    setMystery(newBird);
    getOptions(newBird)
  }

  const nextPic = () => {
    setPicNum((picNum + 1) % mystery!.images.length)
  }

  useEffect(() => {
    mystery && getOptions(mystery)
  }, [level, mystery])

  useEffect(() => {
    if (species.length > 0 && !mystery) {
      newMystery()
    }
  }, [species])

  useEffect(() => {
    if (!country) return
    fetch(`/api/species/?countries__country=${country.code}&format=json`)
      .then((res) => res.json())
      .then((data) => {
        setSpecies(data)
        newMystery()
      });
  }, [country])

  if (!country) {

    return (
      <Flex direction={'column'} gap={4}>
        <Flex ml={8} mt={2}>
          <Heading>Birds by country</Heading>
        </Flex>
        <SelectCountry country={country} setCountry={setCountry}/>
      </Flex>
    )
  }

  return <Flex direction={'column'} gap={4}>
    <Flex direction={'row'} ml={8} mt={2}>
      <Heading size={'lg'} noOfLines={1}>{country && country['name']}</Heading>
      <Spacer/>
      <Box justifyItems={"right"}>
        <Box>{species ? species.length : '?'} species</Box>
        <Box fontWeight={'bold'} textTransform={'capitalize'}>Level: {level}</Box>
      </Box>
    </Flex>
    {mystery && (
      <Box position={'relative'}>
        <Image
          src={mystery.images[picNum].url.replace('/1800', '/900')}
          fallbackSrc={'https://cdn.pixabay.com/photo/2012/06/08/06/19/clouds-49520_640.jpg'}
        />
        <IconButton
          icon={<FiRefreshCw />}
          onClick={nextPic}
          colorScheme="blue"
          aria-label="Next picture"
          size={'md'}
          isRound={true}
          variant='solid'
          position={'absolute'} top={2} right={2}>
        </IconButton>
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
    {!answer && (options && options.length ? (
        <SimpleGrid columns={{base: 1, md: 2}} spacing={4}>
          {
            options.map((option, key) => (
              <Button key={key} colorScheme={'blue'} onClick={() => setAnswer(option)}>
                {option.name}
              </Button>
            ))
          }
        </SimpleGrid>

      ) : (
        <Select
          options={species.map((s) => ({label: s.name, value: s}))}
          onChange={(answer) => answer && setAnswer(answer.value)}
        />
      )
    )}
  </Flex>
};

export default CountryPage;