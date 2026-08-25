import { useContext } from "react";
import AppContext from "../core/app-context";
import { Box, Heading } from "@chakra-ui/react";
import { FormattedMessage } from "react-intl";
import { UseLanguages } from "../user/use-languages";
import LanguageCombobox from "./language-combobox";

const SelectLanguage = () => {
  const { language, setLanguage } = useContext(AppContext);
  const { languages } = UseLanguages();

  const onChange = (lang: string) => {
    setLanguage?.(lang);
  };

  const languagesArray = Array.isArray(languages) ? languages : [];

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
