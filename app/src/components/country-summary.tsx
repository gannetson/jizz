import {Box, Heading} from "@chakra-ui/react";
import {useContext} from "react";
import AppContext, {Species} from "../core/app-context";
import {FormattedMessage} from "react-intl";
import { getCountryDisplayName } from "../data/country-names-nl";

const CountrySummary = () => {
  const { country, species, language } = useContext(AppContext);
  const locale = language === 'nl' ? 'nl' : 'en';


  const speciesCount = species?.length || 0
  const orders = species ? species.reduce<Record<string, number>>((acc, item) => {
    acc[item.tax_order] = (acc[item.tax_order] || 0) + 1;
    return acc;
  }, {}) : []
  const families = species ? species.reduce<Record<string, number>>((acc, item) => {
    acc[item.tax_family_en] = (acc[item.tax_family_en] || 0) + 1;
    return acc;
  }, {}) : []
  console.log(families)
  console.log(orders)
  const orderCount = Object.keys(orders).length
  const familyCount = Object.keys(families).length

  return (
    country ? (
      <Box>
        <FormattedMessage
          id={'country summary'}
          defaultMessage={'{country} has {speciesCount} species, in {orderCount} orders and {familyCount} families.'}
          values={{ country: getCountryDisplayName(country, locale), speciesCount, orderCount, familyCount }} />
      </Box>

    ) : (
      <></>
    )
  )
};

export default CountrySummary;