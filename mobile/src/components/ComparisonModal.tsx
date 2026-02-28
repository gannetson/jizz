import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { requestComparison, type SpeciesComparison } from '../api/compare';
import { colors } from '../theme';

const htmlStyle = `
  p { margin-bottom: 0.5rem; }
  ul, ol { margin-left: 1rem; margin-bottom: 0.5rem; }
  li { margin-bottom: 0.25rem; }
  strong { font-weight: bold; }
  em { font-style: italic; }
  h1, h2, h3 { font-weight: bold; margin-top: 0.75rem; margin-bottom: 0.5rem; }
`;

type ComparisonModalProps = {
  visible: boolean;
  onClose: () => void;
  species1Id: number;
  species2Id: number;
};

export function ComparisonModal({
  visible,
  onClose,
  species1Id,
  species2Id,
}: ComparisonModalProps) {
  const [comparison, setComparison] = useState<SpeciesComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !species1Id || !species2Id) {
      setComparison(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    requestComparison(species1Id, species2Id)
      .then((data) => {
        if (!cancelled) setComparison(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? 'Failed to generate comparison');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, species1Id, species2Id]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return dateString;
    }
  };

  const renderHtmlSection = (html: string | undefined, title: string) => {
    if (!html || !html.trim()) return null;
    const wrapped = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui;font-size:15px;color:#31220a;margin:0;padding:8px;}${htmlStyle}</style></head><body>${html}</body></html>`;
    return (
      <View key={title} style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <WebView
          source={{ html: wrapped }}
          style={styles.webView}
          scrollEnabled={false}
          originWhitelist={['*']}
        />
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {comparison
                ? `Comparison: ${comparison.species_1_name} vs ${comparison.species_2_name}`
                : 'Species Comparison'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary[500]} />
              <Text style={styles.loadingText}>Generating comparison...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : comparison ? (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              {renderHtmlSection(comparison.summary_html ?? comparison.summary, 'Summary')}
              {comparison.identification_tips_html && (
                <View style={styles.tipsBox}>
                  <Text style={styles.tipsTitle}>Identification tips</Text>
                  <WebView
                    source={{
                      html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"><style>body{font-family:system-ui;font-size:15px;color:#1e3a5f;margin:0;padding:8px;}${htmlStyle}</style></head><body>${comparison.identification_tips_html}</body></html>`,
                    }}
                    style={styles.webView}
                    scrollEnabled={false}
                    originWhitelist={['*']}
                  />
                </View>
              )}
              {renderHtmlSection(comparison.size_comparison_html ?? comparison.size_comparison, 'Size')}
              {renderHtmlSection(comparison.plumage_comparison_html ?? comparison.plumage_comparison, 'Plumage')}
              {renderHtmlSection(comparison.behavior_comparison_html ?? comparison.behavior_comparison, 'Behavior')}
              {renderHtmlSection(comparison.habitat_comparison_html ?? comparison.habitat_comparison, 'Habitat')}
              {renderHtmlSection(comparison.vocalization_comparison_html ?? comparison.vocalization_comparison, 'Vocalization')}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Generated using {comparison.ai_model} on {formatDate(comparison.generated_at)}
                </Text>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[200],
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary[800],
    flex: 1,
  },
  closeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[500],
  },
  loadingBox: {
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.primary[600],
  },
  errorBox: {
    padding: 16,
    backgroundColor: colors.error[50],
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.error[500],
  },
  scroll: {
    maxHeight: 500,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary[800],
    marginBottom: 8,
  },
  tipsBox: {
    backgroundColor: '#e8f0fe',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#aecbfa',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e3a5f',
    marginBottom: 8,
  },
  webView: {
    minHeight: 40,
    width: '100%',
  },
  footer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.primary[200],
  },
  footerText: {
    fontSize: 12,
    color: colors.primary[600],
  },
});
