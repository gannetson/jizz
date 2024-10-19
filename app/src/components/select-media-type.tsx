import {useContext} from "react";
import AppContext from "../core/app-context";
import {Box, Checkbox, Flex, Heading, Radio, RadioGroup} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"


export const SelectMediaType = () => {
  const {mediaType, setMediaType, taxOrder,setTaxOrder} = useContext(AppContext);

  const onChange = (value: string) => {
    setMediaType && setMediaType(value)
  }

  const toggleTaxOrder = () => {
    setTaxOrder(taxOrder === 'Passeriformes' ? '' : 'Passeriformes')
  }

  return (
    <Box>
      <Heading size={'md'} mb={4}>
        <FormattedMessage id={'media type'} defaultMessage={'Media type'}/>
      </Heading>
      <RadioGroup
        value={mediaType}
        onChange={(val) => val && onChange(val)}
        colorScheme={'orange'}
      >
        <Flex direction={'column'} gap={4}>
          <Radio value={'images'}>
            <FormattedMessage id={'pictures'} defaultMessage={'Pictures'}/>
          </Radio>
          <Radio value={'audio'}>
            <Flex gap={4}>
              <FormattedMessage id={'sounds'} defaultMessage={'Sounds'}/>
              {/*{mediaType === 'audio' && (*/}
              {/*  <Checkbox colorScheme={'orange'} isChecked={taxOrder === 'Passeriformes'} onChange={toggleTaxOrder}>*/}
              {/*    <FormattedMessage id={'only passeriformes'} defaultMessage={'Only song birds / Passeriformes'}/>*/}
              {/*  </Checkbox>*/}
              {/*)}*/}
            </Flex>
          </Radio>
          <Radio value={'video'}>
            <FormattedMessage id={'videos'} defaultMessage={'Videos'}/>
          </Radio>
        </Flex>
      </RadioGroup>
    </Box>
  )
};
