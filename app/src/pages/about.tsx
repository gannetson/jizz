import {Box, Button, Flex, Heading, Link, Spinner, Text} from "@chakra-ui/react";
import Page from "./layout/page";
import SelectCountry from "../components/select-country";
import SelectLevel from "../components/select-level";
import AppContext from "../core/app-context";
import {useContext, useState} from "react";
import {formatDistanceToNow} from "date-fns";
import {GiHummingbird} from "react-icons/all";
import SelectLanguage from "../components/select-language"

export const AboutPage = () => {


    return (
        <Page>
            <Page.Header>
                <Heading  textColor={'gray.800'} size={'lg'} m={0} noOfLines={1}>
                    About Birdr
                </Heading>
            </Page.Header>
            <Page.Body>
              <Heading size={'sm'}>Hi, I'm Loek! </Heading>
              <Text>
                I've started to build this app when I was planning a trip to Cost Rica.
                I wanted to prepare well to make most of my trip and the few birding options I would have there.
                    I found that <Link color={'orange.500'} target={'_blank'} href={'https://ebird.org'}>eBird</Link> has a wonderful collection of beautiful pictures covering all species in the world.
                They also have a neat API where you can get all kind of data, such as species list per country,
                </Text>

                <Text>
                    With my background in programming, I started to put this app together. Back-end / API is in
                    Django and front-end in React. All code is open source and available on <Link color={'orange.500'} target={'_blank'} href={'https://github.com/gannetson/birdr'}>GitHub</Link>.
                </Text>
              <Heading size={'sm'}>Contact & feedback</Heading>
              <Text>
                Please feel free to contact me with any questions, suggestions, bugs or whatever!
                I've plans to extent this app with more features, but would love to get some input or feedback.
              </Text>
              <Text>
                You can email me at <Link color={'orange.500'} target={'_blank'} href={'mailto:info@goedloek.nl'}>info@goedloek.nl</Link>.
              </Text>
            </Page.Body>
        </Page>

    )
};
