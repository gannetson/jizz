import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { loadCountries, type Country } from '../api/countries';
import { useTranslation } from '../i18n/TranslationContext';
import { getCountryDisplayName } from '../i18n/countryNames';
import { colors } from '../theme';
import { AccessibleSheetModal } from './AccessibleSheetModal';

export type CountrySelectProps = {
  value: Country | null;
  onChange: (country: Country | null) => void;
  /** If omitted, countries are loaded from the API. */
  countries?: Country[];
  allowEmpty?: boolean;
  emptyLabel?: string;
  placeholder?: string;
  /** Modal title. Defaults to select-country copy. */
  title?: string;
  /** Filter out regional codes like NL-NH (default true). */
  excludeRegionCodes?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  buttonStyle?: StyleProp<ViewStyle>;
  buttonTextStyle?: StyleProp<TextStyle>;
  /** Custom trigger instead of the default select button. */
  renderTrigger?: (props: {
    open: () => void;
    label: string;
    value: Country | null;
  }) => React.ReactNode;
};

/**
 * Searchable country combobox used across the app.
 * Opens a bottom sheet with search by localized country name.
 */
export function CountrySelect({
  value,
  onChange,
  countries: countriesProp,
  allowEmpty = false,
  emptyLabel,
  placeholder,
  title,
  excludeRegionCodes = true,
  testID,
  style,
  buttonStyle,
  buttonTextStyle,
  renderTrigger,
}: CountrySelectProps) {
  const { t, locale } = useTranslation();
  const [loadedCountries, setLoadedCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(!countriesProp);
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (countriesProp) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadCountries()
      .then((list) => {
        if (!cancelled) setLoadedCountries(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setLoadedCountries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [countriesProp]);

  const countries = useMemo(() => {
    const source = countriesProp ?? loadedCountries;
    if (!excludeRegionCodes) return source;
    return source.filter((c) => !c.code.includes('NL-NH'));
  }, [countriesProp, loadedCountries, excludeRegionCodes]);

  const sortedCountries = useMemo(
    () =>
      [...countries].sort((a, b) =>
        getCountryDisplayName(a, locale).localeCompare(
          getCountryDisplayName(b, locale),
          undefined,
          { sensitivity: 'base' }
        )
      ),
    [countries, locale]
  );

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return sortedCountries;
    const q = search.trim().toLowerCase();
    return sortedCountries.filter((c) => {
      const label = getCountryDisplayName(c, locale).toLowerCase();
      return label.includes(q) || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
    });
  }, [sortedCountries, search, locale]);

  const listData = useMemo(() => {
    if (!allowEmpty) return filteredCountries;
    const empty: Country = { code: '', name: emptyLabel ?? t('all_countries') };
    return [empty, ...filteredCountries];
  }, [allowEmpty, emptyLabel, filteredCountries, t]);

  const displayLabel = value
    ? getCountryDisplayName(value, locale)
    : allowEmpty
      ? emptyLabel ?? t('all_countries')
      : placeholder ?? t('select_country_dots');

  const closeModal = () => {
    setModalVisible(false);
    setSearch('');
  };

  const handleSelect = (item: Country) => {
    if (!item.code) {
      onChange(null);
    } else {
      onChange(item);
    }
    closeModal();
  };

  return (
    <View style={style}>
      {renderTrigger ? (
        renderTrigger({ open: () => setModalVisible(true), label: displayLabel, value })
      ) : (
        <TouchableOpacity
          style={[styles.selectButton, buttonStyle]}
          onPress={() => setModalVisible(true)}
          testID={testID}
          accessible
          accessibilityRole="button"
          accessibilityState={{ expanded: modalVisible }}
          accessibilityLabel={`${title ?? t('select_country')}, ${displayLabel}`}
          accessibilityHint={t('select_country_hint')}
        >
          {loading && !value ? (
            <ActivityIndicator size="small" color={colors.primary[500]} />
          ) : (
            <Text
              style={[
                styles.selectButtonText,
                !value && !allowEmpty && styles.placeholderText,
                buttonTextStyle,
              ]}
              numberOfLines={1}
              accessible={false}
            >
              {displayLabel}
            </Text>
          )}
        </TouchableOpacity>
      )}

      <AccessibleSheetModal visible={modalVisible} onClose={closeModal}>
        <Text style={styles.modalTitle} accessibilityRole="header">
          {title ?? t('select_country')}
        </Text>
        <TextInput
          style={styles.searchInput}
          placeholder={t('search')}
          placeholderTextColor={colors.primary[400]}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          accessibilityLabel={t('search')}
          accessibilityRole="search"
        />
        {loading && !countriesProp ? (
          <ActivityIndicator size="small" color={colors.primary[500]} style={styles.loader} />
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(item) => item.code || '_empty'}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const selected = item.code
                ? value?.code === item.code
                : !value;
              const label = item.code
                ? getCountryDisplayName(item, locale)
                : item.name;
              return (
                <TouchableOpacity
                  style={[styles.modalItem, selected && styles.modalItemSelected]}
                  onPress={() => handleSelect(item)}
                  accessible
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={
                    selected ? `${label}, ${t('picker_item_selected')}` : label
                  }
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selected && styles.modalItemTextSelected,
                    ]}
                    accessible={false}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>{t('no_options_found')}</Text>
            }
          />
        )}
        <TouchableOpacity
          style={styles.modalClose}
          onPress={closeModal}
          accessible
          accessibilityRole="button"
          accessibilityLabel={t('close')}
        >
          <Text style={styles.modalCloseText} accessible={false}>
            {t('close')}
          </Text>
        </TouchableOpacity>
      </AccessibleSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  selectButton: {
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    minHeight: 48,
    justifyContent: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    color: colors.primary[800],
  },
  placeholderText: {
    color: colors.primary[500],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary[800],
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    fontSize: 16,
    color: colors.primary[800],
  },
  loader: {
    marginVertical: 24,
  },
  modalItem: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.primary[100],
  },
  modalItemSelected: {
    backgroundColor: colors.primary[50],
  },
  modalItemText: {
    fontSize: 16,
    color: colors.primary[800],
  },
  modalItemTextSelected: {
    fontWeight: '700',
    color: colors.primary[700],
  },
  emptyText: {
    fontSize: 14,
    color: colors.primary[600],
    textAlign: 'center',
    paddingVertical: 24,
  },
  modalClose: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: colors.primary[500],
    fontWeight: '600',
  },
});

export default CountrySelect;
