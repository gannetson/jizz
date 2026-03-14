import React, { useMemo } from "react";
import ReactSelect, { StylesConfig } from "react-select";
import { Box } from "@chakra-ui/react";
import { useIntl } from "react-intl";
import { useContext } from "react";
import AppContext from "../core/app-context";
import { getLanguageDisplayName } from "../data/language-names-nl";

type Language = { code: string; name: string };

interface OptionType {
  label: string;
  value: string;
  original: Language;
}

interface LanguageComboboxProps {
  languages: Language[];
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
}

const defaultStyles: StylesConfig<OptionType, false> = {
  control: (provided, state) => ({
    ...provided,
    minHeight: "40px",
    borderColor: state.isFocused ? "var(--chakra-colors-primary-500)" : provided.borderColor,
    boxShadow: state.isFocused ? "0 0 0 1px var(--chakra-colors-primary-500)" : provided.boxShadow,
    "&:hover": { borderColor: "var(--chakra-colors-primary-500)" },
  }),
  input: (provided) => ({ ...provided, padding: "0" }),
  menuPortal: (provided) => ({ ...provided, zIndex: 9999 }),
};

export const LanguageCombobox = ({
  languages,
  value,
  onChange,
  placeholder,
}: LanguageComboboxProps) => {
  const intl = useIntl();
  const { language } = useContext(AppContext);
  const locale = language === "nl" ? "nl" : "en";

  const options = useMemo(() => {
    const withLabels = languages.map((l) => ({
      label: getLanguageDisplayName(l, locale),
      value: l.code,
      original: l,
    }));
    withLabels.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    return withLabels;
  }, [languages, locale]);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  const handleChange = (option: OptionType | null) => {
    if (option?.value) onChange(option.value);
  };

  return (
    <Box>
      <ReactSelect<OptionType>
        options={options}
        value={selectedOption}
        onChange={handleChange}
        isSearchable
        placeholder={
          placeholder ??
          intl.formatMessage({ id: "select language placeholder", defaultMessage: "Select language..." })
        }
        noOptionsMessage={() =>
          intl.formatMessage({ id: "no options found", defaultMessage: "No options found" })
        }
        styles={defaultStyles}
      />
    </Box>
  );
};

export default LanguageCombobox;
