import { useMemo, useState, ReactNode } from "react"
import { Box, Combobox, Portal, Spinner, createListCollection } from "@chakra-ui/react"
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
  const [inputValue, setInputValue] = useState("")

  const items = useMemo(() => {
    return species.map((speciesItem, index) => {
      const isDutch = playerLanguage === "nl"
      const label = isDutch ? speciesItem.name_nl || speciesItem.name : speciesItem.name
      return {
        label,
        value: String(speciesItem.id ?? speciesItem.name),
        original: speciesItem,
        index,
      }
    })
  }, [species, playerLanguage])

  const collection = useMemo(() => {
    const filteredItems = items.filter((item) =>
      item.label.toLowerCase().includes(inputValue.toLowerCase())
    )
    return createListCollection({ items: filteredItems })
  }, [items, inputValue])

  const handleValueChange = (details: { value: string[] }) => {
    const selectedValue = details.value[0]
    const selectedSpecies = species.find(
      (item) => String(item.id ?? item.name) === selectedValue
    )
    if (selectedSpecies) {
      onSelect(selectedSpecies)
      if (resetInputOnSelect) setInputValue("")
    }
  }

  const placeholderText =
    typeof placeholder === "string" ? placeholder : defaultPlaceholder

  return (
    <Combobox.Root
      collection={collection}
      value={[]} // keep uncontrolled selection in the popup
      inputValue={inputValue}
      onInputValueChange={(event: { value: string }) => setInputValue(event.value)}
      onValueChange={handleValueChange}
      disabled={loading}
    >
      <Combobox.Control position="relative">
        <Combobox.Input autoFocus={autoFocus} placeholder={placeholderText} />
        <Combobox.Trigger>
          <Combobox.Indicator />
        </Combobox.Trigger>

        {loading && (
          <Box position="absolute" right="8px" top="50%" transform="translateY(-50%)" zIndex={1}>
            <Spinner size="sm" />
          </Box>
        )}
      </Combobox.Control>

      <Portal>
        <Combobox.Positioner>
          <Combobox.Content>
            {loading ? (
              <Box p={2} textAlign="center" color="gray.500">
                {loadingMessage}
              </Box>
            ) : collection.items.length === 0 ? (
              <Box p={2} textAlign="center" color="gray.500">
                {emptyMessage}
              </Box>
            ) : (
              <Combobox.ItemGroup>
                {collection.items.map((item: any) => (
                  <Combobox.Item key={item.value} item={item}>
                    <Combobox.ItemText>{item.label}</Combobox.ItemText>
                    <Combobox.ItemIndicator />
                  </Combobox.Item>
                ))}
              </Combobox.ItemGroup>
            )}
          </Combobox.Content>
        </Combobox.Positioner>
      </Portal>
    </Combobox.Root>
  )
}

export default SpeciesCombobox
