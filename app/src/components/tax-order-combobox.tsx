import React, { useMemo } from "react";
import ReactSelect, { StylesConfig } from "react-select";
import { Box } from "@chakra-ui/react";
import { useIntl } from "react-intl";
import { checklistSelectStyles } from "./checklist/checklist-select-styles";

export type TaxOrderOption = { tax_order: string; count: number };

interface OptionType {
  label: string;
  value: string;
}

interface TaxOrderComboboxProps {
  taxOrders: TaxOrderOption[];
  value: string | undefined;
  onChange: (taxOrder: string | undefined) => void;
  placeholder?: string;
  /** When true, first option clears the filter (checklist). Game setup omits this. */
  allowAll?: boolean;
  size?: 'default' | 'large';
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

export const TaxOrderCombobox = ({
  taxOrders,
  value,
  onChange,
  placeholder,
  allowAll = false,
  size = 'default',
}: TaxOrderComboboxProps) => {
  const intl = useIntl();

  const options = useMemo(() => {
    const rows: OptionType[] = taxOrders.map((row) => ({
      label: `${row.tax_order} (${row.count})`,
      value: row.tax_order,
    }));
    rows.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    if (!allowAll) return rows;
    return [
      {
        label: intl.formatMessage({ id: "checklist_order_all", defaultMessage: "All orders" }),
        value: "",
      },
      ...rows,
    ];
  }, [taxOrders, intl, allowAll]);

  const selectedOption = useMemo(() => {
    if (allowAll && (value == null || value === "")) {
      return options.find((o) => o.value === "") ?? null;
    }
    if (value == null || value === "") return null;
    return options.find((o) => o.value === value) ?? null;
  }, [options, value, allowAll]);

  return (
    <Box>
      <ReactSelect<OptionType>
        options={options}
        value={selectedOption}
        onChange={(option) => {
          const v = option?.value ?? "";
          onChange(v ? v : undefined);
        }}
        isSearchable
        isClearable={!allowAll}
        placeholder={
          placeholder ??
          intl.formatMessage({ id: "checklist_select_order", defaultMessage: "Select order..." })
        }
        noOptionsMessage={() =>
          intl.formatMessage({ id: "no options found", defaultMessage: "No options found" })
        }
        styles={size === 'large' ? checklistSelectStyles<OptionType>() : defaultStyles}
      />
    </Box>
  );
};

export default TaxOrderCombobox;
