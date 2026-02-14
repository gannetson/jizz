import {Box, Button, Flex, Kbd, ListRoot, ListItem, Show, Text} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import React, {useCallback, useContext, useEffect} from "react"
import WebsocketContext from "../../../core/websocket-context"
import {PlayerItem} from "./player-item"
import AppContext from "../../../core/app-context"
import {useNavigate} from "react-router-dom"
import {ViewSpecies} from "../../../components/view-species"
import { ComparisonButton } from "../../../components/comparison-button"


export const WaitingComponent = () => {

  const {players, nextQuestion, answer, question} = useContext(WebsocketContext)
  const {player, game} = useContext(AppContext)

  const done = (game?.length || 1) <= (question?.sequence || 0)
  const navigate = useNavigate()

  const endGame = () => {
    navigate('/game/ended')
  }

  return (
    <>
      <Box position={'relative'}>
        <Flex direction={'column'} gap={8}>
          <Text>Correct answer was <b><ViewSpecies species={answer?.species}/></b></Text>
          {answer && !answer?.correct && (
            <Box display="flex" flexDirection="column" gap={3}>
              <Text>Your answer was <b><ViewSpecies species={answer?.answer}/></b></Text>
              {answer?.species?.id && answer?.answer?.id && (
                <ComparisonButton
                  species1Id={answer.species.id}
                  species2Id={answer.answer.id}
                  buttonLabel={<FormattedMessage id="view_comparison" defaultMessage="Comparison" />}
                  buttonProps={{ colorPalette: "info" }}
                />
              )}
            </Box>
          )}
          <ListRoot gap={4}>
            {players && players.map((player, index) => (
              <ListItem key={index}>
                <PlayerItem showRanking={false} player={player}/>
              </ListItem>
            ))}
          </ListRoot>
          <Box>
            {done ? (
              <Button onClick={endGame} colorPalette={'primary'}>
                <FormattedMessage id={'end game'} defaultMessage={'End game'}/>
              </Button>
            ) : (
              <Button onClick={nextQuestion} colorPalette={'primary'}>
                <FormattedMessage id={'next question'} defaultMessage={'Next question'}/>
              </Button>
            )}
          </Box>
        </Flex>
      </Box>
    </>

  )
}