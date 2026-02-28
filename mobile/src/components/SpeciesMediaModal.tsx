import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Video, Audio, ResizeMode } from 'expo-av';
import { MediaCredits } from './MediaCredits';
import { FlagMediaModal, type FlagMediaInfo } from './FlagMediaModal';
import { apiUrl } from '../api/config';
import { getMedia, type MediaItem } from '../api/media';
import { colors } from '../theme';
import { usePulsatingAnimation } from '../hooks/usePulsatingAnimation';

type MediaEntry = {
  id?: number;
  url: string;
  link?: string | null;
  contributor?: string | null;
  source?: string | null;
};

export type SpeciesMediaData = {
  id: number;
  name?: string;
  name_nl?: string;
  name_latin?: string;
  name_translated?: string;
  images?: MediaEntry[];
  videos?: MediaEntry[];
  sounds?: MediaEntry[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  species: SpeciesMediaData | null;
  language?: string;
  playerToken?: string;
};

type TabKey = 'images' | 'videos' | 'sounds';

function resolveUrl(url: string): string {
  if (url.startsWith('http')) return url;
  return apiUrl(url);
}

function speciesTitle(s: SpeciesMediaData, lang?: string): string {
  if (s.name_translated) return s.name_translated;
  if (lang === 'nl' && s.name_nl) return s.name_nl;
  if (lang === 'la' && s.name_latin) return s.name_latin;
  return s.name || s.name_latin || `Species ${s.id}`;
}

function AudioPlayer({ uri }: { uri: string }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const pulsatingStyle = usePulsatingAnimation(playing);

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync().catch(() => {});
    };
  }, [sound]);

  const toggle = async () => {
    try {
      if (playing && sound) {
        await sound.pauseAsync();
        setPlaying(false);
        return;
      }
      if (sound) {
        await sound.playAsync();
        setPlaying(true);
        return;
      }
      const { sound: s } = await Audio.Sound.createAsync({ uri });
      s.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) setPlaying(false);
      });
      setSound(s);
      await s.playAsync();
      setPlaying(true);
    } catch (_) {}
  };

  return (
    <Animated.View style={playing && pulsatingStyle}>
      <TouchableOpacity
        style={[styles.audioBtn, playing && styles.audioBtnPlaying]}
        onPress={toggle}
      >
        <Text style={[styles.audioBtnText, playing && styles.audioBtnTextPlaying]}>
          {playing ? '⏸  Pause' : '▶  Play'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function SpeciesMediaModal({ visible, onClose, species, language, playerToken }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('images');
  const [fetched, setFetched] = useState<{ images: MediaEntry[]; videos: MediaEntry[]; sounds: MediaEntry[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [flagMedia, setFlagMedia] = useState<FlagMediaInfo | null>(null);

  const hasInlineMedia = species &&
    ((species.images && species.images.length > 0) ||
     (species.videos && species.videos.length > 0) ||
     (species.sounds && species.sounds.length > 0));

  const images = hasInlineMedia ? (species!.images ?? []) : (fetched?.images ?? []);
  const videos = hasInlineMedia ? (species!.videos ?? []) : (fetched?.videos ?? []);
  const sounds = hasInlineMedia ? (species!.sounds ?? []) : (fetched?.sounds ?? []);

  const fetchFallback = useCallback(async (speciesId: number) => {
    setLoading(true);
    try {
      const [imgRes, vidRes, sndRes] = await Promise.all([
        getMedia('image', 1, undefined, undefined, speciesId),
        getMedia('video', 1, undefined, undefined, speciesId),
        getMedia('audio', 1, undefined, undefined, speciesId),
      ]);
      const toEntry = (m: MediaItem): MediaEntry => ({
        id: m.id,
        url: m.url,
        link: m.link,
        contributor: m.contributor,
        source: m.source,
      });
      setFetched({
        images: imgRes.results.map(toEntry),
        videos: vidRes.results.map(toEntry),
        sounds: sndRes.results.map(toEntry),
      });
    } catch (_) {
      setFetched({ images: [], videos: [], sounds: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible && species && !hasInlineMedia) {
      fetchFallback(species.id);
    }
    if (!visible) {
      setFetched(null);
      setActiveTab('images');
      setImageErrors(new Set());
    }
  }, [visible, species?.id]);

  if (!species) return null;

  const tabCounts: Record<TabKey, number> = {
    images: images.length,
    videos: videos.length,
    sounds: sounds.length,
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'images', label: 'Images' },
    { key: 'videos', label: 'Videos' },
    { key: 'sounds', label: 'Sounds' },
  ];

  const screenWidth = Dimensions.get('window').width;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={2}>
              {speciesTitle(species, language)}
            </Text>
            {species.name_latin && language !== 'la' && (
              <Text style={styles.headerSubtitle}>{species.name_latin}</Text>
            )}
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label} ({tabCounts[tab.key]})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
          </View>
        ) : (
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {activeTab === 'images' && (
              images.length > 0 ? (
                images.map((img, idx) => (
                  <View key={idx} style={styles.mediaItem}>
                    {imageErrors.has(idx) ? (
                      <View style={[styles.imagePlaceholder, { width: screenWidth - 48 }]}>
                        <Text style={styles.placeholderText}>Image unavailable</Text>
                      </View>
                    ) : (
                      <Image
                        source={{ uri: resolveUrl(img.url) }}
                        style={[styles.mediaImage, { width: screenWidth - 48 }]}
                        resizeMode="contain"
                        onError={() => setImageErrors((prev) => new Set(prev).add(idx))}
                      />
                    )}
                    <View style={styles.mediaFooter}>
                      <MediaCredits media={img} />
                      <TouchableOpacity onPress={() => setFlagMedia({ id: img.id ?? 0, type: 'image', url: img.url, contributor: img.contributor })}>
                        <Text style={styles.flagLink}>🚩 Flag</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No images available</Text>
              )
            )}

            {activeTab === 'videos' && (
              videos.length > 0 ? (
                videos.map((vid, idx) => (
                  <View key={idx} style={styles.mediaItem}>
                    <Video
                      source={{ uri: resolveUrl(vid.url) }}
                      style={[styles.mediaVideo, { width: screenWidth - 48 }]}
                      useNativeControls
                      resizeMode={ResizeMode.CONTAIN}
                    />
                    <View style={styles.mediaFooter}>
                      <MediaCredits media={vid} />
                      <TouchableOpacity onPress={() => setFlagMedia({ id: vid.id ?? 0, type: 'video', url: vid.url, contributor: vid.contributor })}>
                        <Text style={styles.flagLink}>🚩 Flag</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No videos available</Text>
              )
            )}

            {activeTab === 'sounds' && (
              sounds.length > 0 ? (
                sounds.map((snd, idx) => (
                  <View key={idx} style={styles.mediaItem}>
                    <AudioPlayer uri={resolveUrl(snd.url)} />
                    <View style={styles.mediaFooter}>
                      <MediaCredits media={snd} />
                      <TouchableOpacity onPress={() => setFlagMedia({ id: snd.id ?? 0, type: 'audio', url: snd.url, contributor: snd.contributor })}>
                        <Text style={styles.flagLink}>🚩 Flag</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No sounds available</Text>
              )
            )}
          </ScrollView>
        )}

        <FlagMediaModal
          visible={!!flagMedia}
          onClose={() => setFlagMedia(null)}
          media={flagMedia}
          playerToken={playerToken}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[200],
  },
  headerTitleWrap: { flex: 1, marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.primary[800] },
  headerSubtitle: { fontSize: 14, color: colors.primary[600], marginTop: 2, fontStyle: 'italic' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { fontSize: 18, color: colors.primary[700], fontWeight: '600' },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: colors.primary[50],
  },
  tabActive: { backgroundColor: colors.primary[500] },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.primary[600] },
  tabTextActive: { color: '#fff' },
  body: { flex: 1 },
  bodyContent: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mediaItem: { marginBottom: 20 },
  mediaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  flagLink: { fontSize: 13, color: colors.primary[500], paddingVertical: 4 },
  mediaImage: { height: 240, borderRadius: 8, backgroundColor: colors.primary[50] },
  imagePlaceholder: {
    height: 240,
    borderRadius: 8,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { fontSize: 14, color: colors.primary[500] },
  mediaVideo: { height: 220, borderRadius: 8, backgroundColor: '#000' },
  audioBtn: {
    backgroundColor: colors.primary[100],
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  audioBtnPlaying: { backgroundColor: colors.primary[500] },
  audioBtnText: { fontSize: 15, fontWeight: '600', color: colors.primary[800] },
  audioBtnTextPlaying: { color: colors.primary[50] },
  emptyText: { fontSize: 15, color: colors.primary[500], textAlign: 'center', marginTop: 32 },
});
