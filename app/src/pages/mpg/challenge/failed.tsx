import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Flex, Heading, Icon, Text } from '@chakra-ui/react';
import { FormattedMessage } from 'react-intl';
import Page from '../../layout/page';
import GameHeader from '../game-header';
import WebsocketContext from '../../../core/websocket-context';
import AppContext from '../../../core/app-context';
import { FaHeart } from 'react-icons/fa';

export const FailedLevel: React.FC = () => {
  const { player, countryChallenge, loading, getNewChallengLevel } = useContext(AppContext);
  const navigate = useNavigate();


  const level = countryChallenge?.levels[0];
  const round = level ? level.challenge_level.sequence + 1 : '?'

  const restartLevel = ()=> {
    getNewChallengLevel();
  }

  if (!level) {
    return (
      <Flex direction={'column'} gap={10}>
        <Heading size={'lg'}>
          <FormattedMessage id={'no level found'} defaultMessage={'No level found'} />
        </Heading>
        <Text>
          <Button onClick={() => navigate('/challenge')}></Button>
        </Text>
      </Flex>
    );
  }

  return (
    <Flex direction={'column'} gap={10}>
      <Heading size={'lg'}>
        <FormattedMessage id={'challenge title'} defaultMessage={'Failed! {round} - {title}'} values={{round, title: level?.challenge_level.title}} />
        </Heading>
      <FormattedMessage
        id={'failed description'}
        defaultMessage={
          "Ouch! That was one wrong answer too many..."
        }
      />



      <Flex gap={2}>
        <FormattedMessage id={'jokers this round'} defaultMessage={'Jokers this round:'} />
        {[...Array(level.challenge_level.jokers)].map((_, i) => (
          <Icon key={i} as={FaHeart} color="orange.600" boxSize={6} />
        ))}
      </Flex>
      <Button onClick={restartLevel}>
        <FormattedMessage id="Restart level" defaultMessage="Retart Level" />
      </Button>
    </Flex>

);
};
