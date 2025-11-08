import {Box, Flex, Heading, RadioGroupRoot, RadioGroupItem, RadioGroupItemControl, RadioGroupItemText, RadioGroupItemHiddenInput, Text} from "@chakra-ui/react";
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
      <RadioGroupRoot onValueChange={(e: { value?: string }) => e.value && setLevel(e.value)} value={level} colorPalette={'orange'}>
        <Flex direction={'column'} gap={4}>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroupItem value='beginner'>
              <RadioGroupItemHiddenInput />
              <RadioGroupItemControl cursor="pointer" />
              <RadioGroupItemText>
                <Text>
                  <FormattedMessage id={'beginner'} defaultMessage={'Beginner'} />
                </Text>
                <Text fontSize={'xs'}>
                  <FormattedMessage id={'simple multiple choice'} defaultMessage={'Very easy multiple choice'} />
                </Text>
              </RadioGroupItemText>
            </RadioGroupItem>
          </Box>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroupItem value='advanced'>
              <RadioGroupItemHiddenInput />
              <RadioGroupItemControl cursor="pointer" />
              <RadioGroupItemText>
                <Text>
                  <FormattedMessage id={'advanced'} defaultMessage={'Advanced'} />
                </Text>
                <Text fontSize={'xs'}>
                  <FormattedMessage id={'hard multiple choice'} defaultMessage={'Multiple choice with similar species'} />
                </Text>
              </RadioGroupItemText>
            </RadioGroupItem>
          </Box>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroupItem value='expert'>
              <RadioGroupItemHiddenInput />
              <RadioGroupItemControl cursor="pointer" />
              <RadioGroupItemText>
                <Text>
                  <FormattedMessage id={'expert'} defaultMessage={'Expert'} />
                </Text>
                <Text fontSize={'xs'}>
                  <FormattedMessage id={'text input'} defaultMessage={'Text input (with auto complete)'} />
                </Text>
              </RadioGroupItemText>
            </RadioGroupItem>
          </Box>
        </Flex>
      </RadioGroupRoot>
    </Box>
  )
};

export default SelectLevel;