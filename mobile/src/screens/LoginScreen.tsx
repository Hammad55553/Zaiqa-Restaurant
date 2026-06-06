import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, Image, StatusBar } from 'react-native';
import { Users, Lock, ChevronRight } from 'lucide-react-native';

interface LoginScreenProps {
  onLoginSuccess: (username: string, role: 'waiter' | 'kitchen') => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [role, setRole] = useState<'waiter' | 'kitchen'>('waiter');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!username.trim()) {
      setError('Please enter your name');
      return;
    }
    if (pin !== '1234' && pin !== '0000') {
      setError('Invalid PIN code. Use 1234 or 0000.');
      return;
    }
    setError('');
    onLoginSuccess(username, role);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.keyboardContainer}
    >
      {/* Background Watermark Logo */}
      <Image
        source={require('../../assets/Logo.jpg')}
        style={styles.backgroundWatermark}
        resizeMode="contain"
      />

      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* Brand Logo & Name */}
        <View style={styles.brandContainer}>
          <View style={styles.logoCircle}>
            <Image 
              source={require('../../assets/Logo.jpg')}
              style={styles.logoCircleImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.brandName}>ZAIQA MAHAL</Text>
          <Text style={styles.brandSub}>Digital Ordering App (CLI)</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          
          {/* Role Selection */}
          <View style={styles.roleContainer}>
            <TouchableOpacity 
              style={[styles.roleTab, role === 'waiter' && styles.activeTab]}
              onPress={() => { setRole('waiter'); setError(''); }}
            >
              <Text style={[styles.roleText, role === 'waiter' && styles.activeRoleText]}>Waiter Role</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.roleTab, role === 'kitchen' && styles.activeTab]}
              onPress={() => { setRole('kitchen'); setError(''); }}
            >
              <Text style={[styles.roleText, role === 'kitchen' && styles.activeRoleText]}>Kitchen Role</Text>
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Username Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Name</Text>
            <View style={styles.inputWrapper}>
              <Users size={18} color="#9ca3af" style={styles.inputIcon} />
              <TextInput 
                placeholder="e.g. Zahid Iqbal" 
                placeholderTextColor="#9ca3af"
                value={username}
                onChangeText={(txt) => { setUsername(txt); setError(''); }}
                style={styles.input}
              />
            </View>
          </View>

          {/* PIN Code Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Passcode PIN</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color="#9ca3af" style={styles.inputIcon} />
              <TextInput 
                placeholder="Enter 4-digit PIN" 
                placeholderTextColor="#9ca3af"
                secureTextEntry
                keyboardType="numeric"
                maxLength={4}
                value={pin}
                onChangeText={(txt) => { setPin(txt); setError(''); }}
                style={styles.input}
              />
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.loginBtnText}>PROCEED TO WORKSPACE</Text>
            <ChevronRight size={16} color="#ffffff" />
          </TouchableOpacity>

        </View>

        {/* Quick Info / Hints */}
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>Default Passcode is 1234 or 0000</Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#f97316',
  },
  logoCircleImage: {
    width: '100%',
    height: '100%',
  },
  backgroundWatermark: {
    position: 'absolute',
    width: '90%',
    height: '90%',
    opacity: 0.04,
    alignSelf: 'center',
    top: '5%',
    zIndex: -1,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
  },
  brandSub: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#ea580c',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  activeRoleText: {
    color: '#ffffff',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1.5,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },
  loginBtn: {
    backgroundColor: '#ea580c',
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginRight: 6,
  },
  hintContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  hintText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
