import React, { useMemo, ReactNode } from "react"
import ReactSelect, { StylesConfig } from "react-select"
import { Box } from "@chakra-ui/react"
import { Species } from "../core/app-context"

type Props = {
  species: Species[]
  playerLanguage?: string | null
  onSelect: (species: Species) => void
  loading?: boolean
  autoFocus?: boolean
  placeholder?: ReactNode
  emptyMessage?: ReactNode
  loadingMessage?: ReactNode
  resetInputOnSelect?: boolean
}

const defaultPlaceholder = "Start typing your answer..."
const defaultEmptyMessage = "No options found"
const defaultLoadingMessage = "Loading..."

interface OptionType {
  label: string
  value: string
  original: Species
}

export const SpeciesCombobox = ({
  species,
  playerLanguage,
  onSelect,
  loading = false,
  autoFocus = false,
  placeholder = defaultPlaceholder,
  emptyMessage = defaultEmptyMessage,
  loadingMessage = defaultLoadingMessage,
  resetInputOnSelect = true,
}: Props) => {
  const speciesArray = Array.isArray(species) ? species : []
  
  const options = useMemo(() => {
    return speciesArray.map((speciesItem) => {
      const label = speciesItem.name_translated
      return {
        label,
        value: String(speciesItem.id ?? speciesItem.name),
        original: speciesItem,
      }
    })
  }, [speciesArray, playerLanguage])

  const handleChange = (selectedOption: OptionType | null) => {
    if (selectedOption && selectedOption.original) {
      onSelect(selectedOption.original)
    }
  }

  const placeholderText =
    typeof placeholder === "string" ? placeholder : defaultPlaceholder

  const noOptionsMessage = () => {
    if (typeof emptyMessage === "string") {
      return emptyMessage
    }
    return defaultEmptyMessage
  }

  const loadingMessageText = () => {
    if (typeof loadingMessage === "string") {
      return loadingMessage
    }
    return defaultLoadingMessage
  }

  const customStyles: StylesConfig<OptionType, false> = {
    control: (provided, state) => ({
      ...provided,
      minHeight: "40px",
      borderColor: state.isFocused ? "#3182ce" : provided.borderColor,
      boxShadow: state.isFocused ? "0 0 0 1px #3182ce" : provided.boxShadow,
      "&:hover": {
        borderColor: "#3182ce",
      },
    }),
    input: (provided) => ({
      ...provided,
      padding: "0",
    }),
    menuPortal: (provided) => ({
      ...provided,
      zIndex: 9999,
    }),
  }

  return (
    <Box>
      <ReactSelect<OptionType>
        options={options}
        onChange={handleChange}
        isLoading={loading}
        isSearchable={true}
        isClearable={false}
        placeholder={placeholderText}
        noOptionsMessage={noOptionsMessage}
        loadingMessage={loadingMessageText}
        autoFocus={autoFocus}
        styles={customStyles}
      />
    </Box>
  )
}

export default SpeciesCombobox
