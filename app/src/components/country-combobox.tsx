import React, { useMemo } from "react";
import ReactSelect, { StylesConfig } from "react-select";
import { Box } from "@chakra-ui/react";
import { useIntl } from "react-intl";
import { useContext } from "react";
import AppContext from "../core/app-context";
import { getCountryDisplayName } from "../data/country-names-nl";

type Country = { code: string; name: string };

interface OptionType {
  label: string;
  value: string;
  original: Country;
}

interface CountryComboboxProps {
  countries: Country[];
  value: Country | null;
  onChange: (country: Country | null) => void;
  placeholder?: string;
  /** Optional: include an "empty" option (e.g. "All countries") with code "" */
  allowEmpty?: boolean;
  emptyLabel?: string;
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

export const CountryCombobox = ({
  countries,
  value,
  onChange,
  placeholder,
  allowEmpty = false,
  emptyLabel,
}: CountryComboboxProps) => {
  const intl = useIntl();
  const { language } = useContext(AppContext);
  const locale = language === "nl" ? "nl" : "en";

  const options = useMemo(() => {
    const withLabels = countries.map((c) => ({
      label: getCountryDisplayName(c, locale),
      value: c.code,
      original: c,
    }));
    withLabels.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    if (allowEmpty) {
      const emptyOption: OptionType = {
        label: emptyLabel ?? intl.formatMessage({ id: "all countries", defaultMessage: "All countries" }),
        value: "",
        original: { code: "", name: "" },
      };
      return [emptyOption, ...withLabels];
    }
    return withLabels;
  }, [countries, locale, allowEmpty, emptyLabel, intl]);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === (value?.code ?? "")) ?? null,
    [options, value?.code]
  );

  const handleChange = (option: OptionType | null) => {
    if (option?.original && option.original.code) {
      onChange(option.original);
    } else if (allowEmpty) {
      onChange(null);
    }
  };

  return (
    <Box>
      <ReactSelect<OptionType>
        options={options}
        value={selectedOption}
        onChange={handleChange}
        isSearchable
        isClearable={allowEmpty}
        placeholder={
          placeholder ??
          intl.formatMessage({ id: "select country placeholder", defaultMessage: "Select country..." })
        }
        noOptionsMessage={() =>
          intl.formatMessage({ id: "no options found", defaultMessage: "No options found" })
        }
        styles={defaultStyles}
      />
    </Box>
  );
};

export default CountryCombobox;
