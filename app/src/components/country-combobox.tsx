import React, { useMemo } from "react";
import ReactSelect, { StylesConfig } from "react-select";
import { Box } from "@chakra-ui/react";
import { useIntl } from "react-intl";
import { useContext } from "react";
import AppContext from "../core/app-context";
import { getCountryDisplayName } from "../data/country-names-nl";
import { checklistSelectStyles } from "./checklist/checklist-select-styles";

type Country = { code: string; name: string };

interface OptionType {
  label: string;
  value: string;
  original: Country;
  /** Extra searchable text (English API name + code). */
  searchText: string;
}

interface CountryComboboxProps {
  countries: Country[];
  value: Country | null;
  onChange: (country: Country | null) => void;
  placeholder?: string;
  /** Optional: include an "empty" option (e.g. "All countries") with code "" */
  allowEmpty?: boolean;
  emptyLabel?: string;
  /** Taller control + primary.500 selected option (checklist sidebar). */
  size?: 'default' | 'large';
  /** Filter out regional codes like NL-NH (default false to preserve existing call sites). */
  excludeRegionCodes?: boolean;
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
  menu: (provided) => ({ ...provided, zIndex: 9999 }),
  menuPortal: (provided) => ({ ...provided, zIndex: 9999 }),
};

/**
 * Searchable country combobox used across the web app.
 * Search matches localized display name, English API name, and country code.
 */
export const CountryCombobox = ({
  countries,
  value,
  onChange,
  placeholder,
  allowEmpty = false,
  emptyLabel,
  size = 'default',
  excludeRegionCodes = false,
}: CountryComboboxProps) => {
  const intl = useIntl();
  const { language } = useContext(AppContext);
  const locale = language === "nl" ? "nl" : "en";

  const options = useMemo(() => {
    const source = excludeRegionCodes
      ? countries.filter((c) => !c.code.includes("NL-NH"))
      : countries;
    const withLabels = source.map((c) => {
      const label = getCountryDisplayName(c, locale);
      return {
        label,
        value: c.code,
        original: c,
        searchText: `${label} ${c.name} ${c.code}`.toLowerCase(),
      };
    });
    withLabels.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    if (allowEmpty) {
      const emptyOption: OptionType = {
        label: emptyLabel ?? intl.formatMessage({ id: "all countries", defaultMessage: "All countries" }),
        value: "",
        original: { code: "", name: "" },
        searchText: (emptyLabel ?? "all countries").toLowerCase(),
      };
      return [emptyOption, ...withLabels];
    }
    return withLabels;
  }, [countries, locale, allowEmpty, emptyLabel, intl, excludeRegionCodes]);

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

  const filterOption = (option: { data: OptionType }, rawInput: string) => {
    const q = rawInput.trim().toLowerCase();
    if (!q) return true;
    return option.data.searchText.includes(q);
  };

  const styles =
    size === 'large'
      ? checklistSelectStyles<OptionType>()
      : defaultStyles;

  return (
    <Box position="relative" zIndex={1}>
      <ReactSelect<OptionType>
        options={options}
        value={selectedOption}
        onChange={handleChange}
        filterOption={filterOption}
        isSearchable
        isClearable={allowEmpty}
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
        menuPosition="fixed"
        placeholder={
          placeholder ??
          intl.formatMessage({ id: "select country placeholder", defaultMessage: "Select country..." })
        }
        noOptionsMessage={() =>
          intl.formatMessage({ id: "no options found", defaultMessage: "No options found" })
        }
        styles={styles}
      />
    </Box>
  );
};

export default CountryCombobox;
