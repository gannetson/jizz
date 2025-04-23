import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { FontAwesome } from '@expo/vector-icons';
import AppContext from '../context/AppContext';

export default function DrawerContent(props: DrawerContentComponentProps) {
  const { colorMode, toggleColorMode, language, setLanguage } = useContext(AppContext);

  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.drawerContent}>
        <DrawerItemList {...props} />
        
        <View style={styles.separator} />
        
        {/* Dark Mode Toggle */}
        <View style={styles.preference}>
          <Text style={styles.preferenceText}>
            {colorMode === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </Text>
          <Switch
            value={colorMode === 'dark'}
            onValueChange={toggleColorMode}
          />
        </View>

        {/* Language Selection */}
        <View style={styles.preference}>
          <Text style={styles.preferenceText}>Language</Text>
          <View style={styles.languageButtons}>
            <TouchableOpacity
              style={[
                styles.langButton,
                language === 'en' && styles.langButtonActive,
              ]}
              onPress={() => setLanguage('en')}
            >
              <Text style={styles.langButtonText}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.langButton,
                language === 'nl' && styles.langButtonActive,
              ]}
              onPress={() => setLanguage('nl')}
            >
              <Text style={styles.langButtonText}>NL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  preference: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  preferenceText: {
    fontSize: 16,
    color: '#4A5568',
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  langButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  langButtonActive: {
    backgroundColor: '#F6AD55',
  },
  langButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 