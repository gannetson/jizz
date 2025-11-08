import {useContext} from "react";
import AppContext, {Language} from "../core/app-context";
import {Box, Flex, Heading, RadioGroupRoot, RadioGroupItem, RadioGroupItemControl, RadioGroupItemText, RadioGroupItemHiddenInput} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import {ChakraSelect} from "./chakra-select"
import {UseLanguages} from "../user/use-languages"


const SelectLanguage = () => {
  const {language, setLanguage} = useContext(AppContext);
  const {languages} = UseLanguages();

  const onChange = (lang: string) => {
    setLanguage && setLanguage(lang)
  }

  const selectedLanguage = languages.find((l) => l.code === language);


  return (
    <Box>
      <Heading size={'md'} mb={4}>
        <FormattedMessage id={'player language'} defaultMessage={'Player language'} />
      </Heading>
      <Box mb={4}>
        <FormattedMessage
          id={'set language description'}
          defaultMessage={'This changes your language. Other players that join your game can pick another language.'}/>
      </Box>
      <RadioGroupRoot
        value={language}
        onValueChange={(e: { value?: string }) => e.value && onChange(e.value as 'en' | 'nl')}
        colorPalette={'orange'}
      >
        <Flex direction={'column'} gap={4}>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroupItem value={'en'}>
              <RadioGroupItemHiddenInput />
              <RadioGroupItemControl cursor="pointer" />
              <RadioGroupItemText>English (UK)</RadioGroupItemText>
            </RadioGroupItem>
          </Box>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroupItem value={'en_US'}>
              <RadioGroupItemHiddenInput />
              <RadioGroupItemControl cursor="pointer" />
              <RadioGroupItemText>English (US)</RadioGroupItemText>
            </RadioGroupItem>
          </Box>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroupItem value={'nl'}>
              <RadioGroupItemHiddenInput />
              <RadioGroupItemControl cursor="pointer" />
              <RadioGroupItemText>Nederlands</RadioGroupItemText>
            </RadioGroupItem>
          </Box>
        </Flex>
      </RadioGroupRoot>
      <Box mt={4} mb={2}>
        <FormattedMessage id={'more languages'} defaultMessage={'More languages'} />
      </Box>
      <ChakraSelect<Language>
        options={languages}
        getOptionLabel={(c) => c ? c.name : '?'}
        getOptionValue={(c) => c ? c.name : '?'}
        value={selectedLanguage}
        onChange={(val) => val && onChange(val.code)}
      />
    </Box>
  )
};

export default SelectLanguage;