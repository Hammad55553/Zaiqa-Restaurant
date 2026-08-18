import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  UserPlus,
  Pencil,
  Trash2,
  KeyRound,
  ShieldCheck,
  X,
} from 'lucide-react-native';

export interface StaffUser {
  id: number | string;
  username: string;
  name?: string;
  role: string;
  permissions?: string[];
}

export interface UserFormData {
  id?: number | string;
  username: string;
  name: string;
  role: string;
  password?: string;
  reset_pin?: boolean;
}

interface UsersTabProps {
  users: StaffUser[];
  loading?: boolean;
  onSaveUser: (data: UserFormData, isEdit: boolean) => Promise<void> | void;
  onDeleteUser: (user: StaffUser) => Promise<void> | void;
}

const ROLES = ['admin', 'waiter', 'kitchen', 'rider'];

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  admin: { label: 'ADMIN', color: '#7c3aed', bg: '#ede9fe' },
  waiter: { label: 'WAITER', color: '#c2410c', bg: '#ffedd5' },
  kitchen: { label: 'KITCHEN', color: '#1d4ed8', bg: '#dbeafe' },
  rider: { label: 'RIDER', color: '#15803d', bg: '#dcfce7' },
};

export default function UsersTab({ users, loading, onSaveUser, onDeleteUser }: UsersTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('waiter');
  const [pin, setPin] = useState('');
  const [resetPin, setResetPin] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setUsername('');
    setName('');
    setRole('waiter');
    setPin('');
    setResetPin(false);
    setModalOpen(true);
  };

  const openEdit = (u: StaffUser) => {
    setEditing(u);
    setUsername(u.username);
    setName(u.name || '');
    setRole(u.role || 'waiter');
    setPin('');
    setResetPin(false);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Zaroori', 'Username likhna zaroori hai.');
      return;
    }
    const data: UserFormData = {
      id: editing?.id,
      username: username.trim(),
      name: name.trim(),
      role,
    };
    if (!editing) {
      // New user: PIN optional (blank => PENDING_PIN, user sets on first login)
      if (pin.trim()) data.password = pin.trim();
    } else {
      if (resetPin) data.reset_pin = true;
      else if (pin.trim()) data.password = pin.trim();
    }

    try {
      setSaving(true);
      await onSaveUser(data, !!editing);
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (u: StaffUser) => {
    Alert.alert(
      'Staff Delete?',
      `Kya aap "${u.name || u.username}" ko delete karna chahte hain?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDeleteUser(u) },
      ],
    );
  };

  return (
    <View style={styles.contentWrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Staff / Users ({users.length})</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <UserPlus size={16} color="#ffffff" />
          <Text style={styles.addBtnText}>Add Staff</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator color="#f97316" style={{ marginVertical: 20 }} />}

      {!loading && users.length === 0 && (
        <Text style={styles.emptyText}>Koi staff nahi. "Add Staff" se naya banayein.</Text>
      )}

      {users.map((u) => {
        const meta = ROLE_META[u.role] || { label: (u.role || '').toUpperCase(), color: '#475569', bg: '#f1f5f9' };
        return (
          <View key={u.id} style={styles.userCard}>
            <View style={styles.avatar}>
              <ShieldCheck size={18} color="#f97316" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{u.name || u.username}</Text>
              <Text style={styles.userSub}>@{u.username}</Text>
              <View style={[styles.roleBadge, { backgroundColor: meta.bg }]}>
                <Text style={[styles.roleBadgeText, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>
            <View style={styles.userActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(u)} activeOpacity={0.7}>
                <Pencil size={16} color="#0f172a" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: '#fef2f2', borderColor: '#fee2e2' }]}
                onPress={() => confirmDelete(u)}
                activeOpacity={0.7}
              >
                <Trash2 size={16} color="#dc2626" />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {/* Add / Edit Modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Staff' : 'Add New Staff'}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={styles.closeBtn}>
                <X size={18} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="e.g. ali_waiter"
                autoCapitalize="none"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Ali Raza"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.label}>Role</Text>
              <View style={styles.roleRow}>
                {ROLES.map((r) => {
                  const active = role === r;
                  const rm = ROLE_META[r];
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleChip, active && { backgroundColor: rm.color, borderColor: rm.color }]}
                      onPress={() => setRole(r)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.roleChipText, active && { color: '#ffffff' }]}>{rm.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {editing ? (
                <>
                  <Text style={styles.label}>Change PIN (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={pin}
                    onChangeText={setPin}
                    placeholder="Naya PIN (khali chhorein to na badle)"
                    keyboardType="number-pad"
                    secureTextEntry
                    editable={!resetPin}
                    placeholderTextColor="#94a3b8"
                  />
                  <TouchableOpacity
                    style={styles.resetRow}
                    onPress={() => setResetPin(!resetPin)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.checkbox, resetPin && styles.checkboxOn]}>
                      {resetPin && <KeyRound size={12} color="#ffffff" />}
                    </View>
                    <Text style={styles.resetText}>
                      PIN reset karein (staff agli login par naya PIN banayega)
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.label}>Set PIN (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={pin}
                    onChangeText={setPin}
                    placeholder="Khali chhorein to staff khud PIN banayega"
                    keyboardType="number-pad"
                    secureTextEntry
                    placeholderTextColor="#94a3b8"
                  />
                </>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.saveBtnText}>{editing ? 'Save Changes' : 'Create Staff'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contentWrapper: { padding: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a', letterSpacing: 0.5 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f97316',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  emptyText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginVertical: 24 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  userSub: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  roleBadgeText: { fontSize: 8, fontWeight: '900' },
  userActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roleChipText: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  resetRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#f97316', borderColor: '#f97316' },
  resetText: { flex: 1, fontSize: 12, color: '#475569', fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#f97316',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 15 },
});
