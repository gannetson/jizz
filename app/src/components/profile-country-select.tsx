import { useMemo } from "react";
import { Select, Portal, createListCollection } from "@chakra-ui/react";

interface CountrySelectProps {
  countries: any[];
  value: string | null;
  onChange: (value: string | null) => void;
}

export const ProfileCountrySelect = ({ countries, value, onChange }: CountrySelectProps) => {
  // Ensure countries is always an array
  const countriesArray = Array.isArray(countries) ? countries : [];
  
  const collection = useMemo(() => {
    const items = countriesArray.map((c, index) => ({
      label: c.name,
      value: c.name,
      original: c,
      index,
    }));
    return createListCollection({ items });
  }, [countriesArray]);

  const selectedCountry = countriesArray.find((c) => c.code === value);
  const selectedValue = selectedCountry ? selectedCountry.name : undefined;

  const handleValueChange = (details: { value: string[] }) => {
    const selectedName = details.value[0];
    const selectedCountry = countriesArray.find((c) => c.name === selectedName);
    if (selectedCountry) {
      onChange(selectedCountry.code);
    } else {
      onChange(null);
    }
  };

  return (
    <Select.Root
      collection={collection}
      value={selectedValue ? [selectedValue] : []}
      onValueChange={handleValueChange}
    >
      <Select.HiddenSelect />
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder="Select country..." />
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
  );
};

