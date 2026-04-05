import { useContext, useMemo } from "react";
import AppContext, { Language } from "../core/app-context";
import { Box, Flex, Heading, RadioGroup } from "@chakra-ui/react";
import { FormattedMessage, useIntl } from "react-intl";
import { UseLanguages } from "../user/use-languages";
import { languageNamesNl } from "../data/language-names-nl";
import LanguageCombobox from "./language-combobox";

const SelectLanguage = () => {
  const intl = useIntl();
  const { language, setLanguage } = useContext(AppContext);
  const { languages } = UseLanguages();
  const locale = language === "nl" ? "nl" : "en";

  const onChange = (lang: string) => {
    setLanguage?.(lang);
  };

  const languagesArray = Array.isArray(languages) ? languages : [];
  const radioLabel = (code: string, fallback: string) =>
    locale === "nl" && languageNamesNl[code] ? languageNamesNl[code] : fallback;

  return (
    <Box>
      <Heading size="md" mb={4}>
        <FormattedMessage id="species language" defaultMessage="Species language" />
      </Heading>
      <Box mb={4}>
        <FormattedMessage
          id="set language description"
          defaultMessage="This changes the species names in the game. Other players that join your game can pick another language."
        />
      </Box>
      <LanguageCombobox languages={languagesArray} value={language ?? ""} onChange={onChange} />
    </Box>
  );
};

export default SelectLanguage;
