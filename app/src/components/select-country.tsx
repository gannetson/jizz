import {Box, Heading, Select, Portal, createListCollection, Theme} from "@chakra-ui/react";
import { UseCountries } from "../user/use-countries";
import { useContext, useEffect, useMemo } from "react";
import AppContext from "../core/app-context";
import { FormattedMessage, useIntl } from "react-intl";

const SelectCountry = () => {
  const intl = useIntl();
  const { countries: countryList } = UseCountries();
  const { country, setCountry, game } = useContext(AppContext);

  // Ensure countryList is always an array
  const countriesList = Array.isArray(countryList) ? countryList : [];
  const countries = countriesList.filter((c) => (!c.code.includes('NL-NH')))

  const collection = useMemo(() => {
    const items = countries.map((c, index) => ({
      label: c.name,
      value: c.name,
      original: c,
      index,
    }));
    return createListCollection({ items });
  }, [countries]);

  const selectedValue = country ? country.name : undefined;

  const handleValueChange = (details: { value: string[] }) => {
    const selectedValue = details.value[0];
    const selectedCountry = countries.find((c) => c.name === selectedValue);
    if (selectedCountry) {
      setCountry(selectedCountry);
    }
  };

  useEffect(() => {
    if (!country && game?.country) {
      setCountry && setCountry(game?.country)
    }

  }, [game?.country]);

  return (
    <Box>
      <Heading size="md" mb={4} colorPalette="primary">
        <FormattedMessage id="country" defaultMessage="Country" />
      </Heading>

      <Select.Root
        collection={collection}
        value={selectedValue ? [selectedValue] : []}
        onValueChange={handleValueChange}
      >
        <Select.HiddenSelect />
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder={intl.formatMessage({ id: 'select country placeholder', defaultMessage: 'Select country...' })} />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Portal>
          <Select.Positioner>
            <Select.Content>
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
    </Box>
  );
};

export default SelectCountry;
