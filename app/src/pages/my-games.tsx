import React, { useState, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Container,
  Button,
  Spinner,
  Alert,
  AlertIndicator,
  Link,
} from "@chakra-ui/react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";
import { gamesService, PaginatedGamesResponse } from "../api/services/games.service";
import { authService } from "../api/services/auth.service";
import { Page } from "../shared/components/layout";
import { Game } from "../core/app-context";
import { format } from "date-fns";
import { GameDetailModal } from "../components/game-detail-modal";

export const MyGamesPage = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<{
    count: number;
    next: string | null;
    previous: string | null;
  } | null>(null);
  const [selectedGameToken, setSelectedGameToken] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const loadGames = async () => {
      if (!authService.getAccessToken()) {
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await gamesService.getMyGames(currentPage);
        setGames(data.results);
        setPagination({
          count: data.count,
          next: data.next,
          previous: data.previous,
        });
      } catch (err: any) {
        setError(err.message || "Failed to load games");
        if (err.message?.includes("401") || err.message?.includes("Unauthorized")) {
          authService.clearTokens();
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    loadGames();
  }, [currentPage, navigate]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPp');
    } catch {
      return dateString;
    }
  };

  const getLevelLabel = (level: string) => {
    const levels: { [key: string]: string } = {
      beginner: 'Beginner',
      advanced: 'Advanced',
      expert: 'Expert',
    };
    return levels[level] || level;
  };

  const getMediaLabel = (media: string) => {
    const mediaTypes: { [key: string]: string } = {
      images: 'Images',
      audio: 'Sounds',
      video: 'Videos',
    };
    return mediaTypes[media] || media;
  };

  if (loading && games.length === 0) {
    return (
      <Page>
        <Page.Header>
          <Heading color={'gray.800'} size={'lg'} m={0}>
            <FormattedMessage id="my_games" defaultMessage="My Games" />
          </Heading>
        </Page.Header>
        <Page.Body>
          <VStack gap={4}>
            <Spinner size="xl" colorPalette="primary" />
            <Text>Loading games...</Text>
          </VStack>
        </Page.Body>
      </Page>
    );
  }

  return (
    <Page>
      <Page.Header>
        <Heading color={'gray.800'} size={'lg'} m={0}>
          <FormattedMessage id="my_games" defaultMessage="My Games" />
        </Heading>
      </Page.Header>
      <Page.Body>
        <Container maxW="container.lg" py={8}>
          {error && (
            <Alert.Root status="error" mb={4}>
              <AlertIndicator />
              <Alert.Content>
                <Alert.Title>{error}</Alert.Title>
              </Alert.Content>
            </Alert.Root>
          )}

          {games.length === 0 && !loading ? (
            <VStack gap={4} py={8}>
              <Text fontSize="lg" color="gray.500">
                <FormattedMessage 
                  id="no_games_played" 
                  defaultMessage="You haven't played any games yet." 
                />
              </Text>
              <Button 
                colorPalette="primary" 
                onClick={() => navigate('/start')}
              >
                <FormattedMessage id="start_game" defaultMessage="Start a Game" />
              </Button>
            </VStack>
          ) : (
            <VStack gap={4} align="stretch">
              {pagination && (
                <Text fontSize="sm" color="gray.500">
                  <FormattedMessage 
                    id="total_games" 
                    defaultMessage="Total: {count} games" 
                    values={{ count: pagination.count }}
                  />
                </Text>
              )}

              {games.map((game) => (
                <Box
                  key={game.token}
                  p={4}
                  borderWidth="1px"
                  borderRadius="md"
                  bg="white"
                  _hover={{ shadow: "md", cursor: "pointer" }}
                  transition="all 0.2s"
                  onClick={() => {
                    setSelectedGameToken(game.token);
                    setIsModalOpen(true);
                  }}
                >
                  <VStack align="stretch" gap={2}>
                    <HStack justify="space-between" align="start">
                      <VStack align="start" gap={1}>
                        <Text fontWeight="bold" fontSize="lg">
                          {game.country?.name || 'Unknown Country'}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          {formatDate(game.created)}
                        </Text>
                      </VStack>
                      <VStack align="end" gap={1}>
                        {game.user_score !== undefined && (
                          <Text fontSize="md" fontWeight="bold" color="primary.600">
                            {game.user_score} <FormattedMessage id="points" defaultMessage="points" />
                          </Text>
                        )}
                        {game.correct_count !== undefined && game.total_questions !== undefined && (
                          <Text fontSize="sm" color="gray.600">
                            <FormattedMessage 
                              id="correct_out_of" 
                              defaultMessage="{correct} / {total} correct" 
                              values={{ 
                                correct: game.correct_count,
                                total: game.total_questions
                              }}
                            />
                          </Text>
                        )}
                        {game.ended && (
                          <Text fontSize="xs" color="gray.500">
                            <FormattedMessage id="completed" defaultMessage="Completed" />
                          </Text>
                        )}
                      </VStack>
                    </HStack>

                    <HStack gap={4} fontSize="sm" color="gray.600">
                      <Text>
                        <FormattedMessage id="level" defaultMessage="Level" />: {getLevelLabel(game.level)}
                      </Text>
                      <Text>•</Text>
                      <Text>
                        <FormattedMessage id="length" defaultMessage="Length" />: {game.length}
                      </Text>
                      <Text>•</Text>
                      <Text>
                        <FormattedMessage id="media" defaultMessage="Media" />: {getMediaLabel(game.media)}
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
              ))}

              {/* Pagination */}
              {pagination && (pagination.next || pagination.previous) && (
                <HStack justify="center" gap={2} mt={4}>
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.previous}
                  >
                    <FormattedMessage id="previous" defaultMessage="Previous" />
                  </Button>
                  <Text fontSize="sm" color="gray.600">
                    <FormattedMessage 
                      id="page_info" 
                      defaultMessage="Page {current} of {total}" 
                      values={{
                        current: currentPage,
                        total: Math.ceil(pagination.count / 20),
                      }}
                    />
                  </Text>
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.next}
                  >
                    <FormattedMessage id="next" defaultMessage="Next" />
                  </Button>
                </HStack>
              )}
            </VStack>
          )}
        </Container>
      </Page.Body>
      
      {/* Game Detail Modal */}
      <GameDetailModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedGameToken(null);
        }}
        gameToken={selectedGameToken}
      />
    </Page>
  );
};

export default MyGamesPage;

