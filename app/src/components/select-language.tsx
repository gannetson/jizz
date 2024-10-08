import {Select} from "chakra-react-select";
import {useContext} from "react";
import AppContext from "../core/app-context";
import {Box, Flex, Heading, Radio, RadioGroup} from "@chakra-ui/react"


const SelectLanguage = () => {
  const {language, setLanguage} = useContext(AppContext);

  const onChange = (value: string) => {
    setLanguage && setLanguage(value)
  }

  return (
    <Box>
      <Heading size={'md'} mb={4}>Language</Heading>
      <RadioGroup
        value={language}
        onChange={(val) => val && onChange(val)}
        colorScheme={'orange'}
      >
        <Flex direction={'column'} gap={4}>
        <Radio value={'en'}>English</Radio>
        <Radio value={'nl'}>Nederlands</Radio>
        </Flex>
      </RadioGroup>
    </Box>
  )
};

export default SelectLanguage;