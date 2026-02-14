import {Flex, Link} from "@chakra-ui/react";
import AppContext from "../../../core/app-context";
import {useContext} from "react";
import {FormattedMessage} from "react-intl"
import ChangeLanguage from "../../../components/change-language";

export const BirdrMenu = () => {
    const {game} = useContext(AppContext);
    return (
        <Flex direction={'column'} gap={4} fontSize={'xl'}>
            <Link href={'/'} textDecoration="none">
              <FormattedMessage id={'home'} defaultMessage={'Home'}/>
            </Link>
            <Link href={'/start'} textDecoration="none">
              <FormattedMessage id={'new game'} defaultMessage={'New game'} />
            </Link>
            <Link href={'/join'} textDecoration="none">
              <FormattedMessage id={'join game'} defaultMessage={'Join a game'} />
            </Link>
            <Link href={'/scores'} textDecoration="none">
              <FormattedMessage id={'High scores'} defaultMessage={'High scores'} />
            </Link>
            <Link href={'/challenge'} textDecoration="none">
              <FormattedMessage id={'challenge'} defaultMessage={'Country challenge'} />
            </Link>
            <Link href={'/updates'} textDecoration="none">
              <FormattedMessage id={'Updates'} defaultMessage={'Updates'} />
            </Link>
            <Link href={'/privacy'} textDecoration="none">
              <FormattedMessage id={'privacy'} defaultMessage={'Privacy'} />
            </Link>
            <Link href={'/about'} textDecoration="none">
              <FormattedMessage id={'about birdr'} defaultMessage={'About Birdr'} />
            </Link>

            <ChangeLanguage />
        </Flex>
    );
}

export default BirdrMenu;

