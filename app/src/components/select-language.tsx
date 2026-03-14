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
        <FormattedMessage id="player language" defaultMessage="Player language" />
      </Heading>
      <Box mb={4}>
        <FormattedMessage
          id="set language description"
          defaultMessage="This changes the species names in the game. Other players that join your game can pick another language."
        />
      </Box>
      <RadioGroup.Root
        colorPalette="primary"
        value={language}
        onValueChange={(e: { value?: string }) => e.value && onChange(e.value as "en" | "nl")}
      >
        <Flex direction="column" gap={4}>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroup.Item value="en_UK">
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl cursor="pointer">
                <RadioGroup.ItemIndicator />
              </RadioGroup.ItemControl>
              <RadioGroup.ItemText>{radioLabel("en_UK", "English (UK)")}</RadioGroup.ItemText>
            </RadioGroup.Item>
          </Box>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroup.Item value="en_US">
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl cursor="pointer">
                <RadioGroup.ItemIndicator />
              </RadioGroup.ItemControl>
              <RadioGroup.ItemText>{radioLabel("en_US", "English (US)")}</RadioGroup.ItemText>
            </RadioGroup.Item>
          </Box>
          <Box as="label" cursor="pointer" display="flex" alignItems="center" gap={2}>
            <RadioGroup.Item value="nl">
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemControl cursor="pointer">
                <RadioGroup.ItemIndicator />
              </RadioGroup.ItemControl>
              <RadioGroup.ItemText>{radioLabel("nl", "Nederlands")}</RadioGroup.ItemText>
            </RadioGroup.Item>
          </Box>
        </Flex>
      </RadioGroup.Root>
      <Box mt={4} mb={2}>
        <FormattedMessage id="more languages" defaultMessage="More languages" />
      </Box>
      <LanguageCombobox languages={languagesArray} value={language ?? ""} onChange={onChange} />
    </Box>
  );
};

export default SelectLanguage;
