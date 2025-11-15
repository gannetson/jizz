import { useMemo } from "react";
import { Select, Portal, createListCollection } from "@chakra-ui/react";

interface LanguageSelectProps {
  languages: any[];
  value: string;
  onChange: (value: string) => void;
}

export const ProfileLanguageSelect = ({ languages, value, onChange }: LanguageSelectProps) => {
  const collection = useMemo(() => {
    const items = languages.map((l, index) => ({
      label: l.name,
      value: l.name,
      original: l,
      index,
    }));
    return createListCollection({ items });
  }, [languages]);

  const selectedLanguage = languages.find((l) => l.code === value);
  const selectedValue = selectedLanguage ? selectedLanguage.name : undefined;

  const handleValueChange = (details: { value: string[] }) => {
    const selectedName = details.value[0];
    const selectedLang = languages.find((l) => l.name === selectedName);
    if (selectedLang) {
      onChange(selectedLang.code);
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
          <Select.ValueText placeholder="Select language..." />
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

