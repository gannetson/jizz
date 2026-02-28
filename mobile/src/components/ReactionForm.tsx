import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useGame } from '../context/GameContext';
import { postReaction } from '../api/updates';
import type { Update, Reaction } from '../api/updates';
import { ReactionLine } from './ReactionLine';
import { colors } from '../theme';

type Props = { update: Update; onReactionPosted?: (reaction: Reaction) => void };

export function ReactionForm({ update, onReactionPosted }: Props) {
  const { player } = useGame();
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [postedReaction, setPostedReaction] = useState<Reaction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const post = async () => {
    if (!update?.id || !player?.token || !message.trim()) return;
    setSubmitting(true);
    try {
      const reaction = await postReaction(update.id, player.token, message.trim());
      if (reaction) {
        setPostedReaction(reaction);
        onReactionPosted?.(reaction);
        setMessage('');
        setExpanded(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!player) return null;

  return (
    <View style={styles.wrap}>
      {(update.reactions ?? []).map((r, i) => (
        <ReactionLine key={i} reaction={r} />
      ))}
      {postedReaction && <ReactionLine reaction={postedReaction} />}
      {expanded ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Your reaction..."
            placeholderTextColor={colors.primary[400]}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
          />
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { setExpanded(false); setMessage(''); }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.postBtn, (!message.trim() || submitting) && styles.postBtnDisabled]}
              onPress={post}
              disabled={!message.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.postText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.openBtn} onPress={() => setExpanded(true)}>
          <Text style={styles.openBtnText}>Post reaction</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  form: {
    borderWidth: 1,
    borderColor: colors.primary[200],
    backgroundColor: colors.primary[50],
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    fontSize: 15,
    color: colors.primary[800],
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  cancelText: { fontSize: 16, color: colors.primary[600] },
  postBtn: {
    backgroundColor: colors.primary[500],
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  postBtnDisabled: { opacity: 0.6 },
  postText: { fontSize: 16, color: colors.primary[50], fontWeight: '600' },
  openBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: 8,
    marginTop: 4,
  },
  openBtnText: { fontSize: 16, color: colors.primary[700] },
});
