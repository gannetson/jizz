import React, { useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
} from "@chakra-ui/react";
import { FormattedMessage } from "react-intl";
import { format } from "date-fns";
import { Game } from "../core/app-context";
import { GameDetailModal } from "./game-detail-modal";

type GameRowProps = {
  game: Game;
};

/**
 * Reusable component for displaying a game row with click-to-view details.
 * Handles the game detail modal internally.
 */
export const GameRow = ({ game }: GameRowProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  return (
    <>
      <Box
        p={4}
        borderWidth="1px"
        borderRadius="md"
        bg="white"
        _hover={{ shadow: "md", cursor: "pointer" }}
        transition="all 0.2s"
        onClick={() => setIsModalOpen(true)}
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

      <GameDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        gameToken={game.token}
      />
    </>
  );
};

