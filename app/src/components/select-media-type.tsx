import {useContext} from "react";
import AppContext from "../core/app-context";
import {Box, Heading} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import {SegmentedControl} from "./ui/segmented-control"


export const SelectMediaType = () => {
  const {mediaType, setMediaType, taxOrder,setTaxOrder} = useContext(AppContext);

  const onChange = (value: string) => {
    setMediaType && setMediaType(value)
  }

  const mediaTypes = [
    {value: 'images', label: 'Pictures'},
    {value: 'audio', label: 'Sounds'},
    {value: 'video', label: 'Videos'},
  ]

  return (
    <Box>
      <Heading size={'md'} mb={4}>
        <FormattedMessage id={'media type'} defaultMessage={'Media type'}/>
      </Heading>
      <SegmentedControl items={mediaTypes} onChange={(val: string) => val && onChange(val)} />
    </Box>
  )
};
