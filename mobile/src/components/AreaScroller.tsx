import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';

interface AreaScrollerProps {
  areas: string[];
  selectedArea: string;
  onSelectArea: (area: string) => void;
}

export default function AreaScroller({ areas, selectedArea, onSelectArea }: AreaScrollerProps) {
  return (
    <View style={styles.areaScrollerContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {areas.map(area => (
          <TouchableOpacity
            key={area}
            style={[styles.areaPill, selectedArea === area && styles.activeAreaPill]}
            onPress={() => onSelectArea(area)}
          >
            <Text style={[styles.areaText, selectedArea === area && styles.activeAreaText]}>
              {area}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  areaScrollerContainer: {
    height: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: 12,
  },
  areaPill: {
    paddingHorizontal: 20,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 10,
    justifyContent: 'center',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeAreaPill: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  areaText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.5,
  },
  activeAreaText: {
    color: '#ffffff',
  },
});
