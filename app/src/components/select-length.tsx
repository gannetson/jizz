import {useContext} from "react";
import AppContext from "../core/app-context";
import {Box, Flex, Heading, RadioGroupRoot, RadioGroupItem, RadioGroupItemControl, RadioGroupItemText, RadioGroupItemHiddenInput, Text} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"

export const SelectLength = () => {
  const {length, setLength, country} = useContext(AppContext);

  const onChange = (value: string) => {
    setLength && setLength(value)
  }

  return (
    <Box>
      <Heading size={'md'} mb={4}>
        <FormattedMessage id={'question'} defaultMessage={'Questions'}/>
      </Heading>
      {country && (
        <Text mb={4}>
          <FormattedMessage
            id={'how many questions'}
            defaultMessage={'How many questions do you want to answer?'}
            values={{count: country.count, country: country.name}}
          />
        </Text>
      )}
      <RadioGroupRoot
        value={length || '10'}
        onValueChange={(e: { value?: string }) => e.value && onChange(e.value)}
        colorPalette={'orange'}
      >
        <Flex direction={'row'} gap={4}>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroupItem value={'10'}>
              <RadioGroupItemHiddenInput />
              <RadioGroupItemControl cursor="pointer" />
              <RadioGroupItemText>10</RadioGroupItemText>
            </RadioGroupItem>
          </Box>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroupItem value={'20'}>
              <RadioGroupItemHiddenInput />
              <RadioGroupItemControl cursor="pointer" />
              <RadioGroupItemText>20</RadioGroupItemText>
            </RadioGroupItem>
          </Box>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroupItem value={'50'}>
              <RadioGroupItemHiddenInput />
              <RadioGroupItemControl cursor="pointer" />
              <RadioGroupItemText>50</RadioGroupItemText>
            </RadioGroupItem>
          </Box>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroupItem value={'100'}>
              <RadioGroupItemHiddenInput />
              <RadioGroupItemControl cursor="pointer" />
              <RadioGroupItemText>100</RadioGroupItemText>
            </RadioGroupItem>
          </Box>
        </Flex>
      </RadioGroupRoot>
    </Box>
  )
};
