import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, Image, StatusBar, Modal, ActivityIndicator, NativeModules, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Lock, ChevronRight, Settings, Wifi, RefreshCw, X, CheckCircle, AlertTriangle, Download, Eye, EyeOff } from 'lucide-react-native';
import { serverIP, setServerIP, API_BASE } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { BundleUpdater } = NativeModules;
const LOCAL_APP_VERSION = '1.0.0';

interface LoginScreenProps {
  onLoginSuccess: (username: string, role: 'waiter' | 'kitchen' | 'rider', name?: string, permissions?: string[]) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinSetupMode, setPinSetupMode] = useState(false);
  const [error, setError] = useState('');
  const [unsupportedRoleInfo, setUnsupportedRoleInfo] = useState<{ role: string, name: string } | null>(null);

  // Settings & update state
  const [showSettings, setShowSettings] = useState(false);
  const [serverIPInput, setServerIPInput] = useState(serverIP);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connStatus, setConnStatus] = useState<'success' | 'failed' | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ serverVersion: string; publishedAt: string; updateAvailable: boolean } | null>(null);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');
  const [activeJSVersion, setActiveJSVersion] = useState(LOCAL_APP_VERSION);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Load stored active JS version if any
    AsyncStorage.getItem('ACTIVE_JS_VERSION').then((val) => {
      if (val) {
        setActiveJSVersion(val);
      }
    });
  }, []);

  const handleLogin = async () => {
    if (!username.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!pin.trim()) {
      setError('Please enter your passcode PIN');
      return;
    }

    setError('');
    setIsTestingConn(true); // use loading state for login button if desired, or just do it in-line
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pin }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();

        if (data.requirePinSetup) {
          setPinSetupMode(true);
          setError('First time login. Please confirm your new PIN.');
          setIsTestingConn(false);
          return;
        }

        const loggedInUser = data.user;

        // Ensure they have a valid mobile role
        if (!['waiter', 'kitchen', 'rider'].includes(loggedInUser.role)) {
          setUnsupportedRoleInfo({ role: loggedInUser.role, name: loggedInUser.name || loggedInUser.username });
          setIsTestingConn(false);
          return;
        }

        await AsyncStorage.setItem('LOGGED_IN_USER', JSON.stringify({
          username: loggedInUser.username,
          role: loggedInUser.role,
          name: loggedInUser.name,
          permissions: loggedInUser.permissions || []
        }));
        onLoginSuccess(loggedInUser.username, loggedInUser.role, loggedInUser.name, loggedInUser.permissions || []);
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid username or passcode PIN');
      }
    } catch (err) {
      console.warn('Network error during login', err);
      setError('Server unreachable. Please check connection to the Zaiqa Mahal server.');
    } finally {
      setIsTestingConn(false);
    }
  };

  const handleSetPin = async () => {
    if (!pin || pin !== confirmPin) {
      setError('PINs do not match. Please re-enter.');
      return;
    }
    setError('');
    setIsTestingConn(true);
    try {
      const res = await fetch(`${API_BASE}/users/set-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin })
      });
      if (res.ok) {
        setPinSetupMode(false);
        // Automatically login now that PIN is set
        await handleLogin();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to set PIN');
        setIsTestingConn(false);
      }
    } catch (err) {
      setError('Network error');
      setIsTestingConn(false);
    }
  };

  const handleSaveIP = async () => {
    try {
      await setServerIP(serverIPInput);
      setConnStatus(null);
      Alert.alert('Configuration Saved', `Server IP updated to: ${serverIPInput}`);
    } catch (e) {
      Alert.alert('Error', 'Failed to save server IP');
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConn(true);
    setConnStatus(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const testUrl = `http://${serverIPInput}:5005/api/health`;
      const res = await fetch(testUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        setConnStatus('success');
      } else {
        setConnStatus('failed');
      }
    } catch (err) {
      setConnStatus('failed');
    } finally {
      setIsTestingConn(false);
    }
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setUpdateInfo(null);
    try {
      const testUrl = `http://${serverIPInput}:5005/api/update/mobile-version`;
      const res = await fetch(testUrl);
      if (!res.ok) throw new Error('Server returned error');
      const data = await res.json();

      const serverVer = data.version || '1.0.0';
      const isNew = serverVer !== activeJSVersion;

      setUpdateInfo({
        serverVersion: serverVer,
        publishedAt: data.publishedAt ? new Date(data.publishedAt).toLocaleDateString() : 'Unknown',
        updateAvailable: isNew
      });
    } catch (err) {
      Alert.alert('Update Check Failed', 'Could not reach server to check for updates.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleDownloadUpdate = async () => {
    if (!BundleUpdater) {
      Alert.alert('Not Supported', 'OTA update is only supported on native Android builds.');
      return;
    }

    setIsDownloadingUpdate(true);
    setDownloadProgress('Downloading bundle...');
    try {
      const downloadUrl = `http://${serverIPInput}:5005/api/update/mobile-bundle`;
      await BundleUpdater.downloadBundle(downloadUrl);

      if (updateInfo) {
        await AsyncStorage.setItem('ACTIVE_JS_VERSION', updateInfo.serverVersion);
        setActiveJSVersion(updateInfo.serverVersion);
      }

      setDownloadProgress('Update complete!');
      Alert.alert(
        'Update Successful',
        'Dynamic OTA bundle applied. Reload the application now to see changes.',
        [
          {
            text: 'Reload Now',
            onPress: () => {
              BundleUpdater.reloadJS();
            }
          }
        ]
      );
    } catch (err: any) {
      Alert.alert('Download Failed', err.message || 'Failed to download dynamic bundle.');
    } finally {
      setIsDownloadingUpdate(false);
    }
  };

  const handleClearUpdate = async () => {
    if (!BundleUpdater) return;
    try {
      await BundleUpdater.clearUpdate();
      await AsyncStorage.removeItem('ACTIVE_JS_VERSION');
      setActiveJSVersion(LOCAL_APP_VERSION);
      Alert.alert('Update Cleared', 'App reverted to default package bundle. Reload to apply.', [
        { text: 'Reload Now', onPress: () => BundleUpdater.reloadJS() }
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to clear updates');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        {/* Settings Gear Icon at Top Right */}
      <TouchableOpacity
        style={styles.settingsIcon}
        onPress={() => {
          setServerIPInput(serverIP);
          setShowSettings(true);
        }}
      >
        <Settings size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* Background Watermark Logo */}
      <Image
        source={{ uri: `${API_BASE.replace('/api', '')}/assets/Logo.jpg` }}
        style={styles.backgroundWatermark}
        resizeMode="cover"
        defaultSource={require('../../assets/Logo.jpg')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Brand Logo & Name */}
        <View style={styles.brandContainer}>
          <View style={styles.logoCircle}>
            <Image
              source={{ uri: `${API_BASE.replace('/api', '')}/assets/Logo.jpg` }}
              defaultSource={require('../../assets/Logo.jpg')}
              style={styles.logoCircleImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.brandName}>ZAIQA MAHAL</Text>
          <Text style={styles.brandSub}>Digital Ordering App (CLI)</Text>
          <Text style={styles.versionTag}>v{activeJSVersion}</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Username Field */}
          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.inputLabel}>Name</Text>
            </View>

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
            <Text style={styles.inputLabel}>{pinSetupMode ? 'Create Access PIN / Password' : 'Passcode PIN'}</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                placeholder={pinSetupMode ? "Enter new PIN/Password" : "Enter Password or PIN"}
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                value={pin}
                onChangeText={(txt) => { setPin(txt); setError(''); }}
                style={styles.input}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ paddingRight: 16 }}>
                {showPassword ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
              </TouchableOpacity>
            </View>
          </View>

          {pinSetupMode && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm Access PIN</Text>
              <View style={styles.inputWrapper}>
                <Lock size={18} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  placeholder="Re-enter to confirm"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPin}
                  onChangeText={(txt) => { setConfirmPin(txt); setError(''); }}
                  style={styles.input}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ paddingRight: 16 }}>
                  {showConfirmPassword ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Login Button */}
          {pinSetupMode ? (
            <TouchableOpacity style={styles.loginBtn} onPress={handleSetPin}>
              <Text style={styles.loginBtnText}>CONFIRM & LOGIN</Text>
              <ChevronRight size={16} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
              <Text style={styles.loginBtnText}>PROCEED TO WORKSPACE</Text>
              <ChevronRight size={16} color="#ffffff" />
            </TouchableOpacity>
          )}

          {pinSetupMode && (
            <TouchableOpacity style={{ alignItems: 'center', marginTop: 16 }} onPress={() => { setPinSetupMode(false); setConfirmPin(''); }}>
              <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: '700' }}>Cancel Setup</Text>
            </TouchableOpacity>
          )}

        </View>

        {/* Quick Info / Hints */}
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>Server: {serverIP}</Text>
        </View>

      </ScrollView>

      {/* Connection & OTA Update Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Server & Updates Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)} style={styles.closeBtn}>
                <X size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>

              {/* Server IP Section */}
              <View style={styles.settingsSection}>
                <Text style={styles.sectionTitle}>Server Connection Config</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Server IP Address</Text>
                  <View style={styles.inputWrapper}>
                    <Wifi size={18} color="#9ca3af" style={styles.inputIcon} />
                    <TextInput
                      placeholder="e.g. 192.168.1.100"
                      placeholderTextColor="#9ca3af"
                      value={serverIPInput}
                      onChangeText={setServerIPInput}
                      style={styles.input}
                    />
                  </View>
                </View>

                {/* Connection Status Box */}
                {connStatus === 'success' && (
                  <View style={[styles.statusBox, styles.statusSuccess]}>
                    <CheckCircle size={16} color="#4ade80" style={{ marginRight: 6 }} />
                    <Text style={styles.statusTextSuccess}>Connected successfully to server!</Text>
                  </View>
                )}
                {connStatus === 'failed' && (
                  <View style={[styles.statusBox, styles.statusError]}>
                    <AlertTriangle size={16} color="#f87171" style={{ marginRight: 6 }} />
                    <Text style={styles.statusTextError}>Failed to connect. Verify IP & server state.</Text>
                  </View>
                )}

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.testBtn]}
                    onPress={handleTestConnection}
                    disabled={isTestingConn}
                  >
                    {isTestingConn ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <RefreshCw size={14} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.btnText}>Test Connection</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionButton, styles.saveBtn]} onPress={handleSaveIP}>
                    <Text style={styles.btnText}>Save Config</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* OTA Updater Section */}
              <View style={styles.settingsSection}>
                <Text style={styles.sectionTitle}>Over-the-Air App Updates</Text>
                <Text style={styles.infoText}>
                  Your app can download the latest frontend and logic bundles directly from the local server.
                </Text>

                <View style={styles.versionRow}>
                  <View>
                    <Text style={styles.versionLabel}>Current Local version</Text>
                    <Text style={styles.versionVal}>v{activeJSVersion}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.checkUpdateBtn]}
                    onPress={handleCheckUpdate}
                    disabled={isCheckingUpdate}
                  >
                    {isCheckingUpdate ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.btnText}>Check for Updates</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Update Info Results */}
                {updateInfo && (
                  <View style={styles.updateResultBox}>
                    <Text style={styles.updateResultTitle}>
                      {updateInfo.updateAvailable ? '⚡ New Update Available!' : '✅ App is Up to Date'}
                    </Text>
                    <Text style={styles.updateResultDetail}>Server version: v{updateInfo.serverVersion}</Text>
                    <Text style={styles.updateResultDetail}>Published at: {updateInfo.publishedAt}</Text>

                    {updateInfo.updateAvailable && (
                      <TouchableOpacity
                        style={styles.downloadUpdateBtn}
                        onPress={handleDownloadUpdate}
                        disabled={isDownloadingUpdate}
                      >
                        {isDownloadingUpdate ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Download size={16} color="#ffffff" style={{ marginRight: 8 }} />
                            <Text style={styles.btnText}>Download & Apply Update</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {isDownloadingUpdate && (
                  <Text style={styles.progressText}>{downloadProgress}</Text>
                )}

                {/* Reset Bundle Option */}
                {activeJSVersion !== LOCAL_APP_VERSION && (
                  <TouchableOpacity style={styles.revertBtn} onPress={handleClearUpdate}>
                    <Text style={styles.revertBtnText}>Revert to Default Bundle</Text>
                  </TouchableOpacity>
                )}
              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* UNSUPPORTED ROLE MODAL */}
      <Modal
        visible={unsupportedRoleInfo !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setUnsupportedRoleInfo(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.iconCircle, { backgroundColor: '#fef2f2' }]}>
                <AlertTriangle size={32} color="#ef4444" />
              </View>
              <TouchableOpacity onPress={() => setUnsupportedRoleInfo(null)} style={styles.closeBtn}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Text style={styles.modalTitle}>Desktop App Required</Text>
              <Text style={styles.modalDesc}>
                Hello <Text style={{fontWeight: 'bold', color: '#0f172a'}}>{unsupportedRoleInfo?.name}</Text>! 
                The mobile application is specifically designed for Waiters, Kitchen Staff, and Riders.
              </Text>
              
              <View style={{ backgroundColor: '#f1f5f9', padding: 12, borderRadius: 12, width: '100%', marginBottom: 16 }}>
                <Text style={{ fontSize: 13, color: '#475569', textAlign: 'center', lineHeight: 20 }}>
                  Since your role is <Text style={{fontWeight: '900', color: '#ea580c', textTransform: 'uppercase'}}>{unsupportedRoleInfo?.role}</Text>, you must use the <Text style={{fontWeight: 'bold', color: '#0f172a'}}>Desktop/Web Application</Text> to access the Admin Dashboard, POS, and settings.
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, { width: '100%' }]}
              onPress={() => setUnsupportedRoleInfo(null)}
            >
              <Text style={styles.saveBtnText}>Understood</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  settingsIcon: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
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
  versionTag: {
    fontSize: 10,
    color: '#ea580c',
    fontWeight: '800',
    marginTop: 6,
    backgroundColor: 'rgba(234, 88, 12, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
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

  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    maxHeight: '85%',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  modalScroll: {
    padding: 24,
  },
  settingsSection: {
    marginBottom: 28,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ea580c',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionButton: {
    flex: 0.48,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  testBtn: {
    backgroundColor: '#334155',
  },
  saveBtn: {
    backgroundColor: '#ea580c',
  },
  btnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  statusSuccess: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
  },
  statusError: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
  },
  statusTextSuccess: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextError: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
    marginBottom: 16,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  versionLabel: {
    fontSize: 9,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  versionVal: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '800',
    marginTop: 2,
  },
  checkUpdateBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateResultBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  updateResultTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 6,
  },
  updateResultDetail: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  downloadUpdateBtn: {
    backgroundColor: '#10b981',
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 12,
  },
  progressText: {
    fontSize: 11,
    color: '#ea580c',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '700',
  },
  revertBtn: {
    marginTop: 16,
    alignSelf: 'center',
  },
  revertBtnText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  userSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  userSelectRowActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  userSelectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  userSelectTextActive: {
    color: '#3b82f6',
    fontWeight: '700',
  },
});
