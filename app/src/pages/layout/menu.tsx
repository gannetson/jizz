import {Flex, Link} from "@chakra-ui/react";
import {FormattedMessage} from "react-intl"

export const JizzMenu = () => {
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
            <Link href={'/about'}>
              <FormattedMessage id={'about jizz'} defaultMessage={'About Jizz'} />
            </Link>
        </Flex>
    );
}