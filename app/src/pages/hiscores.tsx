import {Flex, Heading, Table, Td, Th, Thead, Tr} from "@chakra-ui/react";
import Page from "./layout/page";
import {FormattedMessage} from "react-intl";
import {useContext, useEffect, useState} from "react"
import AppContext, {Country, Score} from "../core/app-context"
import {Loading} from "../components/loading"
import {ScoreLine} from "../components/score-line"
import {Select} from "chakra-react-select"
import {UseCountries} from "../user/use-countries"

const HomePage = () => {
  const {countries} = UseCountries()
  const {loading, setLoading} = useContext(AppContext)
  const [scores, setScores] = useState<Score[]>([])
  const [level, setLevel] = useState<string>('advanced');
  const [length, setLength] = useState<number>(50);
  const [media, setMedia] = useState<string>('images');
  const [country, setCountry] = useState<Country>({code: 'NL', name: 'Netherlands'});

  const loadScores = async () => {
    setLoading(true)
    const url = `/api/scores/?game__level=${level}&game__length=${length}&game__media=${media}&game__country=${country.code}`
    const response = await fetch(url, {
      cache: 'no-cache',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
    if (response.status === 200) {
      const data = await response.json()
      setScores(data.results)
    } else {
      console.log('Could not load scores.')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadScores()
  }, [level, length, media, country]);

  const levels = [
    {value: 'easy', label: 'Easy'},
    {value: 'advanced', label: 'Advanced'},
    {value: 'expert', label: 'Expert'},
  ];

  const lengths = [
    {value: 10, label: '10'},
    {value: 20, label: '20'},
    {value: 50, label: '50'},
    {value: 100, label: '100'},
  ];

  const mediums = [
    {value: 'images', label: 'Images'},
    {value: 'sounds', label: 'Sounds'},
    {value: 'videos', label: 'Videos'},
  ];


  return (
    <Page>
      <Page.Header>
        <Heading textColor={'gray.800'} size={'lg'} m={0} noOfLines={1}>
          <FormattedMessage id='hiscores' defaultMessage={'High Scores'}/>
        </Heading>
      </Page.Header>
      <Page.Body>
        <Flex justifyContent={'space-evenly'}>
          <Select
            options={countries}
            getOptionLabel={(c) => c ? c.name : '?'}
            getOptionValue={(c) => c ? c.name : '?'}
            value={country}
            onChange={(val) => val && setCountry(val)}
          />
          <Select
            options={levels}
            value={levels.find((l) => l.value === level)}
            onChange={(val) => val && setLevel(val.value)}
          />
          <Select
            options={lengths}
            value={{value: length, label: length.toString()}}
            onChange={(val) => val && setLength(val.value)}
          />
          <Select
            options={mediums}
            value={{value: media, label: media === 'images' ? 'Images' : 'Sounds'}}
            onChange={(val) => val && setMedia(val.value)}
          />
        </Flex>
        <>
          {loading ? (
            <Loading/>
          ) : (

            <Table>
              <Thead>
                <Tr bgColor={'orange.100'}>
                  <Th>Player</Th>
                  <Th>Country</Th>
                  <Th>Media</Th>
                  <Th>Level</Th>
                  <Th>#</Th>
                  <Th>Score</Th>
                </Tr>
              </Thead>
              {scores && scores.map((score, index) => {
                return <ScoreLine key={index} score={score}/>
              })}
            </Table>
          )}
        </>
      </Page.Body>
    </Page>

  )
};

export default HomePage;