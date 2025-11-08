import {useContext} from "react";
import AppContext from "../core/app-context";
import {Box, Flex, Heading, RadioGroup} from "@chakra-ui/react"
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
      <RadioGroup.Root
        value={mediaType}
        onValueChange={(e: { value?: string }) => e.value && onChange(e.value)}
        colorPalette={'orange'}
      >
        <Flex direction={'column'} gap={4}>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroup.Item value={'images'}>
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl />
              <RadioGroup.ItemText>
                <FormattedMessage id={'pictures'} defaultMessage={'Pictures'}/>
              </RadioGroup.ItemText>
            </RadioGroup.Item>
          </Box>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroup.Item value={'audio'}>
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl />
              <RadioGroup.ItemText>
                <Flex gap={4}>
                  <FormattedMessage id={'sounds'} defaultMessage={'Sounds'}/>
                </Flex>
              </RadioGroup.ItemText>
            </RadioGroup.Item>
          </Box>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroup.Item value={'video'}>
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl />
              <RadioGroup.ItemText>
                <FormattedMessage id={'videos'} defaultMessage={'Videos'}/>
              </RadioGroup.ItemText>
            </RadioGroup.Item>
          </Box>
        </Flex>
      </RadioGroup.Root>
    </Box>
  )
};
