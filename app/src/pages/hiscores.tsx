import {Flex, Heading, Table, TableContainer, Tbody, Td, Th, Thead, Tr} from "@chakra-ui/react";
import Page from "./layout/page";
import {FormattedMessage} from "react-intl";
import {useContext, useEffect, useState} from "react"
import AppContext, {Country, Score} from "../core/app-context"
import {Loading} from "../components/loading"
import {ScoreLine} from "../components/score-line"
import {Select} from "chakra-react-select"
import {UseCountries} from "../user/use-countries"
import getUnicodeFlagIcon from 'country-flag-icons/unicode'

const HomePage = () => {
  const {countries} = UseCountries()
  const {loading, setLoading} = useContext(AppContext)
  const [scores, setScores] = useState<Score[]>([])
  const [level, setLevel] = useState<string | undefined>('advanced');
  const [length, setLength] = useState<string | undefined>('10');
  const [media, setMedia] = useState<string | undefined>('');
  const [country, setCountry] = useState<Country | undefined>({code: '', name: 'All countries'});

  const loadScores = async () => {
    setLoading(true)
    const url = `/api/scores/?game__level=${level}&game__length=${length}&game__media=${media}&game__country=${country?.code}`
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
    {value: '', label: 'Any levels'},
    {value: 'beginner', label: 'Beginner'},
    {value: 'advanced', label: 'Advanced'},
    {value: 'expert', label: 'Expert'},
  ];

  const lengths = [
    {value: '', label: 'Any length'},
    {value: '10', label: '10'},
    {value: '20', label: '20'},
    {value: '50', label: '50'},
    {value: '100', label: '100'},
  ];

  const mediums = [
    {value: '', label: 'Any media'},
    {value: 'images', label: 'Images'},
    {value: 'audio', label: 'Sounds'},
    {value: 'video', label: 'Videos'},
  ];

  const selectCountries = [{code: '', name: 'All countries'}].concat(countries)


  return (
    <Page>
      <Page.Header>
        <Heading textColor={'gray.800'} size={'lg'} m={0} noOfLines={1}>
          <FormattedMessage id='hiscores' defaultMessage={'High Scores'}/>
        </Heading>
      </Page.Header>
      <Page.Body>
        <Flex flexWrap={'wrap'} width={'full'} gap={4}>
          <Select
            size={'md'}
            variant={'flushed'}
            options={selectCountries}
            getOptionLabel={(c) => c ? c.name : '?'}
            getOptionValue={(c) => c ? c.name : '?'}
            value={country}
            onChange={(val) => val && setCountry(val)}
            chakraStyles={{
              menu: (provided) => ({
                ...provided,
                width: "300px",
              }),
            }}
          />
          <Select
            size={'md'}
            variant={'flushed'}
            options={mediums}
            value={mediums.find((l) => l.value === media)}
            onChange={(val) => val && setMedia(val.value)}
            chakraStyles={{
              menu: (provided) => ({
                ...provided,
                width: "300px",
              }),
            }}
          />
          <Select
            size={'md'}
            variant={'flushed'}
            options={levels}
            value={levels.find((l) => l.value === level)}
            onChange={(val) => val && setLevel(val.value)}
            chakraStyles={{
              menu: (provided) => ({
                ...provided,
                width: "300px",
              }),
            }}
          />
          <Select
            size={'md'}
            variant={'flushed'}
            options={lengths}
            value={lengths.find((l) => l.value === length)}
            onChange={(val) => val && setLength(val.value)}
            chakraStyles={{
              menu: (provided) => ({
                ...provided,
                width: "300px",
              }),
            }}
          />
        </Flex>
        <>
          {loading ? (
            <Loading/>
          ) : (

            <TableContainer>
              <Table variant='striped' colorScheme='orange' size={['sm', 'md']}>
                <Thead>
                  <Tr bgColor={'orange.200'}>
                    <Th>Player</Th>
                    <Th>
                      🇿🇿
                    </Th>
                    <Th>
                      🔭
                    </Th>
                    <Th>Lvl</Th>
                    <Th>#</Th>
                    <Th>Score</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {scores && scores.map((score, index) => {
                    return <ScoreLine key={index} score={score}/>
                  })}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </>
      </Page.Body>
    </Page>

  )
};

export default HomePage;