import {Box, Flex, Heading, Radio, RadioGroup, Text} from "@chakra-ui/react";
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
      <RadioGroup onChange={setLevel} value={level} colorScheme={'orange'}>
        <Flex direction={'column'} gap={4}>
          <Radio value='beginner'>
            <Text>
              <FormattedMessage id={'beginner'} defaultMessage={'Beginner'} />
            </Text>
            <Text fontSize={'xs'}>
              <FormattedMessage id={'simple multiple choice'} defaultMessage={'Very easy multiple choice'} />
            </Text>
          </Radio>
          <Radio value='advanced'>
            <Text>
              <FormattedMessage id={'advanced'} defaultMessage={'Advanced'} />
            </Text>
            <Text fontSize={'xs'}>
              <FormattedMessage id={'hard multiple choice'} defaultMessage={'Multiple choice with similar species'} />
            </Text>
          </Radio>
          <Radio value='expert'>
            <Text>
              <FormattedMessage id={'expert'} defaultMessage={'Expert'} />
            </Text>
            <Text fontSize={'xs'}>
              <FormattedMessage id={'text input'} defaultMessage={'Text input (with auto complete)'} />
            </Text>
          </Radio>
        </Flex>
      </RadioGroup>
    </Box>
  )
};

export default SelectLevel;