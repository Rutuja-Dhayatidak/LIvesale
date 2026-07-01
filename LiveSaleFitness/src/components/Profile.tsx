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
  Share,
  Linking,
} from 'react-native';
import { profileService, UserProfileData } from '../services/profile';
import { launchImageLibrary } from 'react-native-image-picker';
import { gymService } from '../services/Gym';
import { trainerService } from '../services/trainer';
import DietPreferencesScreen from '../pages/DietPreferencesScreen';
import { healthStoreService } from '../services/healthstore';
import Api from '../services/Api';

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

  // Subscription States
  const [showSubsModal, setShowSubsModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [trainerBookings, setTrainerBookings] = useState<any[]>([]);
  const [subTab, setSubTab] = useState<'gym' | 'trainer'>('gym');
  const [loadingSubs, setLoadingSubs] = useState(false);

  const fetchSubscriptions = async () => {
    try {
      setLoadingSubs(true);
      setShowSubsModal(true);
      
      // Fetch gym memberships
      const gymRes = await gymService.getMyMemberships();
      setSubscriptions(gymRes.data || gymRes.memberships || gymRes || []);

      // Fetch trainer bookings
      const trainerRes = await trainerService.getMyBookings();
      setTrainerBookings(trainerRes.data?.bookings || trainerRes.bookings || trainerRes || []);
    } catch (err) {
      console.warn("Error fetching subscriptions:", err);
      Alert.alert("Error", "Failed to fetch active subscriptions/bookings.");
    } finally {
      setLoadingSubs(false);
    }
  };

  // Account Settings States
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeSettingsSection, setActiveSettingsSection] = useState<'menu' | 'body' | 'diet' | 'trainer' | 'privacy' | 'saved' | 'support' | 'goals' | 'payments'>('menu');

  // 1. Body Measurements
  const [bodyHeight, setBodyHeight] = useState('175');
  const [bodyWeight, setBodyWeight] = useState('70');
  const [bodyChest, setBodyChest] = useState('38');
  const [bodyWaist, setBodyWaist] = useState('32');

  // 2. Diet Preference
  const [dietPref, setDietPref] = useState<'veg' | 'non-veg'>('veg');
  const [dietGoal, setDietGoal] = useState('Lose Weight');
  const [allergies, setAllergies] = useState('Peanuts, Gluten');

  // 3. Trainer Preference
  const [trainerGender, setTrainerGender] = useState<'male' | 'female' | 'any'>('any');
  const [trainerType, setTrainerType] = useState<'online' | 'home' | 'any'>('online');

  // 4. Privacy & Security
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 5. Help & Support
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');

  // 6. Fitness Goals
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState('2200');
  const [dailyWaterTarget, setDailyWaterTarget] = useState('3');

  // Payments History States
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const fetchPaymentsHistory = async () => {
    try {
      setLoadingPayments(true);
      const tempPayments: any[] = [];

      // 1. Fetch memberships
      try {
        const gymRes = await gymService.getMyMemberships();
        const memberships = gymRes.data || gymRes.memberships || gymRes || [];
        memberships.forEach((sub: any) => {
          tempPayments.push({
            id: sub._id || String(Math.random()),
            item: sub.planTitle || 'Gym Membership',
            date: sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
            price: `₹${sub.pricePaid || sub.price || 0}`,
            order: sub.razorpayOrderId || sub.paymentId || 'N/A',
            status: sub.status || 'Success',
            rawDate: sub.createdAt ? new Date(sub.createdAt) : new Date(0),
          });
        });
      } catch (err) {
        console.warn("Error loading gym memberships for payments:", err);
      }

      // 2. Fetch bookings
      try {
        const bookingsRes = await trainerService.getMyBookings();
        const bookings = bookingsRes.data?.bookings || bookingsRes.bookings || bookingsRes || [];
        bookings.forEach((bk: any) => {
          tempPayments.push({
            id: bk._id || String(Math.random()),
            item: `Trainer Session with ${bk.trainerName || bk.trainerId?.name || 'Trainer'}`,
            date: bk.createdAt ? new Date(bk.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
            price: `₹${bk.finalPrice || bk.price || 0}`,
            order: bk.razorpayOrderId || bk.paymentId || 'N/A',
            status: bk.status || 'Success',
            rawDate: bk.createdAt ? new Date(bk.createdAt) : new Date(0),
          });
        });
      } catch (err) {
        console.warn("Error loading trainer bookings for payments:", err);
      }

      // 3. Fetch supplement orders
      try {
        if (healthStoreService && typeof healthStoreService.getOrders === 'function') {
          const storeRes = await healthStoreService.getOrders(1, 20);
          const orders = storeRes.data?.orders || storeRes.orders || storeRes || [];
          if (Array.isArray(orders)) {
            orders.forEach((ord: any) => {
              let itemsStr = 'Health Product';
              if (ord && Array.isArray(ord.items)) {
                itemsStr = ord.items.map((it: any) => it.name || it.product?.name || it.productName || 'Item').join(', ');
              }
              tempPayments.push({
                id: ord._id || String(Math.random()),
                item: itemsStr,
                date: ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
                price: `₹${ord.amountPaid || ord.totalAmount || ord.total || 0}`,
                order: ord.razorpayOrderId || ord.paymentId || 'N/A',
                status: ord.status || 'Success',
                rawDate: ord.createdAt ? new Date(ord.createdAt) : new Date(0),
              });
            });
          }
        }
      } catch (err) {
        console.warn("Error loading store orders for payments:", err);
      }

      // Sort by rawDate descending
      tempPayments.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
      setPaymentsHistory(tempPayments);
    } catch (err) {
      console.warn("Error loading payments history:", err);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    if (activeSettingsSection === 'payments') {
      fetchPaymentsHistory();
    }
  }, [activeSettingsSection]);

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
        if (data) {
          if (data.height) setBodyHeight(String(data.height));
          if (data.weight) setBodyWeight(String(data.weight));
          if (data.fitnessGoal) setDietGoal(data.fitnessGoal);
          if (data.trainerGenderPreference) setTrainerGender(data.trainerGenderPreference);
          if (data.preferredTrainingMode) setTrainerType(data.preferredTrainingMode);
        }
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
            <Text style={[styles.statLabel, { color: colors.subText }]}>Age1</Text>
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

          <TouchableOpacity
            style={[styles.listItem, { borderBottomColor: colors.border }]}
            onPress={fetchSubscriptions}
          >
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

          <TouchableOpacity 
            style={[styles.listItem, { borderBottomColor: colors.border }]}
            onPress={() => {
              setActiveSettingsSection('menu');
              setShowSettingsModal(true);
            }}
          >
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

      {/* Subscriptions List Modal */}
      <Modal
        visible={showSubsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSubsModal(false)}
      >
        <View style={[styles.subsModalOverlay, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.subsModalContent, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <View style={[styles.subsModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.subsModalTitle, { color: colors.text }]}>My Subscriptions</Text>
              <TouchableOpacity onPress={() => setShowSubsModal(false)} style={styles.subsCloseBtn}>
                <Text style={[styles.subsCloseText, { color: colors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  subTab === 'gym' && { borderBottomColor: colors.accent, borderBottomWidth: 3 }
                ]}
                onPress={() => setSubTab('gym')}
              >
                <Text style={[styles.tabButtonText, { color: colors.text, fontWeight: subTab === 'gym' ? '900' : '700' }]}>🏋️ Gym Membership</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  subTab === 'trainer' && { borderBottomColor: colors.accent, borderBottomWidth: 3 }
                ]}
                onPress={() => setSubTab('trainer')}
              >
                <Text style={[styles.tabButtonText, { color: colors.text, fontWeight: subTab === 'trainer' ? '900' : '700' }]}>👤 Trainer Sessions</Text>
              </TouchableOpacity>
            </View>

            {loadingSubs ? (
              <View style={styles.subsLoadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={{ color: colors.subText, marginTop: 12 }}>Fetching Details...</Text>
              </View>
            ) : subTab === 'gym' ? (
              subscriptions.length === 0 ? (
                <View style={styles.subsEmptyContainer}>
                  <Text style={{ fontSize: 40, marginBottom: 10 }}>📦</Text>
                  <Text style={[styles.subsEmptyTitle, { color: colors.text }]}>No Subscriptions Found</Text>
                  <Text style={[styles.subsEmptySub, { color: colors.subText }]}>You don't have any active gym memberships yet.</Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  {subscriptions.map((sub: any) => {
                    const isActive = sub.status === 'active';
                    const isPending = sub.status === 'pending';
                    const badgeColor = isActive ? '#22C55E' : isPending ? '#EAB308' : '#EF4444';

                    return (
                      <View key={sub._id} style={[styles.subItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.subItemCardHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.subGymName, { color: colors.text }]} numberOfLines={1}>{sub.gymName}</Text>
                            <Text style={[styles.subPlanTitle, { color: colors.accent, fontWeight: '700' }]}>{sub.planTitle}</Text>
                          </View>
                          <View style={[styles.subBadge, { backgroundColor: badgeColor + '1A' }]}>
                            <Text style={[styles.subBadgeText, { color: badgeColor }]}>{sub.status.toUpperCase()}</Text>
                          </View>
                        </View>

                        <View style={[styles.dividerHorizontal, { backgroundColor: colors.border, marginVertical: 10 }]} />

                        <View style={styles.subDetailRow}>
                          <Text style={styles.subDetailLabel}>Validity</Text>
                          <Text style={[styles.subDetailValue, { color: colors.text }]}>{sub.duration}</Text>
                        </View>
                        <View style={styles.subDetailRow}>
                          <Text style={styles.subDetailLabel}>Start Date</Text>
                          <Text style={[styles.subDetailValue, { color: colors.text }]}>{sub.startDate ? new Date(sub.startDate).toLocaleDateString('en-IN') : 'N/A'}</Text>
                        </View>
                        <View style={styles.subDetailRow}>
                          <Text style={styles.subDetailLabel}>End Date</Text>
                          <Text style={[styles.subDetailValue, { color: colors.text }]}>{sub.endDate ? new Date(sub.endDate).toLocaleDateString('en-IN') : 'N/A'}</Text>
                        </View>
                        <View style={styles.subDetailRow}>
                          <Text style={styles.subDetailLabel}>Amount Paid</Text>
                          <Text style={[styles.subDetailValue, { color: colors.text, fontWeight: 'bold' }]}>₹{sub.pricePaid}</Text>
                        </View>

                        {sub.invoiceNumber && (
                          <View style={styles.subDetailRow}>
                            <Text style={styles.subDetailLabel}>Invoice No.</Text>
                            <Text style={[styles.subDetailValue, { color: colors.subText, fontSize: 11 }]}>{sub.invoiceNumber}</Text>
                          </View>
                        )}

                        {sub.facilitiesIncluded && sub.facilitiesIncluded.length > 0 && (
                          <>
                            <Text style={[styles.subFacilitiesLabel, { color: colors.text }]}>Facilities Included:</Text>
                            <View style={styles.subFacilitiesContainer}>
                              {sub.facilitiesIncluded.map((fac: string, idx: number) => (
                                <View key={idx} style={styles.subFacilityPill}>
                                  <Text style={styles.subFacilityTick}>✓</Text>
                                  <Text style={[styles.subFacilityText, { color: colors.subText }]}>{fac}</Text>
                                </View>
                              ))}
                            </View>
                          </>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              )
            ) : (
              trainerBookings.length === 0 ? (
                <View style={styles.subsEmptyContainer}>
                  <Text style={{ fontSize: 40, marginBottom: 10 }}>👤</Text>
                  <Text style={[styles.subsEmptyTitle, { color: colors.text }]}>No Bookings Found</Text>
                  <Text style={[styles.subsEmptySub, { color: colors.subText }]}>You don't have any active trainer bookings yet.</Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                  {trainerBookings.map((bk: any) => {
                    const isConfirmed = bk.status === 'confirmed';
                    const isPending = bk.status === 'pending';
                    const badgeColor = isConfirmed ? '#22C55E' : isPending ? '#EAB308' : '#EF4444';
                    
                    const trainerObj = bk.trainerId || {};
                    const trainerName = trainerObj.name || bk.trainerName || 'Trainer Profile';
                    const spec = (trainerObj.specializations?.[0] || trainerObj.specialization?.[0] || 'Fitness Specialist');

                    return (
                      <View key={bk._id} style={[styles.subItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.subItemCardHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.subGymName, { color: colors.text }]} numberOfLines={1}>{trainerName}</Text>
                            <Text style={[styles.subPlanTitle, { color: colors.accent, fontWeight: '700' }]}>{spec}</Text>
                          </View>
                          <View style={[styles.subBadge, { backgroundColor: badgeColor + '1A' }]}>
                            <Text style={[styles.subBadgeText, { color: badgeColor }]}>{bk.status.toUpperCase()}</Text>
                          </View>
                        </View>

                        <View style={[styles.dividerHorizontal, { backgroundColor: colors.border, marginVertical: 10 }]} />

                        <View style={styles.subDetailRow}>
                          <Text style={styles.subDetailLabel}>Date</Text>
                          <Text style={[styles.subDetailValue, { color: colors.text }]}>{bk.date} ({bk.day})</Text>
                        </View>
                        <View style={styles.subDetailRow}>
                          <Text style={styles.subDetailLabel}>Time Slot</Text>
                          <Text style={[styles.subDetailValue, { color: colors.text }]}>{bk.slot}</Text>
                        </View>
                        <View style={styles.subDetailRow}>
                          <Text style={styles.subDetailLabel}>Format Preference</Text>
                          <Text style={[styles.subDetailValue, { color: colors.text }]}>{bk.trainingType || 'Online Live'}</Text>
                        </View>
                        <View style={styles.subDetailRow}>
                          <Text style={styles.subDetailLabel}>Amount Paid</Text>
                          <Text style={[styles.subDetailValue, { color: colors.text, fontWeight: 'bold' }]}>₹{bk.price}</Text>
                        </View>

                        {bk.phone && (
                          <View style={styles.subDetailRow}>
                            <Text style={styles.subDetailLabel}>Contact Phone</Text>
                            <Text style={[styles.subDetailValue, { color: colors.text }]}>{bk.phone}</Text>
                          </View>
                        )}

                        {bk.address && (
                          <View style={{ marginTop: 8 }}>
                            <Text style={styles.subDetailLabel}>Training Location</Text>
                            <Text style={[styles.subDetailValue, { color: colors.subText, fontSize: 12, marginTop: 2 }]} numberOfLines={2}>{bk.address}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              )
            )}
          </View>
        </View>
      </Modal>

      {/* Account Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (activeSettingsSection === 'menu') setShowSettingsModal(false);
          else setActiveSettingsSection('menu');
        }}
      >
        <View style={[styles.subsModalOverlay, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.92)' : 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.subsModalContent, { backgroundColor: colors.bg, borderColor: colors.border, height: '90%' }]}>
            {/* Header */}
            <View style={[styles.subsModalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {activeSettingsSection !== 'menu' && (
                  <TouchableOpacity onPress={() => setActiveSettingsSection('menu')} style={{ marginRight: 12 }}>
                    <Text style={[styles.subsCloseText, { color: colors.text, fontSize: 20 }]}>←</Text>
                  </TouchableOpacity>
                )}
                <Text style={[styles.subsModalTitle, { color: colors.text }]}>
                  {activeSettingsSection === 'menu' && 'Account Settings'}
                  {activeSettingsSection === 'body' && 'Body Measurements'}
                  {activeSettingsSection === 'diet' && 'Diet Preferences'}
                  {activeSettingsSection === 'trainer' && 'Trainer Preferences'}
                  {activeSettingsSection === 'privacy' && 'Privacy & Security'}
                  {activeSettingsSection === 'saved' && 'Saved Gyms & Favorites'}
                  {activeSettingsSection === 'support' && 'Help & Support'}
                  {activeSettingsSection === 'goals' && 'Fitness Goals'}
                  {activeSettingsSection === 'payments' && 'Payment History'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)} style={styles.subsCloseBtn}>
                <Text style={[styles.subsCloseText, { color: colors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Content Switcher */}
            {activeSettingsSection === 'menu' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {[
                  { key: 'body', label: 'Body Measurements', desc: 'Height, weight, chest, waist & BMI', icon: '📏' },
                  { key: 'diet', label: 'Diet Preferences', desc: 'Veg/Non-veg details, allergies', icon: '🥗' },
                  { key: 'trainer', label: 'Trainer Preferences', desc: 'Gender preferences & visit mode', icon: '🏋️' },
                  { key: 'goals', label: 'Fitness Goals', desc: 'Daily calorie, water & sleep targets', icon: '🎯' },
                  { key: 'privacy', label: 'Privacy & Security', desc: 'Change password & active devices', icon: '🔒' },
                  { key: 'saved', label: 'Saved Gyms & Favorites', desc: 'Saved trainers and gyms', icon: '⭐' },
                  { key: 'payments', label: 'Payment History', desc: 'Past membership purchases & receipts', icon: '🧾' },
                  { key: 'support', label: 'Help & Support', desc: 'FAQ, raised tickets & support', icon: '💬' },
                ].map((item) => (
                  <TouchableOpacity 
                    key={item.key} 
                    style={[styles.settingsMenuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setActiveSettingsSection(item.key as any)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Text style={{ fontSize: 24, marginRight: 16 }}>{item.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.settingsMenuLabel, { color: colors.text }]}>{item.label}</Text>
                        <Text style={[styles.settingsMenuDesc, { color: colors.subText }]} numberOfLines={1}>{item.desc}</Text>
                      </View>
                    </View>
                    <Text style={[styles.listArrow, { color: colors.subText }]}>›</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* 1. Body Measurements */}
            {activeSettingsSection === 'body' && (() => {
              const hVal = parseFloat(bodyHeight) || 0;
              const wVal = parseFloat(bodyWeight) || 0;
              const bmi = hVal > 0 ? (wVal / ((hVal / 100) * (hVal / 100))).toFixed(1) : '0.0';
              const bmiNum = parseFloat(bmi);
              let bmiCategory = 'Underweight';
              let bmiColor = '#3B82F6';
              if (bmiNum >= 18.5 && bmiNum < 25) {
                bmiCategory = 'Normal Weight';
                bmiColor = '#22C55E';
              } else if (bmiNum >= 25) {
                bmiCategory = 'Overweight';
                bmiColor = '#EF4444';
              }

              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={[styles.bmiDisplayCard, { backgroundColor: bmiColor + '1A', borderColor: bmiColor }]}>
                    <Text style={[styles.bmiTitleText, { color: colors.text }]}>Body Mass Index (BMI)</Text>
                    <Text style={[styles.bmiNumberText, { color: bmiColor }]}>{bmi}</Text>
                    <Text style={[styles.bmiStatusText, { color: colors.text }]}>{bmiCategory}</Text>
                  </View>

                  <View style={styles.formContainer}>
                    <Text style={[styles.formLabel, { color: colors.subText }]}>Height (cm)</Text>
                    <TextInput 
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} 
                      value={bodyHeight}
                      onChangeText={setBodyHeight}
                      keyboardType="numeric"
                    />

                    <Text style={[styles.formLabel, { color: colors.subText }]}>Weight (kg)</Text>
                    <TextInput 
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} 
                      value={bodyWeight}
                      onChangeText={setBodyWeight}
                      keyboardType="numeric"
                    />

                    <Text style={[styles.formLabel, { color: colors.subText }]}>Chest Size (inches)</Text>
                    <TextInput 
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} 
                      value={bodyChest}
                      onChangeText={setBodyChest}
                      keyboardType="numeric"
                    />

                    <Text style={[styles.formLabel, { color: colors.subText }]}>Waist Size (inches)</Text>
                    <TextInput 
                      style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} 
                      value={bodyWaist}
                      onChangeText={setBodyWaist}
                      keyboardType="numeric"
                    />
                  </View>

                  {/* Progress lines */}
                  <Text style={[styles.formLabel, { color: colors.subText, marginTop: 10 }]}>Measurement Progress Tracking</Text>
                  <View style={[styles.progressTrackingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.progressDetailRow}>
                      <Text style={[styles.progressItemLabel, { color: colors.text }]}>Weight Target (Ideal: 68kg)</Text>
                      <Text style={[styles.progressItemValue, { color: colors.accent }]}>70% Achieved</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: '70%', backgroundColor: colors.accent }]} />
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={[styles.settingsActionBtn, { backgroundColor: colors.accent }]}
                    onPress={() => Alert.alert("Success", "Measurements saved successfully!")}
                  >
                    <Text style={{ color: colors.buttonText, fontWeight: '800' }}>Save Measurements</Text>
                  </TouchableOpacity>
                </ScrollView>
              );
            })()}

            {/* 2. Diet Preferences */}
            {activeSettingsSection === 'diet' && (
              <DietPreferencesScreen 
                isDarkMode={isDarkMode} 
                onBack={() => setActiveSettingsSection('menu')} 
              />
            )}

            {/* 3. Trainer Preferences */}
            {activeSettingsSection === 'trainer' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.formLabel, { color: colors.subText }]}>Trainer Gender Preference</Text>
                <View style={styles.radioGroup}>
                  {[
                    { key: 'male', label: 'Male' },
                    { key: 'female', label: 'Female' },
                    { key: 'any', label: 'No Preference' }
                  ].map((item) => (
                    <TouchableOpacity 
                      key={item.key} 
                      style={styles.radioOption}
                      onPress={() => setTrainerGender(item.key as any)}
                    >
                      <View style={[styles.radioCircle, { borderColor: trainerGender === item.key ? colors.accent : colors.border }]}>
                        {trainerGender === item.key && <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />}
                      </View>
                      <Text style={[styles.radioLabel, { color: colors.text }]}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.formLabel, { color: colors.subText, marginTop: 24 }]}>Preferred Training Mode</Text>
                <View style={styles.radioGroup}>
                  {[
                    { key: 'online', label: 'Online Live sessions' },
                    { key: 'home', label: 'Home Visit' },
                    { key: 'any', label: 'Either / Both' }
                  ].map((item) => (
                    <TouchableOpacity 
                      key={item.key} 
                      style={styles.radioOption}
                      onPress={() => setTrainerType(item.key as any)}
                    >
                      <View style={[styles.radioCircle, { borderColor: trainerType === item.key ? colors.accent : colors.border }]}>
                        {trainerType === item.key && <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />}
                      </View>
                      <Text style={[styles.radioLabel, { color: colors.text }]}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                 <TouchableOpacity 
                  style={[styles.settingsActionBtn, { backgroundColor: colors.accent, marginTop: 30 }]}
                  onPress={async () => {
                    try {
                      const res = await profileService.updateProfile({
                        trainerGenderPreference: trainerGender,
                        preferredTrainingMode: trainerType
                      });
                      if (res.success) {
                        Alert.alert("Success", "Trainer preferences updated successfully!");
                      } else {
                        Alert.alert("Error", res.message || "Failed to update preferences");
                      }
                    } catch (err: any) {
                      console.error("Save trainer preferences error:", err);
                      Alert.alert("Error", err.message || "An error occurred while saving.");
                    }
                  }}
                >
                  <Text style={{ color: colors.buttonText, fontWeight: '800' }}>Save Preferences</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* 4. Privacy & Security */}
            {activeSettingsSection === 'privacy' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.formLabel, { color: colors.subText }]}>Change Password</Text>
                <TextInput 
                  style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} 
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  secureTextEntry={true}
                  placeholder="Old Password"
                  placeholderTextColor="#64748B"
                />
                <TextInput 
                  style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} 
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={true}
                  placeholder="New Password"
                  placeholderTextColor="#64748B"
                />
                <TextInput 
                  style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} 
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={true}
                  placeholder="Confirm New Password"
                  placeholderTextColor="#64748B"
                />

                <TouchableOpacity 
                  style={[styles.settingsActionBtn, { backgroundColor: colors.accent, marginTop: 8 }]}
                  onPress={() => {
                    if (newPassword !== confirmPassword) {
                      Alert.alert("Error", "Passwords do not match!");
                      return;
                    }
                    Alert.alert("Success", "Password updated successfully!");
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  <Text style={{ color: colors.buttonText, fontWeight: '800' }}>Update Password</Text>
                </TouchableOpacity>

                {/* Login Devices */}
                <Text style={[styles.formLabel, { color: colors.subText, marginTop: 24 }]}>Active Login Devices</Text>
                <View style={[styles.detailsList, { borderColor: colors.border, padding: 12 }]}>
                  {[
                    { device: 'Samsung Galaxy S23 (This Phone)', location: 'Latur, India', time: 'Active Now' },
                    { device: 'Chrome Browser on Windows', location: 'Pune, India', time: 'Yesterday' }
                  ].map((dev, idx) => (
                    <View key={idx} style={{ marginVertical: 6 }}>
                      <Text style={{ fontSize: 13, color: colors.text, fontWeight: '700' }}>💻 {dev.device}</Text>
                      <Text style={{ fontSize: 11, color: colors.subText }}>📍 {dev.location} · {dev.time}</Text>
                    </View>
                  ))}
                  <TouchableOpacity onPress={() => Alert.alert("Devices Cleared", "Successfully logged out of all other devices.")}>
                    <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 12, marginTop: 8 }}>Log out all other devices</Text>
                  </TouchableOpacity>
                </View>

                {/* Delete Account */}
                <TouchableOpacity 
                  style={[styles.settingsActionBtn, { backgroundColor: '#EF4444', marginTop: 20 }]}
                  onPress={() => {
                    Alert.alert(
                      "Delete Account",
                      "Are you sure you want to permanently delete your account? This action cannot be undone.",
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete Permanently", style: "destructive", onPress: onLogout }
                      ]
                    );
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>🚨 Delete Account Permanently</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* 5. Saved Gyms & Favorites */}
            {activeSettingsSection === 'saved' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.formLabel, { color: colors.subText }]}>Liked Gyms</Text>
                {(!profile?.favoriteGyms || profile.favoriteGyms.length === 0) ? (
                  <Text style={{ color: colors.subText, fontSize: 13, marginVertical: 10, fontStyle: 'italic' }}>No saved gyms yet.</Text>
                ) : (
                  profile.favoriteGyms.map((item, idx) => {
                    const loc = item.address || item.location?.address || 'Pune, Maharashtra';
                    const rating = item.rating ? `${Number(item.rating).toFixed(1)} ★` : '4.5 ★';
                    return (
                      <View key={item._id || idx} style={[styles.favoriteItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '800', color: colors.text }}>🏋️ {item.name}</Text>
                          <Text style={{ fontSize: 12, color: colors.subText, marginTop: 2 }}>📍 {loc}</Text>
                        </View>
                        <Text style={{ color: colors.accent, fontWeight: 'bold' }}>{rating}</Text>
                      </View>
                    );
                  })
                )}

                <Text style={[styles.formLabel, { color: colors.subText, marginTop: 20 }]}>Favorite Trainers</Text>
                {(!profile?.favoriteTrainers || profile.favoriteTrainers.length === 0) ? (
                  <Text style={{ color: colors.subText, fontSize: 13, marginVertical: 10, fontStyle: 'italic' }}>No saved trainers yet.</Text>
                ) : (
                  profile.favoriteTrainers.map((item, idx) => {
                    const exp = item.experience ? `${item.experience} Years Experience` : 'Experienced';
                    const spec = (item.specializations || item.specialization)?.join(', ') || 'Fitness Trainer';
                    return (
                      <View key={item._id || idx} style={[styles.favoriteItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '800', color: colors.text }}>🎓 {item.name}</Text>
                          <Text style={{ fontSize: 12, color: colors.subText, marginTop: 2 }}>⏳ {exp} · {spec}</Text>
                        </View>
                        <Text style={{ fontSize: 18 }}>❤️</Text>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}

            {/* 6. Fitness Goals */}
            {activeSettingsSection === 'goals' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.formLabel, { color: colors.subText }]}>Daily Target Goals</Text>
                <View style={styles.formContainer}>
                  <Text style={[styles.formLabel, { color: colors.subText }]}>Calorie Intake Target (kcal)</Text>
                  <TextInput 
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} 
                    value={dailyCalorieTarget}
                    onChangeText={setDailyCalorieTarget}
                    keyboardType="numeric"
                  />

                  <Text style={[styles.formLabel, { color: colors.subText }]}>Water Intake Target (Liters)</Text>
                  <TextInput 
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} 
                    value={dailyWaterTarget}
                    onChangeText={setDailyWaterTarget}
                    keyboardType="numeric"
                  />
                </View>

                {/* Target Progress Card */}
                <View style={[styles.progressTrackingCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 10 }]}>
                  <Text style={{ fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>Today's Goal Accomplishments</Text>
                  <View style={styles.progressDetailRow}>
                    <Text style={{ fontSize: 12, color: colors.subText }}>Water Drunk: 2.1L / {dailyWaterTarget}L</Text>
                    <Text style={{ fontSize: 12, color: colors.accent, fontWeight: 'bold' }}>70%</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: '70%', backgroundColor: colors.accent }]} />
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.settingsActionBtn, { backgroundColor: colors.accent, marginTop: 24 }]}
                  onPress={() => Alert.alert("Success", "Fitness targets updated successfully!")}
                >
                  <Text style={{ color: colors.buttonText, fontWeight: '800' }}>Save Daily Target</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {/* 7. Payment History */}
            {activeSettingsSection === 'payments' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.formLabel, { color: colors.subText }]}>Purchase Transaction History</Text>
                
                {loadingPayments ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={colors.accent} />
                  </View>
                ) : paymentsHistory.length === 0 ? (
                  <Text style={{ color: colors.subText, fontSize: 13, marginVertical: 10, fontStyle: 'italic', textAlign: 'center' }}>No transaction history found.</Text>
                ) : (
                  paymentsHistory.map((item) => (
                    <View key={item.id} style={[styles.favoriteItemCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: 'column', alignItems: 'stretch' }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontWeight: '800', color: colors.text, flex: 1, marginRight: 8 }} numberOfLines={2}>🧾 {item.item}</Text>
                        <Text style={{ color: colors.accent, fontWeight: '900' }}>{item.price}</Text>
                      </View>
                      <Text style={{ fontSize: 11, color: colors.subText, marginTop: 4 }}>Date: {item.date} · Order: {item.order}</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                        <Text style={{ color: item.status?.toLowerCase() === 'failed' ? '#EF4444' : '#22C55E', fontWeight: 'bold', fontSize: 11 }}>● {item.status}</Text>
                        <TouchableOpacity onPress={() => {
                          setSelectedInvoice(item);
                          setShowInvoiceModal(true);
                        }}>
                          <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 12 }}>View Invoice</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            {/* 8. Help & Support */}
            {activeSettingsSection === 'support' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.formLabel, { color: colors.subText }]}>Frequently Asked Questions</Text>
                {[
                  { q: 'How to enter physical gyms?', a: 'Once you buy a membership, click "My Subscriptions" in the profile tab to show your entry QR code at the gym desk.' },
                  { q: 'Can I cancel my membership?', a: 'All purchases are subject to a non-refundable policy. You can contact support for exceptions.' },
                  { q: 'How to buy supplements?', a: 'Navigate to the Deals tab in bottom navigation to visit our Health Store.' }
                ].map((item, idx) => (
                  <View key={idx} style={[styles.detailsList, { borderColor: colors.border, marginVertical: 6, padding: 12 }]}>
                    <Text style={{ fontWeight: '800', color: colors.text, fontSize: 13 }}>Q: {item.q}</Text>
                    <Text style={{ fontSize: 12, color: colors.subText, marginTop: 4 }}>A: {item.a}</Text>
                  </View>
                ))}

                <Text style={[styles.formLabel, { color: colors.subText, marginTop: 20 }]}>Raise Support Ticket</Text>
                <View style={styles.formContainer}>
                  <Text style={[styles.formLabel, { color: colors.subText }]}>Subject</Text>
                  <TextInput 
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} 
                    value={ticketSubject}
                    onChangeText={setTicketSubject}
                    placeholder="Brief description of issue"
                    placeholderTextColor="#64748B"
                  />

                  <Text style={[styles.formLabel, { color: colors.subText }]}>Message</Text>
                  <TextInput 
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card, height: 80 }]} 
                    value={ticketMessage}
                    onChangeText={setTicketMessage}
                    multiline={true}
                    placeholder="Enter detailed message..."
                    placeholderTextColor="#64748B"
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.settingsActionBtn, { backgroundColor: colors.accent }]}
                  onPress={() => {
                    if (!ticketSubject.trim() || !ticketMessage.trim()) {
                      Alert.alert("Error", "Please fill in all fields.");
                      return;
                    }
                    Alert.alert("Success", "Ticket raised successfully! Support team will contact you shortly.");
                    setTicketSubject('');
                    setTicketMessage('');
                  }}
                >
                  <Text style={{ color: colors.buttonText, fontWeight: '800' }}>Submit Ticket</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Invoice Details Modal */}
      <Modal
        visible={showInvoiceModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowInvoiceModal(false)}
      >
        <View style={[styles.subsModalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.subsModalContent, { backgroundColor: colors.bg, borderColor: colors.border, maxHeight: '80%' }]}>
            <View style={[styles.subsModalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.subsModalTitle, { color: colors.text }]}>Invoice Details</Text>
              <TouchableOpacity onPress={() => setShowInvoiceModal(false)} style={styles.subsCloseBtn}>
                <Text style={[styles.subsCloseText, { color: colors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedInvoice && (() => {
              const cleanPriceStr = selectedInvoice.price?.replace(/[^\d]/g, '') || '0';
              const totalAmount = Number(cleanPriceStr);
              const subtotal = Math.round((totalAmount / 1.18) * 100) / 100;
              const gst = Math.round((totalAmount - subtotal) * 100) / 100;

              return (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
                  {/* Bill Layout */}
                  <View style={{ alignItems: 'center', marginBottom: 20 }}>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>🧾</Text>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: colors.text, textAlign: 'center' }}>LiveSale Fitness Invoice</Text>
                    <Text style={{ fontSize: 12, color: colors.subText, marginTop: 4 }}>Invoice No: {selectedInvoice.order || 'INV-TEMP'}</Text>
                    <Text style={{ fontSize: 12, color: colors.subText }}>Date: {selectedInvoice.date}</Text>
                  </View>

                  <View style={[styles.dividerHorizontal, { backgroundColor: colors.border, marginVertical: 12 }]} />

                  {/* Customer Info */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontWeight: '800', color: colors.text, fontSize: 14, marginBottom: 6 }}>Billed To:</Text>
                    <Text style={{ color: colors.subText, fontSize: 12 }}>Name: {profile?.name || 'User'}</Text>
                    <Text style={{ color: colors.subText, fontSize: 12 }}>Email: {profile?.email || 'N/A'}</Text>
                    <Text style={{ color: colors.subText, fontSize: 12 }}>Phone: {profile?.phone || 'N/A'}</Text>
                  </View>

                  <View style={[styles.dividerHorizontal, { backgroundColor: colors.border, marginVertical: 12 }]} />

                  {/* Items list */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontWeight: '800', color: colors.text, fontSize: 14, marginBottom: 8 }}>Item Details:</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                      <Text style={{ color: colors.text, fontSize: 13, flex: 1, marginRight: 8 }}>{selectedInvoice.item}</Text>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>{selectedInvoice.price}</Text>
                    </View>
                  </View>

                  <View style={[styles.dividerHorizontal, { backgroundColor: colors.border, marginVertical: 12 }]} />

                  {/* Pricing Breakdown */}
                  <View style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 3 }}>
                      <Text style={{ color: colors.subText, fontSize: 12 }}>Subtotal (Excl. GST)</Text>
                      <Text style={{ color: colors.text, fontSize: 12 }}>₹{subtotal.toFixed(2)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 3 }}>
                      <Text style={{ color: colors.subText, fontSize: 12 }}>GST (18%)</Text>
                      <Text style={{ color: colors.text, fontSize: 12 }}>₹{gst.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.dividerHorizontal, { backgroundColor: colors.border, marginVertical: 8 }]} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontWeight: '800', color: colors.text, fontSize: 14 }}>Total Paid (Incl. GST)</Text>
                      <Text style={{ fontWeight: '900', color: colors.accent, fontSize: 16 }}>{selectedInvoice.price}</Text>
                    </View>
                  </View>

                  <View style={{ backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 24 }}>
                    <Text style={{ color: '#22C55E', fontWeight: 'bold', fontSize: 12 }}>● PAYMENT SUCCESSFUL</Text>
                    <Text style={{ color: colors.subText, fontSize: 10, marginTop: 4, textAlign: 'center' }}>This is an electronically generated receipt. No signature required.</Text>
                  </View>

                  {/* Action Buttons Row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <TouchableOpacity
                      style={[styles.settingsActionBtn, { backgroundColor: '#3B82F6', flex: 1, marginRight: 8 }]}
                      onPress={async () => {
                        try {
                          const base = Api.defaults.baseURL || 'http://localhost:5001/api';
                          const downloadUrl = `${base}/auth/favorites/invoices/download?item=${encodeURIComponent(selectedInvoice.item)}&price=${encodeURIComponent(selectedInvoice.price)}&date=${encodeURIComponent(selectedInvoice.date)}&order=${encodeURIComponent(selectedInvoice.order)}&userName=${encodeURIComponent(profile?.name || 'User')}&userEmail=${encodeURIComponent(profile?.email || 'N/A')}&userPhone=${encodeURIComponent(profile?.phone || 'N/A')}`;
                          
                          await Linking.openURL(downloadUrl);
                        } catch (err: any) {
                          Alert.alert("Error", "Could not start download: " + (err.message || ''));
                        }
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>📥 Download</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.settingsActionBtn, { backgroundColor: colors.accent, flex: 1, marginLeft: 8 }]}
                      onPress={async () => {
                        try {
                          const invoiceText = `
-----------------------------------------
         LIVESALE FITNESS RECEIPT         
-----------------------------------------
Invoice No: ${selectedInvoice.order || 'N/A'}
Date: ${selectedInvoice.date}
Status: PAID / SUCCESSFUL

BILLED TO:
Name: ${profile?.name || 'User'}
Email: ${profile?.email || 'N/A'}
Phone: ${profile?.phone || 'N/A'}

ITEM DETAILS:
${selectedInvoice.item}
Total Paid: ${selectedInvoice.price}

PRICE BREAKDOWN:
Subtotal (Excl. GST): ₹${subtotal.toFixed(2)}
GST (18%): ₹${gst.toFixed(2)}
Total Amount Paid: ${selectedInvoice.price}

Thank you for your purchase!
LiveSale Fitness
-----------------------------------------
`;
                          await Share.share({
                            message: invoiceText,
                            title: 'LiveSale Fitness Receipt',
                          });
                        } catch (err: any) {
                          Alert.alert("Error", err.message || "Failed to share/save invoice.");
                        }
                      }}
                    >
                      <Text style={{ color: colors.buttonText, fontWeight: '800' }}>📤 Share</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              );
            })()}
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
  dividerHorizontal: {
    height: 1,
    width: '100%',
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
  // Subscription list modal styles
  subsModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  subsModalContent: {
    width: '100%',
    height: '85%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  subsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  subsModalTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  subsCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subsCloseText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subsLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subsEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  subsEmptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  subsEmptySub: {
    fontSize: 13,
    textAlign: 'center',
  },
  subItemCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  subItemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  subGymName: {
    fontSize: 16,
    fontWeight: '800',
  },
  subPlanTitle: {
    fontSize: 13,
    marginTop: 2,
  },
  subBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  subDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  subDetailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  subDetailValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  subFacilitiesLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 8,
  },
  subFacilitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subFacilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  subFacilityTick: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 6,
  },
  subFacilityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  settingsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  settingsMenuLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  settingsMenuDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  bmiDisplayCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  bmiTitleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bmiNumberText: {
    fontSize: 32,
    fontWeight: '900',
    marginVertical: 4,
  },
  bmiStatusText: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressTrackingCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  progressDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressItemLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressItemValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  settingsActionBtn: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  dietSelectorRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dietSelectCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  dietCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  favoriteItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  formContainer: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 14,
  },
  radioGroup: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  detailsList: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonText: {
    fontSize: 14,
  },
});

export default Profile;
