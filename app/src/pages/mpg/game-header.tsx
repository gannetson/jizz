import React, {useContext} from 'react';
import {Box, Flex, Heading} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import { Page } from "../../shared/components/layout"
import AppContext from "../../core/app-context"


const GameHeader: React.FC = () => {
  const {player, country} = useContext(AppContext)


  return (
    <Page.Header>
      <Flex justifyContent={'space-between'} width={'full'} alignItems={'center'}>
        <Heading size={'lg'}>
          {country?.name ? country.name : <FormattedMessage id='welcome' defaultMessage={'Welcome'}/>}
        </Heading>
        <Box>
          {player?.name}
        </Box>
      </Flex>
    </Page.Header>
  );
};

export default GameHeader;
