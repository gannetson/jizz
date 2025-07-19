import {useContext} from "react";
import AppContext, {Language} from "../core/app-context";
import {Box, Flex, Heading, Radio, RadioGroup} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import {Select} from "chakra-react-select"
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
      <RadioGroup
        value={language}
        onChange={(val: 'en' | 'nl') => val && onChange(val)}
        colorScheme={'orange'}
      >
        <Flex direction={'column'} gap={4}>
          <Radio value={'en'}>English (UK)</Radio>
          <Radio value={'en_US'}>English (US)</Radio>
          <Radio value={'nl'}>Nederlands</Radio>
        </Flex>
      </RadioGroup>
      <Box mt={4} mb={2}>
        <FormattedMessage id={'more languages'} defaultMessage={'More languages'} />
      </Box>
      <Select<Language>
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