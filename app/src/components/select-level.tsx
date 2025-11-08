import {Box, Flex, Heading, RadioGroup, Text} from "@chakra-ui/react";
import {useContext} from "react";
import AppContext from "../core/app-context";
import {FormattedMessage} from "react-intl"


const SelectLevel = () => {
  const {level, setLevel} = useContext(AppContext);

  return (
    <Box>
      <Heading size={'md'} mb={4}>
        <FormattedMessage id={'level'} defaultMessage={'Level'} />

      </Heading>
      <RadioGroup.Root onValueChange={(e: { value?: string }) => e.value && setLevel(e.value)} value={level} colorPalette={'orange'}>
        <Flex direction={'column'} gap={4}>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroup.Item value='beginner'>
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl cursor="pointer" />
              <RadioGroup.ItemText>
                <Text>
                  <FormattedMessage id={'beginner'} defaultMessage={'Beginner'} />
                </Text>
                <Text fontSize={'xs'}>
                  <FormattedMessage id={'simple multiple choice'} defaultMessage={'Very easy multiple choice'} />
                </Text>
              </RadioGroup.ItemText>
            </RadioGroup.Item>
          </Box>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroup.Item value='advanced'>
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl cursor="pointer" />
              <RadioGroup.ItemText>
                <Text>
                  <FormattedMessage id={'advanced'} defaultMessage={'Advanced'} />
                </Text>
                <Text fontSize={'xs'}>
                  <FormattedMessage id={'hard multiple choice'} defaultMessage={'Multiple choice with similar species'} />
                </Text>
              </RadioGroup.ItemText>
            </RadioGroup.Item>
          </Box>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroup.Item value='expert'>
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl cursor="pointer" />
              <RadioGroup.ItemText>
                <Text>
                  <FormattedMessage id={'expert'} defaultMessage={'Expert'} />
                </Text>
                <Text fontSize={'xs'}>
                  <FormattedMessage id={'text input'} defaultMessage={'Text input (with auto complete)'} />
                </Text>
              </RadioGroup.ItemText>
            </RadioGroup.Item>
          </Box>
        </Flex>
      </RadioGroup.Root>
    </Box>
  )
};

export default SelectLevel;