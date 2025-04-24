import {Box, Button, Flex, Link, useColorMode} from "@chakra-ui/react";
import AppContext from "../../core/app-context";
import {useContext} from "react";
import {IoIosMoon, IoIosSunny} from "react-icons/io";
import {FormattedMessage} from "react-intl"
import SelectLanguage from "../../components/select-language";
import ChangeLanguage from "../../components/change-language";

export const BirdrMenu = () => {
    const {game} = useContext(AppContext);
    const { colorMode, toggleColorMode } = useColorMode()
    return (
        <Flex direction={'column'} gap={4} fontSize={'xl'}>
            <Link href={'/'}>
              <FormattedMessage id={'home'} defaultMessage={'Home'}/>
            </Link>
            <Link href={'/start'}>
              <FormattedMessage id={'new game'} defaultMessage={'New game'} />
            </Link>
            <Link href={'/join'}>
              <FormattedMessage id={'join game'} defaultMessage={'Join a game'} />
            </Link>
            <Link href={'/scores'}>
              <FormattedMessage id={'High scores'} defaultMessage={'High scores'} />
            </Link>
            <Link href={'/challenge'}>
              <FormattedMessage id={'challenge'} defaultMessage={'Challenge (beta)'} />
            </Link>
            <Link href={'/updates'}>
              <FormattedMessage id={'Updates'} defaultMessage={'Updates'} />
            </Link>
            <Link href={'/privacy'}>
              <FormattedMessage id={'privacy'} defaultMessage={'Privacy'} />
            </Link>
            <Link href={'/about'}>
              <FormattedMessage id={'about birdr'} defaultMessage={'About Birdr'} />
            </Link>
            <Box>
              <Button onClick={toggleColorMode} leftIcon={colorMode === 'light' ? <IoIosMoon /> :<IoIosSunny />}>
                  {colorMode === 'light' ? 'Dark' : 'Light'}
              </Button>
            </Box>

            <ChangeLanguage />
        </Flex>
    );
}