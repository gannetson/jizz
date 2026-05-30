import {
  Box,
  Button,
  CardRoot,
  Flex,
  Heading,
  Icon,
  SimpleGrid,
} from '@chakra-ui/react';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { FormattedMessage } from 'react-intl';
import {
  FaCheckCircle,
  FaDotCircle,
  FaHeart,
  FaHeartBroken,
  FaSkull,
} from 'react-icons/fa';
import { IconType } from 'react-icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getBirdrJourney,
  getChallengeQuestion,
  resolveBirdrJourneyPlayerToken,
  submitChallengeAnswer,
  type BirdrJourneyGame,
} from '../../api/birdrJourney';
import { AnswerFeedback } from '../../components/answer-feedback';
import { BirdrMoodHero } from '../../components/birdr-mood-hero';
import { FlagMediaButton } from '../../components/flag-media-button';
import { Loading } from '../../components/loading';
import SpeciesCombobox from '../../components/species-combobox';
import { ZoomablePlayImage } from '../../components/zoomable-play-image';
import AppContext, { Answer, Question, Species } from '../../core/app-context';
import {
  currentPlayMediaItem,
  mediaArrayLengthForQuestion,
  mediaSlotIndexFromQuestion,
} from '../../core/question-media-index';
import { Page } from '../../shared/components/layout';
import { SpeciesName } from '../../components/species-name';
import { postQuestionMediaReady } from '../../api/question-media-ready';
import { postQuestionNextMedia } from '../../api/question-next-media';

type ResultType = 'open' | 'correct' | 'joker' | 'incorrect';

const iconMapping: Record<ResultType, IconType> = {
  open: FaDotCircle,
  correct: FaCheckCircle,
  joker: FaHeart,
  incorrect: FaSkull,
};

function JourneyCalculatingView() {
  return (
    <Page>
      <Page.Body>
        <BirdrMoodHero
          mood="waiting"
          titleId="calculating_progress"
          titleDefault="Calculating progress…"
          showSpinner
          pulse
        />
      </Page.Body>
    </Page>
  );
}

