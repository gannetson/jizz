import React, {useContext} from 'react';
import {Box, Flex, Heading} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import Page from "../layout/page"
import AppContext from "../../core/app-context"


const GameHeader: React.FC = () => {
  const {player, country} = useContext(AppContext)


  return (
    <Page.Header>
      <Flex justifyContent={'space-between'} width={'full'} alignItems={'center'}>
        <Heading size={'lg'} noOfLines={1}>
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
