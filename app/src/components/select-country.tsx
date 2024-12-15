import {Box, Heading} from "@chakra-ui/react";
import {UseCountries} from "../user/use-countries";
import {Select} from "chakra-react-select";
import {useContext, useEffect} from "react";
import AppContext from "../core/app-context";
import {FormattedMessage} from "react-intl"


const SelectCountry = () => {
  const {countries} = UseCountries()
  const {country, setCountry, game} = useContext(AppContext);

  const onChange = (value: string) => {
    const country = countries.find((c) => c.name === value)
    country && setCountry(country)
  }

  useEffect(() => {
    if (!country && game?.country) {
      setCountry && setCountry(game?.country)
    }

  }, [game?.country]);

  return (
    <Box>
      <Heading size={'md'} mb={4}>
        <FormattedMessage id={'country'} defaultMessage={'Country'} />

      </Heading>
      <Select
        options={countries}
        getOptionLabel={(c) => c ? c.name : '?'}
        getOptionValue={(c) => c ? c.name : '?'}
        value={country}
        onChange={(val) => val && onChange(val.name)}
      />
    </Box>
  )
};

export default SelectCountry;