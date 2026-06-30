import React, { useRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Animated,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { profileService, UserProfileData } from '../services/profile';
import { launchImageLibrary } from 'react-native-image-picker';

const { width } = Dimensions.get('window');

interface ProfileProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onLogout?: () => void;
  onMyOrdersPress: () => void;
}

const Profile: React.FC<ProfileProps> = ({ isDarkMode, onToggleTheme, onLogout, onMyOrdersPress }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Edit Profile States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [editHeight, setEditHeight] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editFitnessGoal, setEditFitnessGoal] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCity, setEditCity] = useState('');
  const [updating, setUpdating] = useState(false);

  // Profile Photo Edit States
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<any>(null);

  const openEditModal = () => {
    if (profile) {
      setEditName(profile.name || '');
      setEditPhone(profile.phone || '');
      setEditAge(profile.age ? String(profile.age) : '');
      setEditGender(profile.gender || '');
      setEditHeight(profile.height ? String(profile.height) : '');
      setEditWeight(profile.weight ? String(profile.weight) : '');
      setEditFitnessGoal(profile.fitnessGoal || '');
      setEditLocation(profile.location || '');
      setEditCity(profile.city || '');
      setPhotoUri(null);
      setPhotoFile(null);
      setShowEditModal(true);
    }
  };

  const handleSelectPhoto = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
      if (response.didCancel) return;
      if (response.errorMessage) {
        Alert.alert('Error', response.errorMessage);
        return;
      }
      const asset = response.assets?.[0];
      if (asset && asset.uri) {
        setPhotoUri(asset.uri);
        setPhotoFile({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || 'profile.jpg',
        });
      }
    });
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      return Alert.alert('Error', 'Name is required');
    }
    try {
      setUpdating(true);
      const formData = new FormData();
      formData.append('name', editName);
      formData.append('phone', editPhone);
      if (editAge) formData.append('age', editAge);
      if (editGender) formData.append('gender', editGender);
      if (editHeight) formData.append('height', editHeight);
      if (editWeight) formData.append('weight', editWeight);
      formData.append('fitnessGoal', editFitnessGoal);
      formData.append('location', editLocation);
      formData.append('city', editCity);

      if (photoFile) {
        formData.append('profilePhoto', {
          uri: photoFile.uri,
          name: photoFile.name,
          type: photoFile.type,
        } as any);
      }

      const res = await profileService.updateProfile(formData);
      if (res.success || res) {
        // Fetch new profile details
        const refreshed = await profileService.getProfile();
        setProfile(refreshed.data || refreshed);
        Alert.alert('Success', 'Profile updated successfully!');
        setShowEditModal(false);
      }
    } catch (err: any) {
      console.error('Update profile error:', err);
      Alert.alert('Update Failed', err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    // Parallel entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 550,
        useNativeDriver: true,
      }),
    ]).start();

    // Fetch user profile
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const res = await profileService.getProfile();
        const data = res?.data || res;
        setProfile(data);
        setError(null);
      } catch (err: any) {
        console.error('Fetch profile error:', err);
        setError(err.message || 'Failed to load profile details');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const colors = {
    bg: isDarkMode ? '#0D0E12' : '#F1F2F4',
    card: isDarkMode ? 'rgba(22, 26, 34, 0.75)' : 'rgba(255, 255, 255, 0.8)',
    text: isDarkMode ? '#FFFFFF' : '#111827',
    subText: isDarkMode ? '#94A3B8' : '#6B7280',
    border: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    accent: isDarkMode ? '#FF7A00' : '#EAB308',
    accentLight: isDarkMode ? '#FF7A00' : '#EAB308',
    buttonBg: isDarkMode ? '#FF7A00' : '#2F3338',
    buttonText: isDarkMode ? '#0D0E12' : '#FFFFFF',
  };

  const cardShadow = !isDarkMode ? {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  } : {
    shadowColor: '#FF7A00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ color: colors.subText, marginTop: 12 }}>Loading profile...</Text>
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>Profile Not Found</Text>
        <Text style={{ color: colors.subText, fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
          {error || 'Unable to fetch user profile details.'}
        </Text>
        {onLogout && (
          <TouchableOpacity
            style={[styles.logoutErrorBtn, { backgroundColor: colors.accent }]}
            onPress={onLogout}
          >
            <Text style={{ color: colors.buttonText, fontWeight: '800' }}>Back to Sign In</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
  const isValidUrl = (url?: string) => {
    if (!url) return false;
    return url.startsWith('http') && !url.includes('...');
  };
  const avatarUrl = isValidUrl(profile.profilePhoto) ? profile.profilePhoto! : defaultAvatar;

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.bg, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Profile</Text>
          <TouchableOpacity 
            style={[styles.themeToggleContainer, { backgroundColor: colors.card, borderColor: colors.border }]} 
            onPress={onToggleTheme} 
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 16 }}>{isDarkMode ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>

        {/* User Card - Glassmorphism */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }, cardShadow]}>
          <View style={styles.profileRow}>
            <TouchableOpacity 
              activeOpacity={0.85}
              onPress={() => setShowPhotoModal(true)}
              style={[styles.avatarContainer, { borderColor: colors.accentLight }]}
            >
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImage}
              />
              <View style={[styles.activeDot, { backgroundColor: colors.accentLight }]} />
            </TouchableOpacity>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>{profile.name}</Text>
              <Text style={[styles.userHandle, { color: colors.subText }]}>{profile.email}</Text>
              <View style={[styles.badge, { backgroundColor: colors.accentLight }]}>
                <Text style={[styles.badgeText, { color: '#000000' }]}>★ {profile.role.toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Fitness Stats Section */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }, cardShadow]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{profile.height ? `${profile.height}` : 'N/A'}</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Height (cm)</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }, cardShadow]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{profile.weight ? `${profile.weight}` : 'N/A'}</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Weight (kg)</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }, cardShadow]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{profile.age ? `${profile.age}` : 'N/A'}</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Age</Text>
          </View>
        </View>

        {/* Additional Stats / Information Card */}
        <View style={[styles.glassCard, { backgroundColor: colors.card, borderColor: colors.border }, cardShadow]}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Fitness Goals & Location</Text>
          
          <View style={[styles.listItem, { borderBottomColor: colors.border }]}>
            <View style={styles.listItemLeft}>
              <Text style={styles.listIcon}>🎯</Text>
              <Text style={[styles.listText, { color: colors.text }]}>Fitness Goal</Text>
            </View>
            <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 13, textTransform: 'capitalize' }}>
              {profile.fitnessGoal ? profile.fitnessGoal.replace('_', ' ') : 'Not Specified'}
            </Text>
          </View>

          <View style={[styles.listItem, { borderBottomColor: colors.border }]}>
            <View style={styles.listItemLeft}>
              <Text style={styles.listIcon}>📍</Text>
              <Text style={[styles.listText, { color: colors.text }]}>Location</Text>
            </View>
            <Text style={[styles.listArrowText, { color: colors.text }]}>
              {profile.location || 'Not Specified'}
            </Text>
          </View>

          <View style={styles.listItem}>
            <View style={styles.listItemLeft}>
              <Text style={styles.listIcon}>🌆</Text>
              <Text style={[styles.listText, { color: colors.text }]}>City</Text>
            </View>
            <Text style={[styles.listArrowText, { color: colors.text }]}>
              {profile.city || 'Not Specified'}
            </Text>
          </View>
        </View>

        {/* Settings options list */}
        <View style={[styles.glassCard, { backgroundColor: colors.card, borderColor: colors.border }, cardShadow]}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Account & settings</Text>
          
          <TouchableOpacity 
            style={[styles.listItem, { borderBottomColor: colors.border }]}
            onPress={onMyOrdersPress}
          >
            <View style={styles.listItemLeft}>
              <Text style={styles.listIcon}>🛍️</Text>
              <Text style={[styles.listText, { color: colors.text }]}>My Orders</Text>
            </View>
            <Text style={[styles.listArrow, { color: colors.subText }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.listItem, { borderBottomColor: colors.border }]}
            onPress={openEditModal}
          >
            <View style={styles.listItemLeft}>
              <Text style={styles.listIcon}>✏️</Text>
              <Text style={[styles.listText, { color: colors.text }]}>Edit Profile</Text>
            </View>
            <Text style={[styles.listArrow, { color: colors.subText }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.listItem, { borderBottomColor: colors.border }]}>
            <View style={styles.listItemLeft}>
              <Text style={styles.listIcon}>💳</Text>
              <Text style={[styles.listText, { color: colors.text }]}>My Subscriptions & Plans</Text>
            </View>
            <Text style={[styles.listArrow, { color: colors.subText }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.listItem, { borderBottomColor: colors.border }]}>
            <View style={styles.listItemLeft}>
              <Text style={styles.listIcon}>📊</Text>
              <Text style={[styles.listText, { color: colors.text }]}>Fitness Assessment Reports</Text>
            </View>
            <Text style={[styles.listArrow, { color: colors.subText }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.listItem, { borderBottomColor: colors.border }]}>
            <View style={styles.listItemLeft}>
              <Text style={styles.listIcon}>⚙️</Text>
              <Text style={[styles.listText, { color: colors.text }]}>Account Settings</Text>
            </View>
            <Text style={[styles.listArrow, { color: colors.subText }]}>›</Text>
          </TouchableOpacity>

          {onLogout && (
            <TouchableOpacity onPress={onLogout} style={styles.listItem}>
              <View style={styles.listItemLeft}>
                <Text style={styles.listIcon}>🚪</Text>
                <Text style={[styles.listText, { color: '#EF4444', fontWeight: '700' }]}>Logout</Text>
              </View>
              <Text style={{ color: '#EF4444', fontSize: 16 }}>›</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>

      {/* Profile Photo Sweet Modal Popup */}
      <Modal
        visible={showPhotoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowPhotoModal(false)}
        >
          <View style={styles.modalContent}>
            {/* Close Button */}
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setShowPhotoModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
            
            {/* Image Preview */}
            <Image 
              source={{ uri: avatarUrl }} 
              style={styles.modalImage} 
              resizeMode="cover"
            />
            
            {/* User Name Tag */}
            <Text style={styles.modalUserName}>{profile.name}</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={[styles.editModalOverlay, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.editModalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.editTitle, { color: colors.text }]}>Edit Profile</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} style={styles.editFormContainer}>
              {/* Photo Selector */}
              <View style={styles.photoSelectContainer}>
                <TouchableOpacity onPress={handleSelectPhoto} style={styles.photoSelectWrapper}>
                  <Image
                    source={{ uri: photoUri || avatarUrl }}
                    style={styles.editAvatarImage}
                  />
                  <View style={[styles.photoEditBadge, { backgroundColor: colors.accent }]}>
                    <Text style={{ fontSize: 12 }}>📸</Text>
                  </View>
                </TouchableOpacity>
                <Text style={[styles.photoSelectHelp, { color: colors.subText }]}>Tap to change photo</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.subText }]}>Full Name</Text>
                <TextInput
                  style={[styles.inputField, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1A1D24' : '#F9FAFB' }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.subText}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.subText }]}>Phone</Text>
                <TextInput
                  style={[styles.inputField, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1A1D24' : '#F9FAFB' }]}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                  placeholder="Enter your phone number"
                  placeholderTextColor={colors.subText}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.subText }]}>Age</Text>
                <TextInput
                  style={[styles.inputField, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1A1D24' : '#F9FAFB' }]}
                  value={editAge}
                  onChangeText={setEditAge}
                  keyboardType="numeric"
                  placeholder="Enter age"
                  placeholderTextColor={colors.subText}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.subText }]}>Gender (male / female / other)</Text>
                <TextInput
                  style={[styles.inputField, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1A1D24' : '#F9FAFB' }]}
                  value={editGender}
                  onChangeText={(val) => setEditGender(val.toLowerCase() as any)}
                  placeholder="male / female / other"
                  placeholderTextColor={colors.subText}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.subText }]}>Height (cm)</Text>
                <TextInput
                  style={[styles.inputField, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1A1D24' : '#F9FAFB' }]}
                  value={editHeight}
                  onChangeText={setEditHeight}
                  keyboardType="numeric"
                  placeholder="Height in cm"
                  placeholderTextColor={colors.subText}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.subText }]}>Weight (kg)</Text>
                <TextInput
                  style={[styles.inputField, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1A1D24' : '#F9FAFB' }]}
                  value={editWeight}
                  onChangeText={setEditWeight}
                  keyboardType="numeric"
                  placeholder="Weight in kg"
                  placeholderTextColor={colors.subText}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.subText }]}>Fitness Goal</Text>
                <TextInput
                  style={[styles.inputField, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1A1D24' : '#F9FAFB' }]}
                  value={editFitnessGoal}
                  onChangeText={setEditFitnessGoal}
                  placeholder="e.g. build_muscle, lose_weight"
                  placeholderTextColor={colors.subText}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.subText }]}>Location</Text>
                <TextInput
                  style={[styles.inputField, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1A1D24' : '#F9FAFB' }]}
                  value={editLocation}
                  onChangeText={setEditLocation}
                  placeholder="Enter location"
                  placeholderTextColor={colors.subText}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.subText }]}>City</Text>
                <TextInput
                  style={[styles.inputField, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1A1D24' : '#F9FAFB' }]}
                  value={editCity}
                  onChangeText={setEditCity}
                  placeholder="Enter city"
                  placeholderTextColor={colors.subText}
                />
              </View>
            </ScrollView>

            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.editButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={[styles.editButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.editButton, styles.saveButton, { backgroundColor: colors.accent }]}
                onPress={handleUpdateProfile}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color={colors.buttonText} />
                ) : (
                  <Text style={[styles.editButtonText, { color: colors.buttonText }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 150 : 130,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  themeToggleContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    borderWidth: 2.5,
    borderRadius: 44,
    padding: 2,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  activeDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#161A22',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 19,
    fontWeight: '900',
  },
  userHandle: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  glassCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  listText: {
    fontSize: 13,
    fontWeight: '700',
  },
  listArrow: {
    fontSize: 18,
    fontWeight: '600',
  },
  listArrowText: {
    fontSize: 13,
    fontWeight: '600',
  },
  logoutErrorBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    alignItems: 'center',
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: -55,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalImage: {
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FF7A00',
  },
  modalUserName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 18,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  editModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  editModalContent: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  editTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 20,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  photoSelectContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoSelectWrapper: {
    position: 'relative',
  },
  editAvatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#FF7A00',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#161A22',
  },
  photoSelectHelp: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  editFormContainer: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputField: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  editButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  saveButton: {
    borderWidth: 0,
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
});

export default Profile;
