import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Animated } from 'react-native';
import type { RoadmapNode } from '../api/birdrJourney';
import { BirdrLevelImage, BirdrLevelImageVariant } from './BirdrLevelImage';
import { usePulsatingAnimation } from '../hooks/usePulsatingAnimation';
import { colors } from '../theme';
import { MAX_BIRDR_LEVEL } from '../constants/birdrLevels';

type Props = {
  roadmap: RoadmapNode[];
  currentSequence: number;
};

function variantForStatus(status: RoadmapNode['status']): BirdrLevelImageVariant {
  if (status === 'completed') return 'completed';
  if (status === 'current') return 'current';
  if (status === 'locked') return 'locked';
  return 'locked';
}

function RoadmapNodeItem({
  node,
  showConnectorBelow,
}: {
  node: RoadmapNode;
  showConnectorBelow: boolean;
}) {
  const variant = variantForStatus(node.status);
  const pulse = usePulsatingAnimation(node.status === 'current');

  return (
    <View style={styles.nodeColumn}>
      <Animated.View style={node.status === 'current' ? pulse : undefined}>
        <BirdrLevelImage sequence={node.sequence} variant={variant} />
      </Animated.View>
      {showConnectorBelow && <View style={styles.connector} />}
    </View>
  );
}

/** Vertical path from max level down to current (Duolingo-style, current at bottom). */
export function BirdrJourneyRoadmap({ roadmap, currentSequence }: Props) {
  const nodes = [...roadmap].sort((a, b) => b.sequence - a.sequence);
  const visible = nodes.filter((n) => n.sequence >= currentSequence - 1 && n.sequence <= MAX_BIRDR_LEVEL);

  return (
    <View style={styles.road}>
      {visible.map((node, index) => (
        <RoadmapNodeItem
          key={node.sequence}
          node={node}
          showConnectorBelow={index < visible.length - 1}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  road: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  nodeColumn: {
    alignItems: 'center',
  },
  connector: {
    width: 4,
    height: 28,
    marginVertical: 4,
    borderRadius: 2,
    backgroundColor: colors.primary[200],
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.primary[300],
  },
});
