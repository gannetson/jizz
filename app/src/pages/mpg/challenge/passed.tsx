import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Flex, Heading, Icon, Text } from '@chakra-ui/react';
import { FormattedMessage } from 'react-intl';
import { FaTrophy } from 'react-icons/fa';
import AppContext from '../../../core/app-context';

export const PassedLevel: React.FC = () => {
  const { countryChallenge, getNewChallengLevel } = useContext(AppContext);
  const navigate = useNavigate();

  const level = countryChallenge?.levels[0];
  const round = level ? level.challenge_level.sequence + 1 : '?';

  const nextLevel = () => {
    getNewChallengLevel()
  };

  if (!level) {
    return (
      <Flex direction={'column'} gap={10}>
        <Heading size={'lg'}>
          <FormattedMessage id={'no level found'} defaultMessage={'No level found'} />
        </Heading>
        <Text>
          <Button onClick={() => navigate('/challenge')}>
            <FormattedMessage id="back to challenges" defaultMessage="Back to Challenges" />
          </Button>
        </Text>
      </Flex>
    );
  }

  return (
    <Flex direction={'column'} gap={10} align="center">
      <Heading size={'lg'}>
        <FormattedMessage 
          id={'challenge success title'} 
          defaultMessage={'Congratulations! Level {round} Completed!'} 
          values={{round, title: level?.challenge_level.title}} 
        />
      </Heading>
      
      <Icon as={FaTrophy} color="yellow.400" boxSize={16} />
      
      <Text fontSize="lg">
        <FormattedMessage
          id={'success description'}
          defaultMessage={
            "Well done! You've successfully completed this level. Ready for the next challenge?"
          }
        />
      </Text>

      <Flex gap={4}>
        <Button onClick={nextLevel}>
          <FormattedMessage id="next level" defaultMessage="Next Level" />
        </Button>
      </Flex>
    </Flex>
  );
};
