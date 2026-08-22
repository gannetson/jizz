import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type AccessibleSheetModalProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  backdropStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Picker / sheet modal that VoiceOver can actually use.
 *
 * Nested Pressable (backdrop wrapping the sheet) makes iOS VoiceOver treat the
 * whole sheet as one control, so list rows never activate. Keep the dismiss
 * layer behind the sheet and mark the sheet as a modal view.
 */
export function AccessibleSheetModal({
  visible,
  onClose,
  children,
  backdropStyle,
  contentStyle,
}: AccessibleSheetModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, backdropStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        />
        <View style={[styles.content, contentStyle]} accessibilityViewIsModal>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    padding: 16,
  },
});

export default AccessibleSheetModal;
