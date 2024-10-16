import {useContext} from "react";
import AppContext from "../core/app-context";
import {Box, Flex, Heading, Radio, RadioGroup} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"


export const SelectLength = () => {

  const {length, setLength, country} = useContext(AppContext);


  return (
    <Box>
      <Heading size={'md'} mb={4}>
        <FormattedMessage id={'question'} defaultMessage={'Questions'} />
      </Heading>
      {country && (
        <FormattedMessage
          id={'how many'}
          defaultMessage={'How many species do you want review? Choose {count} if you want to all the species in {country}'}
          values={{count: country.count, country: country.name}}
        />

      )}
      <RadioGroup
        value={length}
        colorScheme={'orange'}
        onChange={(val) => val && setLength && setLength(val)}
      >
        <Flex gap={10} mt={4}>
          <Radio value={'10'}>10</Radio>
          <Radio value={'20'}>20</Radio>
          <Radio value={'50'}>50</Radio>
          <Radio value={'100'}>100</Radio>
          {country?.count && <Radio value={'0'}>{country?.count}</Radio>}
        </Flex>
      </RadioGroup>
    </Box>
  )
};
