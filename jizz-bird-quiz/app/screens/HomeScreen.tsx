import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';


import AppContext, { Update } from '../context/AppContext';


type RootDrawerParamList = {
  Home: undefined;
  Start: undefined;
  Join: undefined;
  Challenge: undefined;
  ChallengePlay: undefined;
  Scores: undefined;
};

const HomeScreen = () => {
  const { player, loading, countryChallenge, loadCountryChallenge } = useContext(AppContext);
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const [updates, setUpdates] = useState<Update[]>([]);

  // Animation for the certificate icon
  const scaleValue = new Animated.Value(1);

  useEffect(() => {
    loadCountryChallenge();
    // You'll need to implement this
    // loadUpdates().then(setUpdates);

    // Certificate animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F6AD55" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.heading}>
          {player ? player.name : 'Welcome'}
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Start')}
          >
            <Text style={styles.buttonText}>Start a new game</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.outlineButton]}
            onPress={() => navigation.navigate('Join')}
          >
            <Text style={[styles.buttonText, styles.outlineButtonText]}>
              Join a game
            </Text>
          </TouchableOpacity>

          {countryChallenge && countryChallenge.levels?.length > 0 && (
            <TouchableOpacity
              style={[styles.button, styles.orangeButton]}
              onPress={() => navigation.navigate('ChallengePlay')}
            >
              <Text style={styles.buttonText}>
                {`Continue challenge - ${countryChallenge.country.name} - Level ${
                  countryChallenge.levels[0].challenge_level.sequence + 1
                }`}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Challenge')}
          >
            <View style={styles.challengeButton}>
              <Text style={styles.buttonText}>
                {countryChallenge
                  ? 'New country challenge'
                  : 'Country challenge'}
              </Text>
              <Animated.View
                style={[
                  styles.certificate,
                  { transform: [{ scale: scaleValue }] },
                ]}
              >
                <FontAwesome
                  name="certificate"
                  size={50}
                  color="#C05621"
                />
                <Text style={styles.certificateText}>10 levels</Text>
              </Animated.View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.ghostButton]}
            onPress={() => navigation.navigate('Scores')}
          >
            <Text style={[styles.buttonText, styles.ghostButtonText]}>
              High scores
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 24,
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    backgroundColor: '#4A5568',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4A5568',
  },
  outlineButtonText: {
    color: '#4A5568',
  },
  orangeButton: {
    backgroundColor: '#F6AD55',
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  ghostButtonText: {
    color: '#4A5568',
  },
  challengeButton: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  certificate: {
    position: 'absolute',
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certificateText: {
    position: 'absolute',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default HomeScreen; 