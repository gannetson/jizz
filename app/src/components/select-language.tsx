import {useContext} from "react";
import AppContext from "../core/app-context";
import {Box, Flex, Heading, Radio, RadioGroup} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"


const SelectLanguage = () => {
  const {language, setLanguage} = useContext(AppContext);

  const onChange = (value: 'en' | 'nl') => {
    setLanguage && setLanguage(value)
  }

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
          <Radio value={'en'}>English</Radio>
          <Radio value={'nl'}>Nederlands</Radio>
          <Radio value={'la'}>Latin</Radio>
        </Flex>
      </RadioGroup>
    </Box>
  )
};

export default SelectLanguage;