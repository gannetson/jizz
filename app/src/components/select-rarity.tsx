import {useContext, type ComponentType, type ReactNode} from "react";
import AppContext from "../core/app-context";
import {Box, Flex, Heading, RadioCard} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"

export type Rarity = 'familiar' | 'regular' | 'exceptional'

const RARITY_OPTIONS: { value: Rarity; messageId: string; defaultMessage: string }[] = [
  { value: 'familiar', messageId: 'rarity familiar', defaultMessage: 'Familiar' },
  { value: 'regular', messageId: 'rarity regular', defaultMessage: 'Regular' },
  { value: 'exceptional', messageId: 'rarity exceptional', defaultMessage: 'Exceptional' },
]

const RcItem = RadioCard.Item as unknown as ComponentType<{
  value: string;
  children?: ReactNode;
}>;
const RcItemText = RadioCard.ItemText as unknown as ComponentType<{
  children?: ReactNode;
}>;

function RarityRadioOption({ messageId, defaultMessage, value }: {
  value: Rarity;
  messageId: string;
  defaultMessage: string;
}) {
  return (
    <RcItem value={value}>
      <RadioCard.ItemHiddenInput />
      <RadioCard.ItemControl>
        <RadioCard.ItemContent>
          <RcItemText>
            <FormattedMessage id={messageId} defaultMessage={defaultMessage}/>
          </RcItemText>
        </RadioCard.ItemContent>
        <RadioCard.ItemIndicator />
      </RadioCard.ItemControl>
    </RcItem>
  );
}

export const SelectRarity = () => {
  const { rarity, setRarity } = useContext(AppContext);

  return (
    <Box>
      <Heading size={'md'} mb={4}>
        <FormattedMessage defaultMessage={'Species rarity'} id={'Species rarity'}/>
      </Heading>
      <RadioCard.Root
        colorPalette="primary"
        variant="surface"
        size="md"
        value={rarity}
        onValueChange={(details: { value: string | null }) => {
          const v = details.value as Rarity | null;
          if (v) setRarity(v);
        }}
      >
        <Flex direction="row" gap={2} flexWrap="wrap">
          {RARITY_OPTIONS.map((opt) => (
            <RarityRadioOption
              key={opt.value}
              value={opt.value}
              messageId={opt.messageId}
              defaultMessage={opt.defaultMessage}
            />
          ))}
        </Flex>
      </RadioCard.Root>
    </Box>
  )
};
