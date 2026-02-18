import { useMemo } from "react";
import { Select, Portal, createListCollection } from "@chakra-ui/react";
import { useIntl } from "react-intl";

interface LanguageSelectProps {
  languages: any[];
  value: string;
  onChange: (value: string) => void;
}

export const ProfileLanguageSelect = ({ languages, value, onChange }: LanguageSelectProps) => {
  const intl = useIntl();
  // Ensure languages is always an array
  const languagesArray = Array.isArray(languages) ? languages : [];
  
  const collection = useMemo(() => {
    const items = languagesArray.map((l, index) => ({
      label: l.name,
      value: l.name,
      original: l,
      index,
    }));
    return createListCollection({ items });
  }, [languagesArray]);

  const selectedLanguage = languagesArray.find((l) => l.code === value);
  const selectedValue = selectedLanguage ? selectedLanguage.name : undefined;

  const handleValueChange = (details: { value: string[] }) => {
    const selectedName = details.value[0];
    const selectedLang = languagesArray.find((l) => l.name === selectedName);
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
          <Select.ValueText placeholder={intl.formatMessage({ id: 'select language placeholder', defaultMessage: 'Select language...' })} />
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

