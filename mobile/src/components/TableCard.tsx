import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Dimensions, Animated } from 'react-native';
import { Users as UsersIcon, Clock as ClockIcon } from 'lucide-react-native';

interface Table {
  id: number;
  number: string;
  area: string;
  seats: number;
  status: string;
  startTime?: string;
}

interface TableCardProps {
  table: Table;
  onPress: (table: Table) => void;
}

export default function TableCard({ table, onPress }: TableCardProps) {
  const isAvailable = table.status === 'available';
  const isOccupied = table.status === 'dining';
  const isReserved = table.status === 'reserved';

  const [theme, setTheme] = useState({ bg: 'rgba(16,185,129,0.5)', border: '#059669', statusBg: 'rgba(16,185,129,0.5)' });
  const [elapsed, setElapsed] = useState('');

  // Pulse animation value for external border ripple
  const [pulseVal] = useState(new Animated.Value(0));

  useEffect(() => {
    if (isOccupied) {
      pulseVal.setValue(0);
      Animated.loop(
        Animated.timing(pulseVal, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      pulseVal.setValue(0);
    }
  }, [isOccupied]);

  useEffect(() => {
    const updateTheme = () => {
      if (isReserved) {
        setTheme({ bg: 'rgba(37,99,235,0.6)', border: '#1d4ed8', statusBg: 'rgba(37,99,235,0.5)' });
        return;
      }
      if (isAvailable || !table.startTime) {
        setTheme({ bg: 'rgba(0,0,0,0.55)', border: 'transparent', statusBg: 'rgba(16,185,129,0.5)' });
        return;
      }

      // Safe cross-platform date parsing
      const normalizedTime = table.startTime.includes('T') 
        ? table.startTime 
        : table.startTime.replace(' ', 'T');
      const startTimeMs = new Date(normalizedTime).getTime();
      
      if (isNaN(startTimeMs)) {
        // Fallback if parsing fails
        setTheme({ bg: 'rgba(249, 115, 22, 0.7)', border: 'rgb(249, 115, 22)', statusBg: 'rgba(255,255,255,0.25)' });
        return;
      }

      const diffMs = Date.now() - startTimeMs;
      const diffMinutes = diffMs / 60000;

      const totalSecs = Math.max(0, Math.floor(diffMs / 1000));
      const hours = Math.floor(totalSecs / 3600);
      const minutes = Math.floor((totalSecs % 3600) / 60);
      const seconds = totalSecs % 60;

      const timeStr = hours > 0 
        ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      setElapsed(timeStr);

      let r, g, b;
      if (diffMinutes <= 15) {
        r = 249; g = 115; b = 22; // Orange
      } else if (diffMinutes >= 30) {
        r = 190; g = 18; b = 60; // Red
      } else {
        const factor = (diffMinutes - 15) / 15;
        r = Math.round(249 + factor * (190 - 249));
        g = Math.round(115 + factor * (18 - 115));
        b = Math.round(22 + factor * (60 - 22));
      }

      setTheme({
        bg: `rgba(${r}, ${g}, ${b}, 0.7)`,
        border: `rgb(${r}, ${g}, ${b})`,
        statusBg: 'rgba(255,255,255,0.25)'
      });
    };

    updateTheme();
    const interval = setInterval(updateTheme, 1000);
    return () => clearInterval(interval);
  }, [table.startTime, isOccupied, isReserved, isAvailable]);

  // Interpolations for outer pulsing rings (radio waves)
  const scale1 = pulseVal.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.25],
  });
  const opacity1 = pulseVal.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0.6, 0.4, 0],
  });

  const scale2 = pulseVal.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });
  const opacity2 = pulseVal.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 0],
  });

  return (
    <View style={styles.cardContainer}>
      {/* Outer Pulse Rings behind the card container */}
      {isOccupied && (
        <>
          <Animated.View
            style={[
              styles.outerPulseRing,
              {
                borderColor: theme.border,
                transform: [{ scale: scale1 }],
                opacity: opacity1,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.outerPulseRing,
              {
                borderColor: theme.border,
                transform: [{ scale: scale2 }],
                opacity: opacity2,
              },
            ]}
          />
        </>
      )}

      <TouchableOpacity
        style={[
          styles.customTableCard,
          { borderColor: theme.border }
        ]}
        onPress={() => onPress(table)}
      >
        {/* Table Background Image */}
        <Image 
          source={require('../../assets/table.png')} 
          style={styles.tableCardBackgroundImage} 
          resizeMode="cover"
        />
        
        {/* Dark overlay / state color overlay */}
        <View 
          style={[
            styles.tableCardOverlay, 
            { backgroundColor: theme.bg }
          ]} 
        />

        <View style={styles.tableCardContent}>
          <View style={styles.tableCardHeader}>
            <View style={[styles.nativeStatusBadge, { backgroundColor: theme.statusBg }]}>
              <Text style={styles.nativeStatusBadgeText}>{table.status.toUpperCase()}</Text>
            </View>
            <View style={styles.seatsBadge}>
              <UsersIcon size={12} color="#1e293b" style={{ marginRight: 3 }} />
              <Text style={styles.seatsBadgeText}>{table.seats}</Text>
            </View>
          </View>

          <View style={styles.tableCardFooter}>
            <View style={{ flex: 1 }}>
              <Text style={styles.tableAreaText}>{table.area.toUpperCase()} AREA</Text>
              <Text style={styles.tableNumberText}>T-{table.number}</Text>
            </View>

            {isOccupied && table.startTime && (
              <View style={styles.nativeTimerBadge}>
                <ClockIcon size={11} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.nativeTimerText}>{elapsed}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const { width: windowWidth } = Dimensions.get('window');
const cardWidth = (windowWidth - 40) / 2;

const styles = StyleSheet.create({
  cardContainer: {
    position: 'relative',
    width: cardWidth,
    height: cardWidth,
    margin: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTableCard: {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: 16,
    borderWidth: 2,
    padding: 0,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  tableCardBackgroundImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  tableCardOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  outerPulseRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 16,
    borderWidth: 2,
  },
  tableCardContent: {
    flex: 1,
    justifyContent: 'space-between',
    zIndex: 10,
    padding: 10,
  },
  tableCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nativeStatusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nativeStatusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  seatsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  seatsBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#1e293b',
  },
  tableCardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  tableAreaText: {
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  tableNumberText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
  },
  nativeTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  nativeTimerText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
  },
});
