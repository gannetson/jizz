import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from '../i18n/TranslationContext';
import { flagMediaAsReview } from '../api/flagMedia';
import { colors } from '../theme';

const CHECKBOX_KEYS = [
  'wrong_species',
  'no_bird_visible',
  'multiple_species',
  'chick_egg_nest_corpse',
  'poor_quality',
] as const;

type CheckboxKey = (typeof CHECKBOX_KEYS)[number];

export type FlagMediaInfo = {
  id: number;
  type?: 'image' | 'video' | 'audio';
  url?: string;
  link?: string | null;
  contributor?: string | null;
  index?: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  media: FlagMediaInfo | null;
  playerToken: string | undefined;
  onSuccess?: () => void;
};

export function FlagMediaModal({ visible, onClose, media, playerToken, onSuccess }: Props) {
  const { t } = useTranslation();
  const [checkboxes, setCheckboxes] = useState<Record<CheckboxKey, boolean>>({
    wrong_species: false,
    no_bird_visible: false,
    multiple_species: false,
    chick_egg_nest_corpse: false,
    poor_quality: false,
  });
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setMessage('');
      setCheckboxes({
        wrong_species: false,
        no_bird_visible: false,
        multiple_species: false,
        chick_egg_nest_corpse: false,
        poor_quality: false,
      });
    }
  }, [visible]);

  const getCheckboxLabel = (key: CheckboxKey): string => {
    const map: Record<CheckboxKey, string> = {
      wrong_species: t('wrong_species'),
      no_bird_visible: t('no_bird_visible'),
      multiple_species: t('multiple_species'),
      chick_egg_nest_corpse: t('chick_egg_nest_corpse'),
      poor_quality: t('poor_quality'),
    };
    return map[key];
  };

  const toggle = (key: CheckboxKey) => {
    setCheckboxes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    if (!media?.id) {
      onClose();
      return;
    }
    const labels: string[] = [];
    CHECKBOX_KEYS.forEach((key) => {
      if (checkboxes[key]) labels.push(getCheckboxLabel(key));
    });
    const parts: string[] = [];
    if (labels.length > 0) parts.push(`Issues: ${labels.join(' | ')}`);
    if (message.trim()) parts.push(`Additional notes: ${message.trim()}`);
    const description = parts.join('\n\n');

    setSubmitting(true);
    try {
      await flagMediaAsReview(media.id, playerToken, description);
      onSuccess?.();
      onClose();
    } catch {
      // Could show alert with t('problem_flagging')
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboard}
          >
            <TouchableWithoutFeedback>
              <View style={styles.card}>
                <Text style={styles.title}>{t('flag_media_title')}</Text>
                <Text style={styles.description}>{t('flag_modal_description')}</Text>

                <ScrollView style={styles.checkboxList} keyboardShouldPersistTaps="handled">
                  {CHECKBOX_KEYS.map((key) => (
                    <TouchableOpacity
                      key={key}
                      style={styles.checkboxRow}
                      onPress={() => toggle(key)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, checkboxes[key] && styles.checkboxChecked]}>
                        {checkboxes[key] ? <Text style={styles.checkmark}>✓</Text> : null}
                      </View>
                      <Text style={styles.checkboxLabel}>{getCheckboxLabel(key)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.hint}>{t('flag_description_explanation')}</Text>
                <TextInput
                  style={styles.input}
                  value={message}
                  onChangeText={setMessage}
                  placeholder={t('flag_description')}
                  placeholderTextColor={colors.primary[500]}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.footer}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                    <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.flagBtn, submitting && styles.flagBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                  >
                    <Text style={styles.flagBtnText}>{submitting ? '…' : t('flag')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  keyboard: { width: '100%', maxWidth: 400 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    maxHeight: '85%',
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  description: { fontSize: 14, color: colors.primary[700], marginBottom: 16 },
  checkboxList: { maxHeight: 220 },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.primary[200],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.primary[500],
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary[500] },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  checkboxLabel: { flex: 1, fontSize: 14, color: colors.primary[800] },
  hint: { fontSize: 12, color: colors.primary[600], marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.primary[800],
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  cancelBtnText: { color: colors.primary[600], fontSize: 16 },
  flagBtn: {
    backgroundColor: colors.primary[500],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  flagBtnDisabled: { opacity: 0.6 },
  flagBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
