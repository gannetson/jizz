import {Box, Button, Flex, Link, useColorMode} from "@chakra-ui/react";
import AppContext from "../../core/app-context";
import {useContext} from "react";
import {IoIosMoon, IoIosSunny} from "react-icons/io";

export const JizzMenu = () => {
    const {game} = useContext(AppContext);
    const { colorMode, toggleColorMode } = useColorMode()
    return (
        <Flex direction={'column'} gap={4} fontSize={'xl'}>
            <Link href={'/'}>Home</Link>
            <Link href={'/start'}>Start game</Link>
            <Link href={'/join'}>Join game</Link>
            {game && <Link href={'/game'}>Continue game</Link>}
            <Link href={'/about'}>About</Link>
            <Box>
            <Button onClick={toggleColorMode} leftIcon={colorMode === 'light' ? <IoIosMoon /> :<IoIosSunny />}>
                {colorMode === 'light' ? 'Dark' : 'Light'}
            </Button>
            </Box>
        </Flex>
    );
}