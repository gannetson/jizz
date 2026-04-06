import React, { useState, useContext } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
} from "@chakra-ui/react";
import { FormattedMessage, useIntl } from "react-intl";
import { format } from "date-fns";
import AppContext, { Game } from "../core/app-context";
import { getCountryDisplayName } from "../data/country-names-nl";
import { FaChevronRight } from "react-icons/fa";
import { GameDetailModal } from "./game-detail-modal";

type GameRowProps = {
  game: Game;
  /** Stronger affordance (chevron + hint) for MPG results where the card is the only entry to details. */
  emphasizeClickable?: boolean;
  /** Guest MPG: load answers via game + player token instead of JWT. */
  playerToken?: string;
};

/**
 * Reusable component for displaying a game row with click-to-view details.
 * Handles the game detail modal internally.
 */
export const GameRow = ({ game, emphasizeClickable = false, playerToken }: GameRowProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const intl = useIntl();
  const { language } = useContext(AppContext);
  const locale = language === 'nl' ? 'nl' : 'en';

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

  const openModal = () => setIsModalOpen(true);

  return (
    <>
      <Box
        p={4}
        borderWidth="1px"
        borderRadius="md"
        borderColor={emphasizeClickable ? "primary.200" : undefined}
        bg="white"
        width="full"
        cursor="pointer"
        role="button"
        tabIndex={0}
        aria-label={intl.formatMessage({
          id: "game_details",
          defaultMessage: "Game details",
        })}
        _hover={{ shadow: emphasizeClickable ? "md" : "md", borderColor: emphasizeClickable ? "primary.400" : undefined }}
        _focusVisible={{
          outline: "2px solid",
          outlineColor: "primary.500",
          outlineOffset: "2px",
        }}
        transition="all 0.2s"
        onClick={openModal}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openModal();
          }
        }}
      >
        <VStack align="stretch" gap={2}>
          <HStack justify="space-between" align="start" gap={3}>
            <VStack align="start" gap={1} flex={1}>
              <Text fontWeight="bold" fontSize="lg">
                {game.country ? getCountryDisplayName(game.country, locale) : intl.formatMessage({ id: 'unknown country', defaultMessage: 'Unknown Country' })}
              </Text>
              <Text fontSize="sm" color="gray.600">
                {formatDate(game.created)}
              </Text>
            </VStack>
            <HStack align="start" gap={2}>
              <VStack align="end" gap={1}>
                {game.user_score !== undefined && (
                  <Text fontSize="md" fontWeight="bold" color="primary.600">
                    {game.user_score} <FormattedMessage id="points" defaultMessage="points" />
                  </Text>
                )}
                {game.correct_count !== undefined &&
                  game.total_questions !== undefined &&
                  game.total_questions > 0 && (
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
              {emphasizeClickable && (
                <FaChevronRight aria-hidden color="var(--chakra-colors-gray-400)" size={18} style={{ marginTop: 4 }} />
              )}
            </HStack>
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
          {emphasizeClickable && (
            <Text fontSize="sm" color="primary.600" fontWeight="medium">
              <FormattedMessage
                id="tap_for_game_details"
                defaultMessage="Open for full game details and answers"
              />
            </Text>
          )}
        </VStack>
      </Box>

      <GameDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        gameToken={game.token}
        playerToken={playerToken}
      />
    </>
  );
};

