import {useContext} from "react";
import AppContext from "../core/app-context";
import {Box, Flex, Heading} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import {Checkbox} from "./ui/checkbox"


export const SelectSpeciesStatus = () => {
  const {setIncludeEscapes, setIncludeRare, includeEscapes, includeRare} = useContext(AppContext);


  return (
    <Box>
      <Heading size={'md'} mb={4}>Species status</Heading>
      <Flex direction={'column'} gap={4}>
      <Checkbox
        colorScheme={'orange'}
        checked={includeRare}
        onCheckedChange={(val: Boolean) => setIncludeRare(Boolean(val))}
      >
        <FormattedMessage defaultMessage={'Include rare species'} id={'include rare species'}/>
      </Checkbox>
      <Checkbox
        colorScheme={'orange'}
        checked={includeEscapes}
        onCheckedChange={(val: Boolean) => setIncludeEscapes(Boolean(val))}
      >
        <FormattedMessage defaultMessage={'Include introduced & escaped species '} id={'include escaped species'}/>
      </Checkbox>
      </Flex>
    </Box>
  )
};
