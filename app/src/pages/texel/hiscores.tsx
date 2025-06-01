import {Flex, Heading, Table, TableContainer, Tbody, Td, Th, Thead, Tr} from "@chakra-ui/react";
import Page from "../layout/page";
import {FormattedMessage} from "react-intl";
import {useContext, useEffect, useState} from "react"
import AppContext, {Country, Score} from "../../core/app-context"
import {Loading} from "../../components/loading"
import {ScoreLine} from "../../components/score-line"
import {Select} from "chakra-react-select"
import {UseCountries} from "../../user/use-countries"
import getUnicodeFlagIcon from 'country-flag-icons/unicode'
import {ScoreLineShort} from "../../components/score-line-short"

const TexelHiscorePage = () => {
  const {countries} = UseCountries()
  const {loading, setLoading} = useContext(AppContext)
  const [scores, setScores] = useState<Score[]>([])
  const [level, setLevel] = useState<string | undefined>('advanced');
  const [length, setLength] = useState<string | undefined>('10');
  const [media, setMedia] = useState<string | undefined>('');
  const [country, setCountry] = useState<Country | undefined>({code: '', name: 'All countries'});

  const loadScores = async () => {
    setLoading(true)
    const url = `/api/scores/?game__level=advanced&game__length=35&game__media=images&game__country=NL-NH`
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
  }, []);


  return (
    <Page>
      <Page.Header>
        <Heading textColor={'gray.800'} size={'lg'} m={0} noOfLines={1}>
          <FormattedMessage id='hiscores texel' defaultMessage={'High Scores - DBA Bird Week'}/>
        </Heading>
      </Page.Header>
      <Page.Body>
        <>
          {loading ? (
            <Loading/>
          ) : (

            <TableContainer>
              <Table variant='striped' colorScheme='orange' size={['sm', 'md']}>
                <Thead>
                  <Tr bgColor={'orange.200'}>
                  <Th>#</Th>
                  <Th>Player</Th>
                  <Th>Date</Th>
                  <Th>Score</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {scores && scores.map((score, index) => {
                    return <ScoreLineShort key={index} score={score}/>
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

export default TexelHiscorePage;