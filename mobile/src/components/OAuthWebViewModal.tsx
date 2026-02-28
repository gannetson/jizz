import React, { useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../theme';

type OAuthWebViewModalProps = {
  visible: boolean;
  authUrl: string;
  onClose: () => void;
  onRedirect: (url: string) => Promise<boolean>;
};

const REDIRECT_PREFIX = 'birdr://auth/';

export function OAuthWebViewModal({
  visible,
  authUrl,
  onClose,
  onRedirect,
}: OAuthWebViewModalProps) {
  const webViewRef = useRef<WebView>(null);

  const handleNavigationStateChange = async (navState: { url: string }) => {
    const url = navState?.url || '';
    if (url.startsWith(REDIRECT_PREFIX)) {
      const handled = await onRedirect(url);
      if (handled) {
        onClose();
      }
    }
  };

  const handleShouldStartLoadWithRequest = (request: { url: string }) => {
    if (request.url.startsWith(REDIRECT_PREFIX)) {
      onRedirect(request.url).then((handled) => {
        if (handled) onClose();
      });
      return false;
    }
    return true;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <WebView
          ref={webViewRef}
          source={{ uri: authUrl }}
          style={styles.webview}
          onNavigationStateChange={handleNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary[500]} />
            </View>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[200],
  },
  closeButton: { padding: 8 },
  closeText: { fontSize: 17, color: colors.primary[600], fontWeight: '500' },
  webview: { flex: 1 },
  loadingWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
