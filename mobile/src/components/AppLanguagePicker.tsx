import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { APP_LOCALES, APP_LOCALE_LABELS, type AppLocale } from '../i18n/appLocales';
import { colors } from '../theme';

type AppLanguagePickerProps = {
  value: string;
  onChange: (locale: AppLocale) => void;
};

export function AppLanguagePicker({ value, onChange }: AppLanguagePickerProps) {
  return (
    <View style={styles.chips}>
      {APP_LOCALES.map((locale) => {
        const selected = value === locale;
        return (
          <TouchableOpacity
            key={locale}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onChange(locale)}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {APP_LOCALE_LABELS[locale]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary[300],
    backgroundColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  chipText: {
    fontSize: 14,
    color: colors.primary[800],
  },
  chipTextSelected: {
    color: colors.primary[50],
    fontWeight: '600',
  },
});
