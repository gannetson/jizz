import {Flex, Link} from "@chakra-ui/react";
import {useCallback, useEffect, useState} from "react";
import {FormattedMessage} from "react-intl"
import {Link as RouterLink, useLocation} from "react-router-dom";
import ChangeLanguage from "../../../components/change-language";
import {
  getCountryChallengePath,
  getStoredBirdrJourneyCountryCode,
} from "../../../api/birdrJourney";
import {authService} from "../../../api/services/auth.service";
import {profileService} from "../../../api/services/profile.service";

export const BirdrMenu = () => {
    const location = useLocation();
    const [challengePath, setChallengePath] = useState('/journey/intro');

    const loadChallengePath = useCallback(async () => {
      let profileCountry: string | null = null;
      if (authService.getAccessToken()) {
        try {
          const profile = await profileService.getProfile();
          profileCountry = profile.country_code ?? null;
        } catch {
          /* ignore */
        }
      }
      const path = await getCountryChallengePath([
        getStoredBirdrJourneyCountryCode(),
        profileCountry,
      ]);
      setChallengePath(path);
    }, []);

    useEffect(() => {
      loadChallengePath();
    }, [loadChallengePath, location.pathname]);

    return (
        <Flex direction={'column'} gap={4} fontSize={'xl'}>
            <Link href={'/'} textDecoration="none">
              <FormattedMessage id={'home'} defaultMessage={'Home'}/>
            </Link>
            <Link href={'/start'} textDecoration="none">
              <FormattedMessage id={'new game'} defaultMessage={'New game'} />
            </Link>
            <Link href={'/scores'} textDecoration="none">
              <FormattedMessage id={'High scores'} defaultMessage={'High scores'} />
            </Link>
            <Link asChild textDecoration="none">
              <RouterLink to={challengePath}>
                <FormattedMessage id={'country_challenge'} defaultMessage={'Country challenge'} />
              </RouterLink>
            </Link>
            <Link href={'/checklist'} textDecoration="none">
              <FormattedMessage id="checklist_title" defaultMessage="My Checklist" />
            </Link>
            <Link href={'/daily-challenge'} textDecoration="none">
              <FormattedMessage id={'daily_challenge'} defaultMessage={'Daily challenge'} />
            </Link>
            <Link href={'/updates'} textDecoration="none">
              <FormattedMessage id={'Updates'} defaultMessage={'Updates'} />
            </Link>
            <Link href={'/help'} textDecoration="none">
              <FormattedMessage id={'help'} defaultMessage={'Help'} />
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
