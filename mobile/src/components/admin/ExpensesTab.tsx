import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ExpensesTabProps {
  expenses: any[];
}

export default function ExpensesTab({ expenses }: ExpensesTabProps) {
  return (
    <View style={styles.contentWrapper}>
      <Text style={styles.sectionTitle}>Daily Restaurant Expenditures</Text>
      {expenses.length === 0 ? (
        <Text style={styles.emptyText}>No expenses logged.</Text>
      ) : (
        expenses.map((exp) => (
          <View key={exp.id} style={styles.expenseItemCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.expenseCardTitle}>{(exp.category || '').toUpperCase()}</Text>
              <Text style={styles.expenseCardSub}>{exp.remarks || 'No remarks provided'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.expenseAmount}>Rs. {exp.amount}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contentWrapper: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 18,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 24,
  },
  expenseItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  expenseCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  expenseCardSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ef4444',
  },
});
