import React, { useContext } from 'react';
import { Heading } from "@chakra-ui/react"
import { FormattedMessage } from "react-intl"
import { Page } from "../../shared/components/layout"
import AppContext from "../../core/app-context"
import { getCountryDisplayName } from "../../data/country-names-nl"

const GameHeader: React.FC = () => {
  const { country, appLanguage } = useContext(AppContext);
  const locale = appLanguage || 'en';

  return (
    <Page.Header>
      <Heading color={'gray.800'} size={'lg'} m={0}>
        {country ? getCountryDisplayName(country, locale) : <FormattedMessage id='welcome' defaultMessage={'Welcome'}/>}
      </Heading>
    </Page.Header>
  );
};

export default GameHeader;
