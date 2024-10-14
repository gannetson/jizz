import {Select} from "chakra-react-select";
import {useContext} from "react";
import AppContext from "../core/app-context";
import {Box, Flex, Heading, Radio, RadioGroup} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"


export const SelectGameType = () => {
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
        <Radio value={'0'}>
          <FormattedMessage id={'single player'} defaultMessage={'Single player'} />
        </Radio>
        <Radio value={'1'}>
            <FormattedMessage id={'multi player'} defaultMessage={'Multi player'} />
        </Radio>
        </Flex>
      </RadioGroup>
    </Box>
  )
};
