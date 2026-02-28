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
  Image,
  Platform,
  BackHandler,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMenu } from '../context/MenuContext';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PANEL_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 340);

const USER_MENU_ITEMS: { route: string; label: string }[] = [
  { route: 'MyGames', label: 'My Games' },
  { route: 'Settings', label: 'Profile' },
  { route: 'MediaReview', label: 'Review media' },
];

export function UserMenuModal() {
  const navigation = useNavigation();
  const { userMenuVisible, closeUserMenu } = useMenu();
  const { isAuthenticated, logout } = useAuth();
  const { profile, avatarUrl, initials } = useProfile();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(PANEL_WIDTH)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: userMenuVisible ? 0 : PANEL_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [userMenuVisible, slideAnim]);

  const handleItem = (route: string) => {
    closeUserMenu();
    (navigation as any).navigate(route);
  };

  const handleExit = () => {
    closeUserMenu();
    if (Platform.OS === 'android') {
      BackHandler.exitApp();
    }
  };

  return (
    <Modal
      visible={userMenuVisible}
      transparent
      animationType="none"
      onRequestClose={closeUserMenu}
    >
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={closeUserMenu} />
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
            <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: Math.max(56, insets.top) }]}>
              <Text style={styles.sectionTitle}>Account</Text>
              {!isAuthenticated ? (
                <>
                  <TouchableOpacity style={styles.menuItem} onPress={() => handleItem('Login')}>
                    <Text style={styles.menuLabel}>Login</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuItem} onPress={() => handleItem('Register')}>
                    <Text style={styles.menuLabel}>Register</Text>
                  </TouchableOpacity>
                  <View style={styles.separator} />
                  <Text style={styles.hint}>
                    Login to save your progress and compete on leaderboards
                  </Text>
                </>
              ) : (
                <View style={styles.userSummary}>
                  <View style={styles.userAvatarWrap}>
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.userAvatar} />
                    ) : (
                      <View style={styles.userInitialsCircle}>
                        <Text style={styles.userInitialsText}>{initials || '?'}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.userName} numberOfLines={1}>
                    {profile?.username || profile?.email || 'Logged in'}
                  </Text>
                  <Text style={styles.hint}>You are logged in.</Text>
                </View>
              )}
              {USER_MENU_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.route}
                  style={styles.menuItem}
                  onPress={() => handleItem(item.route)}
                >
                  <Text style={styles.menuLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
              <View style={styles.separator} />
              {isAuthenticated ? (
                <TouchableOpacity
                  style={[styles.menuItem, styles.logout]}
                  onPress={async () => {
                    await logout();
                    closeUserMenu();
                    (navigation as any).navigate('Home');
                  }}
                >
                  <Text style={styles.logoutLabel}>Logout</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.menuItem, styles.logout]}
                  onPress={() => {
                    closeUserMenu();
                    (navigation as any).navigate('Home');
                  }}
                >
                  <Text style={styles.logoutLabel}>Close</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.menuItem, styles.exitItem]}
                onPress={handleExit}
              >
                <Text style={styles.exitLabel}>Exit</Text>
              </TouchableOpacity>
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
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary[800],
    marginBottom: 16,
  },
  menuItem: {
    paddingVertical: 14,
  },
  menuLabel: {
    fontSize: 17,
    color: colors.primary[800],
  },
  logout: {
    marginTop: 8,
  },
  logoutLabel: {
    fontSize: 17,
    color: colors.error[500],
    fontWeight: '500',
  },
  exitItem: {
    marginTop: 8,
  },
  exitLabel: {
    fontSize: 17,
    color: colors.primary[600],
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: colors.primary[200],
    marginVertical: 12,
  },
  hint: {
    fontSize: 14,
    color: colors.primary[600],
    marginBottom: 8,
  },
  userSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  userAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.primary[100],
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userInitialsCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitialsText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary[50],
  },
  userName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[800],
  },
});
