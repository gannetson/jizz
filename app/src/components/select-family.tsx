import {Box, Heading, Select, Portal, createListCollection} from "@chakra-ui/react";
import {useContext, useEffect, useMemo} from "react";
import AppContext from "../core/app-context";
import {FormattedMessage} from "react-intl"
import {TaxFamily, UseTaxFamily} from "../user/use-tax-family";


const SelectTaxFamily = () => {
  const {taxFamilies} = UseTaxFamily()
  const {taxFamily, setTaxFamily, game} = useContext(AppContext);

  const collection = useMemo(() => {
    // Ensure taxFamilies is always an array
    const families = Array.isArray(taxFamilies) ? taxFamilies : [];
    const items = families.map((t, index) => ({
      label: `${t.tax_family} - ${t.tax_family_en} (${t.count})`,
      value: t.tax_family,
      original: t,
      index,
    }));
    return createListCollection({ items });
  }, [taxFamilies]);

  const selectedValue = taxFamily ? taxFamily.tax_family : undefined;

  const handleValueChange = (details: { value: string[] }) => {
    const selectedValue = details.value[0];
    const families = Array.isArray(taxFamilies) ? taxFamilies : [];
    if (selectedValue) {
      const selectedFamily = families.find((t) => t.tax_family === selectedValue);
      if (selectedFamily && setTaxFamily) {
        setTaxFamily(selectedFamily);
      }
    } else {
      if (setTaxFamily) {
        setTaxFamily(undefined);
      }
    }
  };

  useEffect(() => {
    if (!taxFamily && game?.tax_family) {
      if (game?.tax_family) {
        const families = Array.isArray(taxFamilies) ? taxFamilies : [];
        const foundTaxFamily = families.filter((t => t.tax_family === game.tax_family))[0];
        if (foundTaxFamily && setTaxFamily) {
          setTaxFamily(foundTaxFamily);
        }
      }
    }
  }, [game?.tax_family, taxFamily, taxFamilies, setTaxFamily]);


  return (
    <Box>
      <Heading size={'md'} mb={4}>
        <FormattedMessage id={'tax family'} defaultMessage={'Taxonomic family'} />

      </Heading>
      <Select.Root
        collection={collection}
        value={selectedValue ? [selectedValue] : []}
        onValueChange={handleValueChange}
      >
        <Select.HiddenSelect />
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select family..." />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
            {selectedValue && setTaxFamily && (
              <Select.ClearTrigger onClick={() => setTaxFamily(undefined)} />
            )}
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
    </Box>
  )
};

export default SelectTaxFamily;