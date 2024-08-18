import {Box, Flex, Heading, Link} from "@chakra-ui/react";
import AppContext from "../../core/app-context";
import {useContext} from "react";

export const JizzMenu = () => {
    const {game} = useContext(AppContext);

    return (
        <Flex direction={'column'} gap={4} fontSize={'xl'}>
            <Link href={'/'}>Home</Link>
            {game && <Link href={'/game'}>Continue game</Link>}

        </Flex>
    );
}