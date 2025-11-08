import {useContext} from "react";
import AppContext from "../core/app-context";
import {Box, CheckboxRoot, CheckboxControl, CheckboxLabel, CheckboxHiddenInput, Flex, Heading} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"


export const SelectSpeciesStatus = () => {
  const {setIncludeEscapes, setIncludeRare, includeEscapes, includeRare} = useContext(AppContext);


  return (
    <Box>
      <Heading size={'md'} mb={4}>
        <FormattedMessage defaultMessage={'Species status'} id={'Species status'}/>
      </Heading>
      <Flex direction={'column'} gap={4}>
        <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
          <CheckboxRoot
            colorPalette={'orange'}
            checked={includeRare}
            onCheckedChange={(e: { checked: boolean }) => setIncludeRare(e.checked === true)}
          >
            <CheckboxHiddenInput />
            <CheckboxControl cursor="pointer" />
            <CheckboxLabel>
              <FormattedMessage defaultMessage={'Include rare species'} id={'include rare species'}/>
            </CheckboxLabel>
          </CheckboxRoot>
        </Box>
        <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
          <CheckboxRoot
            colorPalette={'orange'}
            checked={includeEscapes}
            onCheckedChange={(e: { checked: boolean }) => setIncludeEscapes(e.checked === true)}
          >
            <CheckboxHiddenInput />
            <CheckboxControl cursor="pointer" />
            <CheckboxLabel>
              <FormattedMessage defaultMessage={'Include introduced & escaped species '} id={'include escaped species'}/>
            </CheckboxLabel>
          </CheckboxRoot>
        </Box>
      </Flex>
    </Box>
  )
};
