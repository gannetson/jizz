import {useContext} from "react";
import AppContext from "../core/app-context";
import {Box, Flex, Heading, RadioGroup, Text} from "@chakra-ui/react"
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
      <RadioGroup.Root
        colorPalette="primary"
        value={length || '10'}
        onValueChange={(e: { value?: string }) => e.value && onChange(e.value)}
      >
        <Flex direction={'row'} gap={4}>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroup.Item value={'10'}>
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl>
                <RadioGroup.ItemIndicator />
              </RadioGroup.ItemControl>
              <RadioGroup.ItemText>10</RadioGroup.ItemText>
            </RadioGroup.Item>
          </Box>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroup.Item value={'20'}>
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl>
                <RadioGroup.ItemIndicator />
              </RadioGroup.ItemControl>
              <RadioGroup.ItemText>20</RadioGroup.ItemText>
            </RadioGroup.Item>
          </Box>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroup.Item value={'50'}>
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl>
                <RadioGroup.ItemIndicator />
              </RadioGroup.ItemControl>
              <RadioGroup.ItemText>50</RadioGroup.ItemText>
            </RadioGroup.Item>
          </Box>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroup.Item value={'100'}>
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl>
                <RadioGroup.ItemIndicator />
              </RadioGroup.ItemControl>
              <RadioGroup.ItemText>100</RadioGroup.ItemText>
            </RadioGroup.Item>
          </Box>
        </Flex>
      </RadioGroup.Root>
    </Box>
  )
};
