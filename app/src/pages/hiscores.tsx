import {Flex, Heading, TableRoot, Box, TableBody, TableCell, TableColumnHeader, TableHeader, TableRow} from "@chakra-ui/react";
import Page from "./layout/page";
import {FormattedMessage} from "react-intl";
import {useContext, useEffect, useState} from "react"
import AppContext, {Country, Score} from "../core/app-context"
import {Loading} from "../components/loading"
import {ScoreLine} from "../components/score-line"
import {ChakraSelect} from "../components/chakra-select"
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
        <Heading color={'gray.800'} size={'lg'} m={0}>
          <FormattedMessage id='hiscores' defaultMessage={'High Scores'}/>
        </Heading>
      </Page.Header>
      <Page.Body>
        <Flex flexWrap={'wrap'} width={'full'} gap={4}>
          <ChakraSelect
            options={selectCountries}
            getOptionLabel={(c) => c ? c.name : '?'}
            getOptionValue={(c) => c ? c.name : '?'}
            value={country}
            onChange={(val) => val && setCountry(val)}
          />
          <ChakraSelect
            options={mediums}
            getOptionLabel={(m) => m.label}
            getOptionValue={(m) => m.value}
            value={mediums.find((l) => l.value === media) || null}
            onChange={(val) => val && setMedia(val.value)}
          />
          <ChakraSelect
            options={levels}
            getOptionLabel={(l) => l.label}
            getOptionValue={(l) => l.value}
            value={levels.find((l) => l.value === level) || null}
            onChange={(val) => val && setLevel(val.value)}
          />
          <ChakraSelect
            options={lengths}
            getOptionLabel={(l) => l.label}
            getOptionValue={(l) => l.value}
            value={lengths.find((l) => l.value === length) || null}
            onChange={(val) => val && setLength(val.value)}
          />
        </Flex>
        <>
          {loading ? (
            <Loading/>
          ) : (

            <Box overflowX="auto">
              <TableRoot variant='line' colorPalette='orange' size={['sm', 'md']}>
                <TableHeader>
                  <TableRow bgColor={'orange.200'}>
                    <TableColumnHeader>Player</TableColumnHeader>
                    <TableColumnHeader>
                      🇿🇿
                    </TableColumnHeader>
                    <TableColumnHeader>
                      🔭
                    </TableColumnHeader>
                    <TableColumnHeader>Lvl</TableColumnHeader>
                    <TableColumnHeader>#</TableColumnHeader>
                    <TableColumnHeader>Score</TableColumnHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores && scores.map((score, index) => {
                    return <ScoreLine key={index} score={score}/>
                  })}
                </TableBody>
              </TableRoot>
            </Box>
          )}
        </>
      </Page.Body>
    </Page>

  )
};

export default HomePage;