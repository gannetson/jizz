// Select not used in this component
import {useContext} from "react";
import AppContext from "../core/app-context";
import {Box, Flex, Heading, RadioGroupRoot, RadioGroupItem, RadioGroupItemControl, RadioGroupItemText, RadioGroupItemHiddenInput} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"


export const SelectGameType = () => {
  const {multiplayer, setMultiplayer} = useContext(AppContext);

  const onChange = (value: string) => {
    setMultiplayer && setMultiplayer(value)
  }

  return (
    <Box>
      <Heading size={'md'} mb={4}>Players</Heading>
      <RadioGroupRoot
        value={multiplayer}
        onValueChange={(e: { value?: string }) => e.value && onChange(e.value)}
        colorPalette={'orange'}
      >
        <Flex direction={'column'} gap={4}>
        <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
          {/* @ts-expect-error - RadioGroupItem accepts children in runtime */}
          <RadioGroupItem value={'0'}>
            <RadioGroupItemHiddenInput />
            <RadioGroupItemControl />
            {/* @ts-expect-error - RadioGroupItemText accepts children in runtime */}
            <RadioGroupItemText>
              <FormattedMessage id={'single player'} defaultMessage={'Single player'} />
            </RadioGroupItemText>
          </RadioGroupItem>
        </Box>
        <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
          {/* @ts-expect-error - RadioGroupItem accepts children in runtime */}
          <RadioGroupItem value={'1'}>
            <RadioGroupItemHiddenInput />
            <RadioGroupItemControl />
            {/* @ts-expect-error - RadioGroupItemText accepts children in runtime */}
            <RadioGroupItemText>
              <FormattedMessage id={'multi player'} defaultMessage={'Multi player'} />
            </RadioGroupItemText>
          </RadioGroupItem>
        </Box>
        </Flex>
      </RadioGroupRoot>
    </Box>
  )
};
