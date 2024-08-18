import {Button, Flex, Heading, Link, Spinner, Text} from "@chakra-ui/react";
import Page from "./layout/page";
import SelectCountry from "../components/select-country";
import SelectLevel from "../components/select-level";
import AppContext, {Country, Game} from "../core/app-context";
import {useCallback, useContext, useEffect, useState} from "react";
import {GiHummingbird} from "react-icons/all";
import {formatDate, formatDistanceToNow} from "date-fns";

const HomePage = () => {
    const {country, level, setGame, game} = useContext(AppContext);
    const [loading, setLoading] = useState(false)


    const startGame = async () => {
        if (country && level) {
            setLoading(true)
            const response = await fetch('/api/games/', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    country: country.code,
                    level: level,
                })
            })
            const data = await response.json();
            if (data && setGame) {
                setGame(data)
                localStorage.setItem('game-token', data.token)
                document.location.href = '/game/'
            }
            setLoading(false)

        }
    }

    const loadGame = async () => {
        if (game) {
            document.location.href = '/game/'
        }
    }

    return (
        <Page>
            <Page.Header>
                <Heading size={'lg'} m={0} noOfLines={1}>
                    Welcome!
                </Heading>
            </Page.Header>
            <Page.Body>
                {loading ? (
                    <Spinner size={'xl'} color={'orange.300'}/>
                ) : (
                    <Flex direction={'column'} gap={20}>
                        {game && (
                            <Flex direction={'column'} gap={10}>
                                <Heading size={'md'}>
                                    You have an old game in progress
                                </Heading>
                                <Text>
                                    Country: {game.country.name}<br/>
                                    Started: {formatDistanceToNow(game.created)} ago<br />
                                    Progress: {game.correct} / {game.questions.length}
                                </Text>
                                <Button size='lg' onClick={loadGame} colorScheme={'orange'}>
                                    Continue game
                                </Button>
                            </Flex>
                        )}
                        <Flex direction={'column'} gap={10}>
                            <Heading size={'md'}>Start new game</Heading>
                            <SelectCountry/>
                            <SelectLevel/>
                            <Button colorScheme='orange' size='lg' rightIcon={<GiHummingbird/>} onClick={startGame}>
                                Start new game
                            </Button>
                        </Flex>
                    </Flex>
                )}
            </Page.Body>
        </Page>

    )
};

export default HomePage;