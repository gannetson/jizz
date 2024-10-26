import {useContext} from "react";
import AppContext from "../core/app-context";
import {Box, Heading} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import {SegmentedControl} from "./ui/segmented-control"

const SelectLanguage = () => {
  const {language, setLanguage} = useContext(AppContext);

  const onChange = (value: 'en' | 'nl' | 'la') => {
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
      <SegmentedControl
        items={[
          {value: 'en', label: 'English'},
          {value: 'nl', label: 'Nederlands'},
          {value: 'la', label: 'Latin'}
        ]}
        value={language}
        onChange={(val: 'en' | 'nl' | 'la') => val && onChange(val)}
        />
    </Box>
  )
};

export default SelectLanguage;