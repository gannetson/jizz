import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { loadUpdates, Update } from '../api/updates';
import { ReactionForm } from '../components/ReactionForm';
import { FeedbackForm } from '../components/FeedbackForm';
import { colors } from '../theme';

type RootStackParamList = {
  Home: undefined;
  Start: undefined;
  Scores: undefined;
  Challenge: undefined;
  Updates: undefined;
  Help: undefined;
  Login: undefined;
};

function formatDate(s: string) {
  try {
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return s;
  }
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'Home'>>();
  const { isAuthenticated } = useAuth();
  const [updates, setUpdates] = useState<Update[]>([]);

  useEffect(() => {
    loadUpdates().then(setUpdates).catch(() => {});
  }, []);

  const appendReactionToFirstUpdate = (reaction: import('../api/updates').Reaction) => {
    setUpdates((prev) => {
      if (prev.length === 0) return prev;
      const first = prev[0];
      return [{ ...first, reactions: [...(first.reactions ?? []), reaction] }, ...prev.slice(1)];
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.welcome}>Welcome</Text>
      {!isAuthenticated && (
        <View style={styles.signUpSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.primaryButtonText}>Sign up</Text>
          </TouchableOpacity>
          <Text style={styles.signUpSubtext}>Sign up to track your progress</Text>
        </View>
      )}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('Start')}
      >
        <Text style={styles.primaryButtonText}>Start a new game</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('Challenge')}
      >
        <Text style={styles.primaryButtonText}>Country challenge</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.ghostButton}
        onPress={() => navigation.navigate('Scores')}
      >
        <Text style={styles.ghostButtonText}>High scores</Text>
      </TouchableOpacity>
      <FeedbackForm />
      {updates.length > 0 && (
        <View style={styles.updateCard}>
          <View style={styles.updateCardHeader}>
            <Text style={styles.updateCardTitle}>{updates[0].title}</Text>
          </View>
          <Text style={styles.updateCardMessage} numberOfLines={3}>{updates[0].message}</Text>
          <View style={styles.updateCardFooter}>
            <Text style={styles.updateCardMeta}>{updates[0].user?.first_name ?? 'Birdr'}</Text>
            <Text style={styles.updateCardDate}>{formatDate(updates[0].created)}</Text>
          </View>
          <View style={styles.updateCardReactions}>
            <ReactionForm update={updates[0]} onReactionPosted={appendReactionToFirstUpdate} />
          </View>
        </View>
      )}
      <TouchableOpacity
        style={styles.ghostButton}
        onPress={() => navigation.navigate('Updates')}
      >
        <Text style={styles.ghostButtonText}>More updates</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
    paddingTop: 16,
  },
  welcome: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.primary[800],
    marginBottom: 24,
  },
  signUpSection: {
    marginBottom: 24,
  },
  signUpSubtext: {
    fontSize: 14,
    color: colors.primary[600],
    textAlign: 'center',
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: colors.primary[50],
    fontSize: 16,
    fontWeight: '600',
  },
  ghostButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  ghostButtonText: {
    color: colors.primary[500],
    fontSize: 16,
  },
  updateCard: {
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: 8,
    marginVertical: 12,
    overflow: 'hidden',
  },
  updateCardHeader: {
    backgroundColor: colors.primary[200],
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  updateCardTitle: { fontSize: 16, fontWeight: '700', color: colors.primary[800] },
  updateCardMessage: { fontSize: 15, color: colors.primary[800], padding: 14, lineHeight: 22 },
  updateCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  updateCardMeta: { fontSize: 14, color: colors.primary[600] },
  updateCardDate: { fontSize: 14, fontStyle: 'italic', color: colors.primary[600] },
  updateCardReactions: { paddingHorizontal: 14, paddingBottom: 12 },
});
