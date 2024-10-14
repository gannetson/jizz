import {Select} from "chakra-react-select";
import {useContext} from "react";
import AppContext from "../core/app-context";
import {Box, Flex, Heading, Radio, RadioGroup} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"


export const SelectMediaType = () => {
  const {multiplayer, setMultiplayer} = useContext(AppContext);

  const onChange = (value: string) => {
    setMultiplayer && setMultiplayer(value)
  }

  return (
    <Box>
      <Heading size={'md'} mb={4}>Players</Heading>
      <RadioGroup
        value={multiplayer}
        onChange={(val) => val && onChange(val)}
        colorScheme={'orange'}
      >
        <Flex direction={'column'} gap={4}>
        <Radio value={'images'}>
          <FormattedMessage id={'pictures'} defaultMessage={'Pictures'} />
        </Radio>
        <Radio value={'sounds'}>
            <FormattedMessage id={'sounds'} defaultMessage={'Sounds'} />
        </Radio>
        <Radio value={'videos'}>
            <FormattedMessage id={'videos'} defaultMessage={'Videos'} />
        </Radio>
        </Flex>
      </RadioGroup>
    </Box>
  )
};
