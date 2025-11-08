// Select not used in this component
import {useContext} from "react";
import AppContext from "../core/app-context";
import {Box, Flex, Heading, RadioGroup} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"


export const SelectGameType = () => {
  const {multiplayer, setMultiplayer} = useContext(AppContext);

  const onChange = (value: string) => {
    setMultiplayer && setMultiplayer(value)
  }

  return (
    <Box>
      <Heading size={'md'} mb={4}>Players</Heading>
      <RadioGroup.Root
        value={multiplayer}
        onValueChange={(e: { value?: string }) => e.value && onChange(e.value)}
        colorPalette={'orange'}
      >
        <Flex direction={'column'} gap={4}>
        <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
          <RadioGroup.Item value={'0'}>
            <RadioGroup.ItemHiddenInput />
            <RadioGroup.ItemControl />
            <RadioGroup.ItemText>
              <FormattedMessage id={'single player'} defaultMessage={'Single player'} />
            </RadioGroup.ItemText>
          </RadioGroup.Item>
        </Box>
        <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
          <RadioGroup.Item value={'1'}>
            <RadioGroup.ItemHiddenInput />
            <RadioGroup.ItemControl />
            <RadioGroup.ItemText>
              <FormattedMessage id={'multi player'} defaultMessage={'Multi player'} />
            </RadioGroup.ItemText>
          </RadioGroup.Item>
        </Box>
        </Flex>
      </RadioGroup.Root>
    </Box>
  )
};
