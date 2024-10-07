import {Button, Flex, Heading, Spinner, Text} from "@chakra-ui/react";
import Page from "./layout/page";
import SelectCountry from "../components/select-country";
import SelectLevel from "../components/select-level";
import AppContext from "../core/app-context";
import {useContext, useState} from "react";
import {formatDistanceToNow} from "date-fns";
import {GiHummingbird} from "react-icons/all";
import SelectLanguage from "../components/select-language"
import {FormattedMessage} from "react-intl";

const HomePage = () => {
    const {country, level, setGame, game, language} = useContext(AppContext);
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
                    language: language,
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
                <Heading  textColor={'gray.800'} size={'lg'} m={0} noOfLines={1}>
                    <FormattedMessage id='welcome' defaultMessage={'Welcome!'} />
                </Heading>
            </Page.Header>
            <Page.Body>
                {loading ? (
                    <Spinner size={'xl'} color={'orange.300'}/>
                ) : (
                    <Flex direction={'column'} gap={20}>
                        {game && (
                            <Flex direction={'column'} gap={10}>
                                <Heading size={'lg'}>
                                    <FormattedMessage id='old game' defaultMessage={'You have an old game in progress!'} />
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
                            <Heading size={'lg'}><FormattedMessage id='start game' defaultMessage={'Start new game'} /></Heading>
                            <SelectCountry/>
                            <SelectLanguage />
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