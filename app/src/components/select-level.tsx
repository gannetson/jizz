import {
  Box,
  Flex,
  Heading,
  HStack,
  RadioCardItem,
  RadioCardLabel,
  RadioCardRoot,
  RadioGroup,
  Text
} from "@chakra-ui/react";
import {useContext} from "react";
import AppContext from "../core/app-context";
import {FormattedMessage} from "react-intl"


const SelectLevel = () => {
  const {level, setLevel} = useContext(AppContext);

  const levels = [
    {value: 'beginner', title: 'Beginner', description: 'Very easy multiple choice'},
    {value: 'advanced', title: 'Advanced', description: 'Hard multiple choice with similar species'},
    {value: 'expert', title: 'Expert', description: 'Text input with auto complete'}
  ]

  return (
    <Box>
      <Heading size={'md'} mb={4}>
        <FormattedMessage id={'level'} defaultMessage={'Level'}/>

      </Heading>

      <RadioCardRoot defaultValue="advanced">
        <RadioCardLabel>Select framework</RadioCardLabel>
        <HStack align="stretch">
          {levels.map((item) => (
            <RadioCardItem
              label={item.title}
              description={item.description}
              key={item.value}
              value={item.value}
            />
          ))}
        </HStack>
      </RadioCardRoot>
    </Box>
  )
};

export default SelectLevel;