import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Flex, Heading, Icon, Text } from '@chakra-ui/react';
import { FormattedMessage } from 'react-intl';
import Page from '../../layout/page';
import GameHeader from '../game-header';
import WebsocketContext from '../../../core/websocket-context';
import AppContext from '../../../core/app-context';
import { FaHeart } from 'react-icons/fa';

export const StartLevel: React.FC = () => {
  const { player, countryChallenge, loading, language } = useContext(AppContext);
  const navigate = useNavigate();

  const startLevel = () => {
    navigate('/challenge/play');
  };

  const level = countryChallenge?.levels[0];
  const round = level ? level.challenge_level.sequence + 1 : '?'

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
        <FormattedMessage 
          id={'challenge title'} 
          defaultMessage={'Round {round} - {title}'} 
          values={{round, title: language === 'nl' ? level?.challenge_level.title_nl : level?.challenge_level.title}} 
        />
        </Heading>
      <Heading size={'md'}>
        <FormattedMessage id={'this level'} defaultMessage={'What is this level about?'} />
      </Heading>

      <Text>
        {language === 'nl' ? level.challenge_level.description_nl : level.challenge_level.description}
      </Text>


      <Flex gap={2}>
        <FormattedMessage id={'jokers this round'} defaultMessage={'Jokers this round:'} />
        {[...Array(level.challenge_level.jokers)].map((_, i) => (
          <Icon key={i} as={FaHeart} color="orange.600" boxSize={6} />
        ))}
      </Flex>
      <Button onClick={startLevel}>
        <FormattedMessage id="start level" defaultMessage="Start Level" />
      </Button>
    </Flex>

  );
};
