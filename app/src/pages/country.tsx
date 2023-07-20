import {useParams} from "react-router-dom";
import {useEffect, useState} from "react";
import {Box, Button, Flex, Heading, Image, SimpleGrid} from "@chakra-ui/react";
import {Select} from "chakra-react-select";
import {PageProperties} from "./layout";
import Confetti from "react-dom-confetti"

interface SpeciesImage {
  url: string;
}

interface Species {
  name: string;
  name_latin: string;
  images: SpeciesImage[]
}

const Country = ({level}: PageProperties) => {
  const {code} = useParams();
  const [country, setCountry] = useState();
  const [species, setSpecies] = useState<Species[]>([]);
  const [mystery, setMystery] = useState<Species | null>();
  const [answer, setAnswer] = useState<Species | null>();
  const [picNum, setPicNum] = useState<number>(0);
  const [options, setOptions] = useState<Species[] | null>([])

  const randomBird = () => {
    return species[Math.floor(Math.random() * species.length)];
  }

  const getSetAroundIndex = (index: number) => {
    let start = index - 2
    if (start < 0) start = 0
    if (start +2 > species.length) start = species.length -6
    return species.slice(start, 6);
  }

  const shuffleSet = (array: Species[]) =>{
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

  const newMistery = () => {
    if (species.length === 0) return;
    setAnswer(null)
    const newBird = randomBird()
    setPicNum(Math.floor(Math.random() * newBird.images.length))
    setMystery(newBird);
    getOptions(newBird)
  }

  const nextPic = () => {
    setPicNum((picNum + 1) % mystery!.images.length)
  }

  const checkAnswer = (answer: string) => {
    setAnswer(species.find((spec) => answer === spec.name))
  }

  useEffect(()=>{
    mystery && getOptions(mystery)
  }, [level])

  useEffect(() => {
    if (species.length > 0 && !mystery) {
      newMistery()
    }
  }, [species])

  useEffect(() => {
    fetch(`/api/countries/${code}?format=json`)
      .then((res) => res.json())
      .then((data) => setCountry(data));
    fetch(`/api/species/?countries__country=${code}&format=json`)
      .then((res) => res.json())
      .then((data) => setSpecies(data));
  }, [code])

  return <Flex direction={'column'} gap={4}>
    <Heading>{country && country['name']}</Heading>
    <Box>{species ? species.length : '?'} bird species</Box>
    <Box>Level {level}</Box>

    {mystery && (
      <Flex justifyContent={'center'} direction={'column'}>
        <Image src={mystery.images[picNum].url}/>
        <Button variant="ghost" onClick={nextPic}>Another picture</Button>
        <Confetti active={mystery === answer} config={{angle: 45}}/>
      </Flex>
    )}

    <Box fontWeight={'bold'}>
      {answer && mystery ? (
        answer === mystery ?
          'Correct!' :
          `Incorrect! ${mystery.name} not ${answer.name}`
      ) : 'Please select an answer'}
    </Box>
    {options && options.length ? (
      <SimpleGrid columns={{base: 1, md:2}} spacing={4}>
        {
          options.map((option, key) => (
            <Button key={key} isDisabled={!!answer}
                    colorScheme={answer && option.name === answer.name ? 'blue' : 'gray'}
                    onClick={() => setAnswer(option)}>{option.name}</Button>
          ))
        }
      </SimpleGrid>

    ) : (
      <Select
        options={species.map((s) => ({label: s.name, value: s}))}
        onChange={(answer) => answer && setAnswer(answer.value)}
      />
    )}
    {answer ?
      <Button onClick={newMistery}>Next</Button> :
      <Button onClick={() => checkAnswer('?')}>No clue</Button>
    }
  </Flex>
};

export default Country;