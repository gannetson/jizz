import {useContext} from "react";
import AppContext from "../core/app-context";
import {Box, Flex, Heading } from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import {SegmentedControl} from "./ui/segmented-control"


export const SelectLength = () => {

  const {length, setLength, country} = useContext(AppContext);


  return (
    <Box>
      <Heading size={'md'} mb={4}>
        <FormattedMessage id={'question'} defaultMessage={'Questions'}/>
      </Heading>
      {country && (
        <FormattedMessage
          id={'how many questions'}
          defaultMessage={'How many questions do you want to answer?'}
          values={{count: country.count, country: country.name}}
        />

      )}
      <SegmentedControl onChange={(val: string) => val && setLength && setLength(val)} items={['10', '20', '50', '100']} />
    </Box>
  )
};
