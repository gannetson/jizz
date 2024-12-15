import {useContext} from "react";
import AppContext from "../core/app-context";
import {Box, Checkbox, Flex, Heading} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"


export const SelectSpeciesStatus = () => {
  const {setIncludeEscapes, setIncludeRare, includeEscapes, includeRare} = useContext(AppContext);


  return (
    <Box>
      <Heading size={'md'} mb={4}>
        <FormattedMessage defaultMessage={'Species status'} id={'Species status'}/>
      </Heading>
      <Flex direction={'column'} gap={4}>
        <Checkbox
          colorScheme={'orange'}
          isChecked={includeRare}
          onChange={(val) => setIncludeRare(Boolean(val.target.checked))}
        >
          <FormattedMessage defaultMessage={'Include rare species'} id={'include rare species'}/>
        </Checkbox>
        <Checkbox
          colorScheme={'orange'}
          isChecked={includeEscapes}
          onChange={(val) => setIncludeEscapes(Boolean(val.target.checked))}
        >
          <FormattedMessage defaultMessage={'Include introduced & escaped species '} id={'include escaped species'}/>
        </Checkbox>
      </Flex>
    </Box>
  )
};
