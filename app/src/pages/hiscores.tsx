import {Flex, Heading, TableRoot, Box, TableBody, TableCell, TableColumnHeader, TableHeader, TableRow, Select, Portal, createListCollection, useBreakpoint} from "@chakra-ui/react";
import { Page } from "../shared/components/layout";
import {FormattedMessage} from "react-intl";
import {useContext, useEffect, useState, useMemo} from "react"
import AppContext, {Country, Score} from "../core/app-context"
import {Loading} from "../components/loading"
import {ScoreLine} from "../components/score-line"
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

  const breakpoint = useBreakpoint({ breakpoints: ['base', 'sm', 'md', 'lg', 'xl', '2xl'] })
  const isMobile = breakpoint === 'base' || breakpoint === 'sm' 

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

  const countryCollection = useMemo(() => {
    const items = selectCountries.map((c, index) => ({
      label: c.name,
      value: c.name,
      original: c,
      index,
    }));
    return createListCollection({ items });
  }, [selectCountries]);

  const mediaCollection = useMemo(() => {
    const items = mediums.map((m, index) => ({
      label: m.label,
      value: m.value,
      original: m,
      index,
    }));
    return createListCollection({ items });
  }, [mediums]);

  const levelCollection = useMemo(() => {
    const items = levels.map((l, index) => ({
      label: l.label,
      value: l.value,
      original: l,
      index,
    }));
    return createListCollection({ items });
  }, [levels]);

  const lengthCollection = useMemo(() => {
    const items = lengths.map((l, index) => ({
      label: l.label,
      value: l.value,
      original: l,
      index,
    }));
    return createListCollection({ items });
  }, [lengths]);

  const countryValue = country ? country.name : undefined;
  const mediaValue = media || '';
  const levelValue = level || '';
  const lengthValue = length || '';

  const handleCountryChange = (details: { value: string[] }) => {
    const selectedValue = details.value[0];
    const selectedCountry = selectCountries.find((c) => c.name === selectedValue);
    if (selectedCountry) {
      setCountry(selectedCountry);
    }
  };

  const handleMediaChange = (details: { value: string[] }) => {
    const selectedValue = details.value[0] || '';
    setMedia(selectedValue);
  };

  const handleLevelChange = (details: { value: string[] }) => {
    const selectedValue = details.value[0] || '';
    setLevel(selectedValue);
  };

  const handleLengthChange = (details: { value: string[] }) => {
    const selectedValue = details.value[0] || '';
    setLength(selectedValue);
  };

  const renderSelect = (collection: any, value: string | undefined, onValueChange: (details: { value: string[] }) => void, placeholder: string) => (
    <Select.Root
      collection={collection}
      value={value ? [value] : []}
      onValueChange={onValueChange}
    >
      <Select.HiddenSelect />
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder={placeholder} />
        </Select.Trigger>
        <Select.IndicatorGroup>
          <Select.Indicator />
        </Select.IndicatorGroup>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content bg="white" borderRadius="md" borderWidth="2px" borderColor="primary.300" boxShadow="xl" p={1}>
            {collection.items.map((item: any) => (
              <Select.Item key={item.value} item={item}>
                <Select.ItemIndicator />
                <Select.ItemText>{item.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  );

  return (
    <Page>
      <Page.Header>
        <Heading color={'gray.800'} size={'lg'} m={0}>
          <FormattedMessage id='hiscores' defaultMessage={'High Scores'}/>
        </Heading>
      </Page.Header>
      <Page.Body>
        <Flex width={'full'} gap={4} flexDirection={isMobile ? 'column' : 'row'}>
          {renderSelect(countryCollection, countryValue, handleCountryChange, 'Select country...')}
          {renderSelect(mediaCollection, mediaValue, handleMediaChange, 'Select media...')}
          {renderSelect(levelCollection, levelValue, handleLevelChange, 'Select level...')}
          {renderSelect(lengthCollection, lengthValue, handleLengthChange, 'Select length...')}
        </Flex>
        <>
          {loading ? (
            <Loading/>
          ) : (

            <Box overflowX="auto">
              <TableRoot variant='line' colorPalette='primary' size={['sm', 'md']}>
                <TableHeader>
                  <TableRow bgColor={'primary.200'}>
                  <TableColumnHeader>#</TableColumnHeader>
                  <TableColumnHeader>Player</TableColumnHeader>
                    <TableColumnHeader>
                      flag
                    </TableColumnHeader>
                    <TableColumnHeader>
                      🔭
                    </TableColumnHeader>
                    <TableColumnHeader>Lvl</TableColumnHeader>
                    <TableColumnHeader>n</TableColumnHeader>
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