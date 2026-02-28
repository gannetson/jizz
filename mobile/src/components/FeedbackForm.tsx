import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGame } from '../context/GameContext';
import { postFeedback } from '../api/feedback';
import { StarRating } from './StarRating';
import { colors } from '../theme';

const PLAYER_TOKEN_KEY = 'player-token';

export function FeedbackForm() {
  const { player } = useGame();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!rating && !comment.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = player?.token ?? (await AsyncStorage.getItem(PLAYER_TOKEN_KEY));
      const ok = await postFeedback(rating, comment.trim(), token);
      if (ok) {
        setSubmitted(true);
        setRating(0);
        setComment('');
        setTimeout(() => setSubmitted(false), 3000);
      } else {
        setError('Failed to submit feedback. Please try again.');
      }
    } catch {
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={[styles.card, styles.cardThanks]}>
        <Text style={styles.thanksTitle}>Thanks!</Text>
        <Text style={styles.thanksMessage}>Thank you for your feedback!</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Feedback</Text>
      <Text style={styles.prompt}>Do you like this app?</Text>
      <StarRating rating={rating} onRating={setRating} count={5} size={20} />
      <Text style={styles.label}>
        Comments / suggestions <Text style={styles.optional}>(optional)</Text>
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Your feedback..."
        placeholderTextColor={colors.primary[400]}
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={3}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TouchableOpacity
        style={[styles.submitBtn, (!rating && !comment.trim() || submitting) && styles.submitBtnDisabled]}
        onPress={submit}
        disabled={(!rating && !comment.trim()) || submitting}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.submitText}>Submit</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: 8,
    padding: 20,
    marginVertical: 12,
    backgroundColor: '#fff',
  },
  cardThanks: {
    backgroundColor: colors.primary[50],
  },
  title: { fontSize: 18, fontWeight: '600', color: colors.primary[800], marginBottom: 8 },
  prompt: { fontSize: 15, color: colors.primary[700], marginBottom: 12 },
  label: { fontSize: 14, color: colors.primary[700], marginTop: 12, marginBottom: 6 },
  optional: { fontStyle: 'italic', color: colors.primary[400] },
  input: {
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.primary[800],
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: { fontSize: 14, color: colors.error[500], marginTop: 8 },
  submitBtn: {
    backgroundColor: colors.primary[500],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 16,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { fontSize: 16, color: colors.primary[50], fontWeight: '600' },
  thanksTitle: { fontSize: 18, fontWeight: '600', color: colors.primary[500], marginBottom: 4 },
  thanksMessage: { fontSize: 15, color: colors.primary[700] },
});