export function BirdrJourneyPlayPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const journeyId = Number(searchParams.get('journeyId') ?? 0);
  const countryCode = searchParams.get('countryCode') ?? '';
  const gameToken = searchParams.get('gameToken') ?? '';
  const gameMedia = searchParams.get('gameMedia') ?? 'images';
  const gameLevel = searchParams.get('gameLevel') ?? 'advanced';

  const { species, language } = useContext(AppContext);
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [response, setResponse] = useState<Answer | null>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [mediaIndex, setMediaIndex] = useState<number | null>(null);
  const [journeyGame, setJourneyGame] = useState<BirdrJourneyGame | null>(null);
  const [journeyStepFailed, setJourneyStepFailed] = useState(false);
  const [levelEnded, setLevelEnded] = useState(false);
  const [hadQuestion, setHadQuestion] = useState(false);
  const mediaPostedForQuestionId = useRef<number | null>(null);
  const playerTokenRef = useRef<string | null>(null);

  const navigateResults = useCallback(() => {
    navigate(`/journey/${countryCode}/results?gameToken=${gameToken}`, { replace: true });
  }, [navigate, countryCode, gameToken]);

  const loadJourneyGame = useCallback(async () => {
    if (!countryCode || !gameToken) return;
    try {
      const journey = await getBirdrJourney(countryCode);
      const currentGame =
        journey?.current_game?.game?.token === gameToken ? journey.current_game : null;
      setJourneyGame(currentGame);
    } catch {
      setJourneyGame(null);
    }
  }, [countryCode, gameToken]);

  const loadQuestion = useCallback(async () => {
    if (!gameToken) return;
    setLoading(true);
    try {
      const token = await resolveBirdrJourneyPlayerToken();
      playerTokenRef.current = token;
      const q = await getChallengeQuestion(gameToken, token ?? undefined, { cacheBust: true });
      setQuestion(q);
    } catch {
      setQuestion(null);
    } finally {
      setLoading(false);
    }
  }, [gameToken]);

  useEffect(() => {
    loadQuestion();
    loadJourneyGame();
  }, [loadQuestion, loadJourneyGame]);

  useEffect(() => {
    if (question) {
      setMediaIndex(question.number ?? 0);
      setHadQuestion(true);
      setJourneyStepFailed(false);
    }
  }, [question?.id]);

  useEffect(() => {
    mediaPostedForQuestionId.current = null;
    setMediaReady(false);
  }, [question?.id, mediaIndex]);

  useEffect(() => {
    if (!loading && !question && gameToken) {
      getBirdrJourney(countryCode).then((journey) => {
        const currentGame =
          journey?.current_game?.game?.token === gameToken ? journey.current_game : null;
        if (currentGame?.status === 'failed' || currentGame?.status === 'passed') {
          navigateResults();
        }
      }).catch(() => {});
    }
  }, [loading, question, gameToken, countryCode, navigateResults]);

  const showJourneyCalculating =
    !!journeyId &&
    !question &&
    !loading &&
    (hadQuestion || levelEnded || journeyStepFailed);

  if (!gameToken || !journeyId || !countryCode) {
    return (
      <Page>
        <Page.Body>
          <FormattedMessage id="error" defaultMessage="Error" />
        </Page.Body>
      </Page>
    );
  }

  if (loading && !question) {
    if (showJourneyCalculating) return <JourneyCalculatingView />;
    return <Loading />;
  }

  if (!question) {
    if (showJourneyCalculating) return <JourneyCalculatingView />;
    return <Loading />;
  }

  const mediaLength = mediaArrayLengthForQuestion(question, gameMedia);
  const currentMediaIndex =
    mediaIndex ?? mediaSlotIndexFromQuestion(question, mediaLength);
  const currentImage = currentPlayMediaItem(question?.images, question);
  const currentVideo = currentPlayMediaItem(question?.videos, question);
  const currentSound = currentPlayMediaItem(question?.sounds, question);

  const notifyMediaReady = () => {
    setMediaReady(true);
    const token = playerTokenRef.current;
    if (!question?.id || !token) return;
    if (mediaPostedForQuestionId.current === question.id) return;
    mediaPostedForQuestionId.current = question.id;
    postQuestionMediaReady(question.id, token).catch(() => {});
  };

  const handleFlagSuccess = async () => {
    if (!question?.id || !playerTokenRef.current) return;
    const excludedId =
      gameMedia === 'images'
        ? currentImage?.id
        : gameMedia === 'video'
          ? currentVideo?.id
          : currentSound?.id;
    try {
      await postQuestionNextMedia(question.id, playerTokenRef.current, excludedId);
      setMediaIndex(null);
      await loadQuestion();
    } catch {
      /* no alternate media */
    }
  };

  const handleFeedbackComplete = async () => {
    setShowFeedback(false);
    setSubmitting(false);
    if (journeyStepFailed) {
      navigateResults();
      return;
    }
    setResponse(null);
    setLevelEnded(false);
    setQuestion(null);
    setLoading(true);
    try {
      const token = await resolveBirdrJourneyPlayerToken();
      const q = await getChallengeQuestion(gameToken, token ?? undefined, { cacheBust: true });
      setQuestion(q);
      if (!q) {
        const journey = await getBirdrJourney(countryCode);
        const currentGame =
          journey?.current_game?.game?.token === gameToken ? journey.current_game : null;
        if (currentGame?.status === 'failed' || currentGame?.status === 'passed') {
          navigateResults();
        }
      }
      await loadJourneyGame();
    } finally {
      setLoading(false);
    }
  };

  const giveAnswer = async (answer: Species) => {
    if (submitting || showFeedback) return;
    const playerToken = await resolveBirdrJourneyPlayerToken();
    if (!playerToken) return;
    playerTokenRef.current = playerToken;
    setSubmitting(true);
    try {
      const result = await submitChallengeAnswer(
        {
          question_id: question.id,
          answer_id: answer.id,
          player_token: playerToken,
        },
        playerToken
      );
      setResponse(result);
      setIsCorrect(!!result.correct);
      setShowFeedback(true);

      const jokersBefore = journeyGame?.remaining_jokers;
      const failedFromJokers = !result.correct && jokersBefore !== undefined && jokersBefore <= 0;

      const journey = await getBirdrJourney(countryCode);
      const currentGame =
        journey?.current_game?.game?.token === gameToken ? journey.current_game : null;
      if (currentGame) setJourneyGame(currentGame);

      const stepFailed = currentGame?.status === 'failed' || failedFromJokers;
      if (stepFailed) {
        setJourneyStepFailed(true);
        setLevelEnded(true);
      } else if (currentGame?.status === 'passed') {
        setLevelEnded(true);
      }
    } catch {
      setIsCorrect(false);
      setShowFeedback(true);
    }
  };

  const totalJokers = journeyGame?.journey_step?.jokers ?? 0;
  const remainingJokers = journeyGame?.remaining_jokers ?? totalJokers;
  const levelLength = journeyGame?.journey_step?.length ?? journeyGame?.game?.length ?? 0;
  const answers = journeyGame?.game?.scores?.[0]?.answers ?? [];

  const results: ResultType[] = Array.from({ length: levelLength }, () => 'open');
  answers.forEach((answer) => {
    const index = (answer.sequence || 1) - 1;
    if (index >= 0 && index < results.length) {
      results[index] = answer.correct ? 'correct' : 'incorrect';
    }
  });
  const incorrectIndices = results.reduce<number[]>((indices, result, index) => {
    if (result === 'incorrect') indices.push(index);
    return indices;
  }, []);
  incorrectIndices.slice(0, totalJokers).forEach((index) => {
    results[index] = 'joker';
  });

  const hasOptions = (question.options?.length ?? 0) > 0;
  const isExpert = gameLevel === 'expert';

  return (
    <Page>
      <Page.Header>
        <Flex direction="column" gap={2}>
          <Heading size="md">
            <FormattedMessage
              id="game progress"
              defaultMessage="Game - {current} of {total}"
              values={{
                current: question.sequence ?? 1,
                total: levelLength,
              }}
            />
          </Heading>
          <Flex gap={2}>
            {Array.from({ length: totalJokers }).map((_, i) => (
              <Icon
                key={i}
                as={i < remainingJokers ? FaHeart : FaHeartBroken}
                color={i < remainingJokers ? 'primary.600' : 'primary.300'}
                boxSize={6}
              />
            ))}
          </Flex>
        </Flex>
      </Page.Header>
      <Page.Body>
        <Box position="relative" mb={4}>
          {gameMedia === 'video' && currentVideo && (
            <Box position="relative" minH="220px">
              <ReactPlayer
                key={`${question.id}-video-${currentMediaIndex}`}
                width="100%"
                height="50%"
                url={currentVideo.url}
                controls
                playing
                onReady={notifyMediaReady}
              />
              {showFeedback && (
                <AnswerFeedback
                  correct={isCorrect}
                  speciesFrequency={response?.species_frequency}
                  onAnimationComplete={handleFeedbackComplete}
                />
              )}
            </Box>
          )}
          {gameMedia === 'images' && currentImage && (
            <Box position="relative" minH="280px">
              <ZoomablePlayImage
                key={`${question.id}-img-${currentMediaIndex}`}
                previewSrc={currentImage.url.replace('/1800', '/900')}
                fullSrc={currentImage.url}
                onLoad={notifyMediaReady}
                onError={(e) => {
                  e.currentTarget.src = '/images/birdr-logo.png';
                  notifyMediaReady();
                }}
              />
              {showFeedback && (
                <AnswerFeedback
                  correct={isCorrect}
                  speciesFrequency={response?.species_frequency}
                  onAnimationComplete={handleFeedbackComplete}
                />
              )}
            </Box>
          )}
          {gameMedia === 'audio' && currentSound && (
            <Box position="relative" minH="80px" py={8}>
              <ReactPlayer
                key={`${question.id}-audio-${currentMediaIndex}`}
                width="100%"
                height="50px"
                url={currentSound.url}
                controls
                playing
                onReady={notifyMediaReady}
              />
              {showFeedback && (
                <AnswerFeedback
                  correct={isCorrect}
                  speciesFrequency={response?.species_frequency}
                  onAnimationComplete={handleFeedbackComplete}
                />
              )}
            </Box>
          )}
          <Flex justifyContent="end">
            {gameMedia === 'video' && currentVideo && (
              <FlagMediaButton media={currentVideo} onFlagSuccess={handleFlagSuccess} />
            )}
            {gameMedia === 'images' && currentImage && (
              <FlagMediaButton media={currentImage} onFlagSuccess={handleFlagSuccess} />
            )}
            {gameMedia === 'audio' && currentSound && (
              <FlagMediaButton media={currentSound} onFlagSuccess={handleFlagSuccess} />
            )}
          </Flex>
        </Box>

        {hasOptions ? (
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} mb={6}>
            {question.options!.map((option, key) => (
              <Button
                key={key}
                onClick={() => giveAnswer(option)}
                disabled={submitting || !mediaReady || showFeedback}
                colorPalette={
                  response?.species?.id === option.id
                    ? 'green'
                    : response?.answer?.id === option.id
                      ? 'red'
                      : 'primary'
                }
              >
                <SpeciesName species={option} />
              </Button>
            ))}
          </SimpleGrid>
        ) : isExpert ? (
          <SpeciesCombobox
            species={species || []}
            playerLanguage={language}
            onSelect={giveAnswer}
            loading={submitting}
            isDisabled={!mediaReady || showFeedback}
            autoFocus
            placeholder={
              <FormattedMessage id="type species" defaultMessage="Start typing your answer..." />
            }
          />
        ) : null}

        <Heading size="md" mb={2}>
          <FormattedMessage id="progress" defaultMessage="Progress" />
        </Heading>
        <CardRoot bgColor="primary.100" p={4}>
          <Box>
            {results.map((result, i) => (
              <Icon
                p={1}
                key={i}
                as={iconMapping[result]}
                color={result === 'open' ? 'primary.300' : 'primary.600'}
                boxSize={8}
              />
            ))}
          </Box>
        </CardRoot>
      </Page.Body>
    </Page>
  );
}
