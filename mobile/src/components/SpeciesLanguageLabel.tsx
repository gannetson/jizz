import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { colors } from '../theme';
import { SCIENTIFIC_LANGUAGE_CODE } from '../i18n/languageNames';

type Props = {
  code: string;
  label: string;
  selected?: boolean;
  textStyle?: StyleProp<TextStyle>;
};

/** Species-language label; Scientific (Latin) is italic so it stands out. */
export function SpeciesLanguageLabel({ code, label, selected, textStyle }: Props) {
  const color = selected ? colors.primary[700] : colors.primary[800];
  return (
    <Text
      style={[
        { fontSize: 16, color },
        code === SCIENTIFIC_LANGUAGE_CODE ? { fontStyle: 'italic' } : null,
        textStyle,
      ]}
    >
      {label}
    </Text>
  );
}
