import React, {useContext} from 'react';
import {Heading} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import { Page } from "../../shared/components/layout"
import AppContext from "../../core/app-context"


const GameHeader: React.FC = () => {
  const {country} = useContext(AppContext)


  return (
    <Page.Header>
      <Heading color={'gray.800'} size={'lg'} m={0}>
        {country?.name ? country.name : <FormattedMessage id='welcome' defaultMessage={'Welcome'}/>}
      </Heading>
    </Page.Header>
  );
};

export default GameHeader;
