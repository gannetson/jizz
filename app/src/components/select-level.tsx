import {Flex, Heading, Radio, RadioGroup, Text} from "@chakra-ui/react";
import {useContext} from "react";
import AppContext from "../core/app-context";


const SelectLevel = () => {
  const {level, setLevel} = useContext(AppContext);

  return (
    <>
      <Heading py={6} size={'md'}>Level</Heading>
      <RadioGroup onChange={setLevel} value={level}>
        <Flex direction={'column'} gap={4}>
          <Radio value='beginner'>
            <Text>Beginner</Text>
            <Text fontSize={'xs'}>Easy multiple choice</Text>
          </Radio>
          <Radio value='advanced'>
            <Text>Advanced</Text>
            <Text fontSize={'xs'}>Hard multiple choice</Text>
          </Radio>
          <Radio value='expert'>
            <Text>Expert</Text>
            <Text fontSize={'xs'}>Text input</Text>
          </Radio>
        </Flex>
      </RadioGroup>
    </>
  )
};

export default SelectLevel;