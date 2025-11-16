import {useContext, useMemo} from "react";
import AppContext, {Language} from "../core/app-context";
import {Box, Flex, Heading, RadioGroup, Select, Portal, createListCollection} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import {UseLanguages} from "../user/use-languages"


const SelectLanguage = () => {
  const {language, setLanguage} = useContext(AppContext);
  const {languages} = UseLanguages();

  const onChange = (lang: string) => {
    setLanguage && setLanguage(lang)
  }

  // Ensure languages is always an array
  const languagesArray = Array.isArray(languages) ? languages : [];
  const selectedLanguage = languagesArray.find((l) => l.code === language);

  const collection = useMemo(() => {
    const items = languagesArray.map((l, index) => ({
      label: l.name,
      value: l.name,
      original: l,
      index,
    }));
    return createListCollection({ items });
  }, [languagesArray]);

  const selectedValue = selectedLanguage ? selectedLanguage.name : undefined;

  const handleValueChange = (details: { value: string[] }) => {
    const selectedValue = details.value[0];
    const selectedLang = languagesArray.find((l) => l.name === selectedValue);
    if (selectedLang) {
      onChange(selectedLang.code);
    }
  };


  return (
    <Box>
      <Heading size={'md'} mb={4}>
        <FormattedMessage id={'player language'} defaultMessage={'Player language'} />
      </Heading>
      <Box mb={4}>
        <FormattedMessage
          id={'set language description'}
          defaultMessage={'This changes the species names in the game. Other players that join your game can pick another language.'}/>
      </Box>
      <RadioGroup.Root
        colorPalette="primary"
        value={language}
        onValueChange={(e: { value?: string }) => e.value && onChange(e.value as 'en' | 'nl')}
      >
        <Flex direction={'column'} gap={4}>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroup.Item value={'en_UK'}>
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl cursor="pointer">
                <RadioGroup.ItemIndicator />
              </RadioGroup.ItemControl>
              <RadioGroup.ItemText>English (UK)</RadioGroup.ItemText>
            </RadioGroup.Item>
          </Box>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroup.Item value={'en_US'}>
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl cursor="pointer">
                <RadioGroup.ItemIndicator />
              </RadioGroup.ItemControl>
              <RadioGroup.ItemText>English (US)</RadioGroup.ItemText>
            </RadioGroup.Item>
          </Box>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroup.Item value={'nl'}>
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl cursor="pointer">
                <RadioGroup.ItemIndicator />
              </RadioGroup.ItemControl>
              <RadioGroup.ItemText>Nederlands</RadioGroup.ItemText>
            </RadioGroup.Item>
          </Box>
        </Flex>
      </RadioGroup.Root>
      <Box mt={4} mb={2}>
        <FormattedMessage id={'more languages'} defaultMessage={'More languages'} />
      </Box>
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

export default SelectLanguage;