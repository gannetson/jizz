import {Box, Heading, RadioCard} from "@chakra-ui/react";
import {useContext, type ComponentType, type ReactNode} from "react";
import AppContext from "../core/app-context";
import {FormattedMessage} from "react-intl";
import {PLAY_LEVEL_ORDER, type PlayLevel} from "../core/play-level";

/** Chakra RadioCard slot typings omit `children` / conflict with Ark props; runtime is fine. */
const RcItem = RadioCard.Item as unknown as ComponentType<{
  value: string;
  w?: string;
  children?: ReactNode;
}>;
const RcItemText = RadioCard.ItemText as unknown as ComponentType<{
  children?: ReactNode;
}>;
const RcItemDescription = RadioCard.ItemDescription as unknown as ComponentType<{
  fontSize?: string;
  children?: ReactNode;
}>;

const PLAY_LEVEL_OPTIONS: {
  value: PlayLevel;
  titleId: string;
  titleDefault: string;
  subId: string;
  subDefault: string;
}[] = [
  {
    value: 'beginner',
    titleId: 'beginner',
    titleDefault: 'Beginner',
    subId: 'play_level_beginner_sub',
    subDefault: 'Very easy multiple choice · familiar species only',
  },
  {
    value: 'novice',
    titleId: 'novice',
    titleDefault: 'Novice',
    subId: 'play_level_novice_sub',
    subDefault: 'Very easy multiple choice · regular species',
  },
  {
    value: 'advanced',
    titleId: 'advanced',
    titleDefault: 'Advanced',
    subId: 'play_level_advanced_sub',
    subDefault: 'Multiple choice with similar species · regular species',
  },
  {
    value: 'pro',
    titleId: 'pro',
    titleDefault: 'Pro',
    subId: 'play_level_pro_sub',
    subDefault: 'Multiple choice with similar species · includes rare species',
  },
  {
    value: 'expert',
    titleId: 'expert',
    titleDefault: 'Expert',
    subId: 'play_level_expert_sub',
    subDefault: 'Text input (with auto complete) · includes rare species',
  },
];

const SelectLevel = () => {
  const {playLevel, setPlayLevel} = useContext(AppContext);

  return (
    <Box>
      <Heading size={'md'} mb={4}>
        <FormattedMessage id={'level'} defaultMessage={'Level'} />
      </Heading>
      <RadioCard.Root
        colorPalette="primary"
        variant="surface"
        size="md"
        value={playLevel}
        onValueChange={(details: { value: string | null }) => {
          const v = details.value as PlayLevel | null;
          if (v) setPlayLevel(v);
        }}
        w="100%"
      >
        <Box display="flex" flexDirection="column" gap={4}>
          {PLAY_LEVEL_OPTIONS.map((opt) => (
            <RcItem key={opt.value} value={opt.value} w="100%">
              <RadioCard.ItemHiddenInput />
              <RadioCard.ItemControl>
                <RadioCard.ItemContent>
                  <RcItemText>
                    <FormattedMessage id={opt.titleId} defaultMessage={opt.titleDefault} />
                  </RcItemText>
                  <RcItemDescription fontSize="xs">
                    <FormattedMessage id={opt.subId} defaultMessage={opt.subDefault} />
                  </RcItemDescription>
                </RadioCard.ItemContent>
                <RadioCard.ItemIndicator />
              </RadioCard.ItemControl>
            </RcItem>
          ))}
        </Box>
      </RadioCard.Root>
    </Box>
  );
};

export default SelectLevel;
