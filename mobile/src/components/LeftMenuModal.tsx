import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMenu } from '../context/MenuContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 340);

const MENU_ITEMS: { route: string; label: string }[] = [
  { route: 'Home', label: 'Home' },
  { route: 'Start', label: 'New game' },
  { route: 'Scores', label: 'High scores' },
  { route: 'Challenge', label: 'Country challenge' },
  { route: 'DailyChallenge', label: 'Daily challenge' },
  { route: 'Updates', label: 'Updates' },
  { route: 'Help', label: 'Help' },
  { route: 'Privacy', label: 'Privacy' },
  { route: 'About', label: 'About Birdr' },
];

export function LeftMenuModal() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { leftMenuVisible, closeLeftMenu, currentRouteName } = useMenu();
  const slideAnim = useRef(new Animated.Value(-PANEL_WIDTH)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: leftMenuVisible ? 0 : -PANEL_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [leftMenuVisible, slideAnim]);

  const handleItem = (routeName: string) => {
    closeLeftMenu();
    if (routeName === 'Privacy') {
      (navigation as any).navigate('HelpDetail', { slug: 'privacy' });
    } else if (routeName === 'About') {
      (navigation as any).navigate('HelpDetail', { slug: 'about' });
    } else {
      (navigation as any).navigate(routeName);
    }
  };

  const currentRoute = currentRouteName;

  return (
    <Modal
      visible={leftMenuVisible}
      transparent
      animationType="none"
      onRequestClose={closeLeftMenu}
    >
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={closeLeftMenu} />
        <Animated.View
          style={[
            styles.panel,
            {
              width: PANEL_WIDTH,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={(e) => e.stopPropagation()}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.content, { paddingTop: Math.max(24, insets.top) }]}
            >
              {MENU_ITEMS.map((item) => {
                const isFocused = currentRoute === item.route;
                return (
                  <TouchableOpacity
                    key={item.route}
                    style={[styles.item, isFocused && styles.itemFocused]}
                    onPress={() => handleItem(item.route)}
                  >
                    <Text style={[styles.label, isFocused && styles.labelFocused]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Data: eBird</Text>
                <Text style={styles.footerText}>Media: iNaturalist, Wikimedia, GBIF, EOL, Observation.org, Xeno-Canto</Text>
                <Text style={styles.footerText}>Developed by GoedLoek</Text>
                <Text style={styles.footerText}>Contact: info@goedloek.nl</Text>
              </View>
            </ScrollView>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  itemFocused: {
    backgroundColor: colors.primary[100],
    borderRadius: 8,
  },
  label: {
    fontSize: 18,
    color: colors.primary[800],
  },
  labelFocused: {
    fontWeight: '600',
  },
  footer: {
    paddingVertical: 24,
    marginTop: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.primary[200],
  },
  footerText: {
    fontSize: 12,
    color: colors.primary[600],
    marginBottom: 4,
  },
});
