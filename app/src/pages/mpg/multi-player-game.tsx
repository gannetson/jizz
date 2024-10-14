import React, {useContext, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import Page from "../layout/page"
import {Badge, Box, Button, Flex, Heading, List, ListItem} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import copy from "copy-to-clipboard"
import WebsocketContext from "../../core/websocket-context"
import {PlayerItem} from "../../components/play/player-item"
import AppContext from "../../core/app-context"

interface Player {
  name: string;
}

const MultiPlayerGame: React.FC = () => {


  const [copied, setCopied] = useState(false)
  const {players, startGame} = useContext(WebsocketContext)
  const {player} = useContext(AppContext)

  return (
    <Page>
      <Page.Header>
        <Heading size={'lg'} noOfLines={1}>
          <FormattedMessage id={'Multi player game'} defaultMessage={'Multi player game'}/>
        </Heading>
      </Page.Header>
      <Page.Body>
        <Heading variant={'h3'}>Question</Heading>
      </Page.Body>
    </Page>
  );
};

export default MultiPlayerGame;
