import {useContext} from "react";
import AppContext from "../core/app-context";
import {Box, Flex, Heading, RadioGroupRoot, RadioGroupItem, RadioGroupItemControl, RadioGroupItemText, RadioGroupItemHiddenInput} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"


export const SelectMediaType = () => {
  const {mediaType, setMediaType} = useContext(AppContext);

  const onChange = (value: string) => {
    setMediaType && setMediaType(value)
  }

  return (
    <Box>
      <Heading size={'md'} mb={4}>
        <FormattedMessage id={'media type'} defaultMessage={'Media type'}/>
      </Heading>
      <RadioGroupRoot
        value={mediaType}
        onValueChange={(e: { value?: string }) => e.value && onChange(e.value)}
        colorPalette={'orange'}
      >
        <Flex direction={'column'} gap={4}>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            {/* @ts-expect-error - RadioGroupItem accepts children in runtime */}
            <RadioGroupItem value={'images'}>
              <RadioGroupItemHiddenInput />
              <RadioGroupItemControl />
              {/* @ts-expect-error - RadioGroupItemText accepts children in runtime */}
              <RadioGroupItemText>
                <FormattedMessage id={'pictures'} defaultMessage={'Pictures'}/>
              </RadioGroupItemText>
            </RadioGroupItem>
          </Box>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            {/* @ts-expect-error - RadioGroupItem accepts children in runtime */}
            <RadioGroupItem value={'audio'}>
              <RadioGroupItemHiddenInput />
              <RadioGroupItemControl />
              {/* @ts-expect-error - RadioGroupItemText accepts children in runtime */}
              <RadioGroupItemText>
                <Flex gap={4}>
                  <FormattedMessage id={'sounds'} defaultMessage={'Sounds'}/>
                </Flex>
              </RadioGroupItemText>
            </RadioGroupItem>
          </Box>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            {/* @ts-expect-error - RadioGroupItem accepts children in runtime */}
            <RadioGroupItem value={'video'}>
              <RadioGroupItemHiddenInput />
              <RadioGroupItemControl />
              {/* @ts-expect-error - RadioGroupItemText accepts children in runtime */}
              <RadioGroupItemText>
                <FormattedMessage id={'videos'} defaultMessage={'Videos'}/>
              </RadioGroupItemText>
            </RadioGroupItem>
          </Box>
        </Flex>
      </RadioGroupRoot>
    </Box>
  )
};
