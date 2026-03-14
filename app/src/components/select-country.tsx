import { Box, Heading } from "@chakra-ui/react";
import { useContext, useEffect } from "react";
import AppContext from "../core/app-context";
import { FormattedMessage } from "react-intl";
import { UseCountries } from "../user/use-countries";
import CountryCombobox from "./country-combobox";

const SelectCountry = () => {
  const { countries: countryList } = UseCountries();
  const { country, setCountry, game } = useContext(AppContext);

  const countriesList = Array.isArray(countryList) ? countryList : [];
  const countries = countriesList.filter((c) => !c.code.includes("NL-NH"));

  useEffect(() => {
    if (!country && game?.country) {
      setCountry?.(game.country);
    }
  }, [game?.country]);

  return (
    <Box>
      <Heading size="md" mb={4} colorPalette="primary">
        <FormattedMessage id="country" defaultMessage="Country" />
      </Heading>
      <CountryCombobox
        countries={countries}
        value={country ?? null}
        onChange={(c) => c && setCountry(c)}
      />
    </Box>
  );
};

export default SelectCountry;
