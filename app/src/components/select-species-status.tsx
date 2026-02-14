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
        <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
          <Checkbox.Root
            colorPalette="primary"
            checked={includeRare}
            onCheckedChange={(e: { checked: boolean }) => setIncludeRare(e.checked === true)}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control cursor="pointer">
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Label>
              <FormattedMessage defaultMessage={'Include rare species'} id={'include rare species'}/>
            </Checkbox.Label>
          </Checkbox.Root>
        </Box>
        <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
          <Checkbox.Root
            colorPalette="primary"
            checked={includeEscapes}
            onCheckedChange={(e: { checked: boolean }) => setIncludeEscapes(e.checked === true)}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control cursor="pointer">
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Label>
              <FormattedMessage defaultMessage={'Include introduced & escaped species '} id={'include escaped species'}/>
            </Checkbox.Label>
          </Checkbox.Root>
        </Box>
      </Flex>
    </Box>
  )
};
