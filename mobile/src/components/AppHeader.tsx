import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMenu } from '../context/MenuContext';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

type AppHeaderProps = {
  title: string;
  routeName?: string;
};

export function AppHeader({ title, routeName }: AppHeaderProps) {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, undefined>, string>>();
  const { openUserMenu, openLeftMenu, setCurrentRouteName } = useMenu();
  const { isAuthenticated } = useAuth();
  const { avatarUrl, initials } = useProfile();
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (routeName) setCurrentRouteName(routeName);
  }, [routeName, setCurrentRouteName]);

  const renderUserIcon = () => {
    if (!isAuthenticated) {
      return <Text style={styles.icon}>👤</Text>;
    }
    if (avatarUrl) {
      return <Image source={{ uri: avatarUrl }} style={styles.avatar} />;
    }
    return (
      <View style={styles.initialsCircle}>
        <Text style={styles.initialsText}>{initials}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(12, insets.top) }]}>
      <TouchableOpacity
        style={styles.sideButton}
        onPress={openLeftMenu}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.icon}>☰</Text>
      </TouchableOpacity>
      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.sideButton}
        onPress={openUserMenu}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        {renderUserIcon()}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 12,
    backgroundColor: colors.primary[200],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.primary[300],
  },
  sideButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary[800],
  },
  icon: {
    fontSize: 22,
    color: colors.primary[800],
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[100],
  },
  initialsCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
