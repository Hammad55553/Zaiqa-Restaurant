import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import TableCard from '../TableCard';
import AreaScroller from '../AreaScroller';

interface TablesTabProps {
  tables: any[];
}

export default function TablesTab({ tables }: TablesTabProps) {
  // Sort areas according to pref array
  const pref = ['Male', 'Family', 'Male Lawn', 'Family Lawn', 'Delivery'];

  // Extract unique areas from tables
  const areas = Array.from(new Set(tables.map(t => t.area || 'Male')));
  areas.sort((a, b) => {
    let idxA = pref.indexOf(a);
    let idxB = pref.indexOf(b);
    if (idxA === -1) idxA = 999;
    if (idxB === -1) idxB = 999;
    return idxA - idxB;
  });

  const [selectedArea, setSelectedArea] = useState(areas[0] || 'Male');

  // Handle case where selectedArea is no longer in areas
  React.useEffect(() => {
    if (areas.length > 0 && !areas.includes(selectedArea)) {
      setSelectedArea(areas[0]);
    }
  }, [tables, areas]);

  const filteredTables = tables.filter(t => (t.area || 'Male') === selectedArea);

  // We need to map database keys to the table format expected by TableCard:
  // db has table_number, seats, area, status.
  // TableCard expects table.number, table.seats, table.area, table.status
  const mappedTables = filteredTables.map(t => ({
    id: t.id,
    number: t.table_number,
    area: t.area,
    seats: t.seats,
    status: t.status,
    startTime: t.startTime
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Floor Occupancy Map</Text>
      {areas.length > 0 && (
        <AreaScroller
          areas={areas}
          selectedArea={selectedArea}
          onSelectArea={setSelectedArea}
        />
      )}
      
      {mappedTables.length === 0 ? (
        <Text style={styles.emptyText}>No tables configured in this area.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.tableGrid}>
          {mappedTables.map(table => (
            <TableCard 
              key={table.id} 
              table={table} 
              onPress={() => {}} 
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 18,
    marginBottom: 12,
    paddingHorizontal: 16,
    letterSpacing: 0.5,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 24,
    paddingHorizontal: 16,
  },
  tableGrid: {
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});

