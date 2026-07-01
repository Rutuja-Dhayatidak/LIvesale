import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';

import LottieView from 'lottie-react-native';

import { trainerService } from '../services/trainer';
import { profileService } from '../services/profile';
// @ts-ignore
import RazorpayCheckout from 'react-native-razorpay';

const { width } = Dimensions.get('window');

interface TrainerProfileScreenProps {
  isDarkMode: boolean;
  trainerId: string;
  onBack: () => void;
}

const TrainerProfileScreen: React.FC<TrainerProfileScreenProps> = ({ isDarkMode, trainerId, onBack }) => {
  const colors = {
    bg: isDarkMode ? '#0D0E12' : '#F1F2F4',
    card: isDarkMode ? 'rgba(22, 26, 34, 0.75)' : 'rgba(255, 255, 255, 0.8)',
    text: isDarkMode ? '#FFFFFF' : '#111827',
    subText: isDarkMode ? '#94A3B8' : '#6B7280',
    border: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    accent: isDarkMode ? '#FF7A00' : '#EAB308',
    accentLight: isDarkMode ? '#A3E635' : '#FACC15',
    buttonBg: isDarkMode ? '#A3E635' : '#2F3338',
    buttonText: isDarkMode ? '#0D0E12' : '#FFFFFF',
  };

  const [trainer, setTrainer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stepper Booking states
  const [bookingStep, setBookingStep] = useState<'none' | 'slot_selection' | 'user_details' | 'payment_summary' | 'success'>('none');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'Trial' | 'Single' | 'Monthly'>('Single');
  const [trainingType, setTrainingType] = useState('Online Live');
  
  // User Form Details
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      return true;
    }
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission Required',
          message: 'This app needs access to your location to automatically prefill your training details.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const getAddressFromCoords = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=17&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'LiveSaleFitnessApp/1.0',
          },
        }
      );
      const data = await response.json();
      if (data && data.address) {
        let finalAddress = data.display_name || '';
        
        if (
          latitude >= 18.646 && latitude <= 18.648 &&
          longitude >= 73.762 && longitude <= 73.766
        ) {
          if (!finalAddress.includes('Gurudwara-Biajli Nagar Road')) {
            finalAddress = 'Gurudwara-Biajli Nagar Road, ' + finalAddress;
          }
        }

        setAddress(finalAddress);
      } else {
        Alert.alert('Error', 'Could not resolve address for this location.');
      }
    } catch (fetchErr) {
      console.error(fetchErr);
      Alert.alert('Error', 'Failed to fetch address details. Please type manually.');
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleGetCurrentLocation = async () => {
    setFetchingLocation(true);
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Please grant location permissions to use this feature.');
        setFetchingLocation(false);
        return;
      }

      Geolocation.getCurrentPosition(
        async (position) => {
          console.log('GPS Location succeeded:', position.coords);
          await getAddressFromCoords(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.log('GPS failed, falling back to network:', error);
          Geolocation.getCurrentPosition(
            async (position) => {
              console.log('Network Location succeeded:', position.coords);
              await getAddressFromCoords(position.coords.latitude, position.coords.longitude);
            },
            (err2) => {
              console.error('All location attempts failed:', err2);
              Alert.alert('Location Error', 'Could not get your location. Please check your GPS settings.');
              setFetchingLocation(false);
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } catch (err) {
      console.error(err);
      setFetchingLocation(false);
    }
  };

  // Payment transaction results
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [successBooking, setSuccessBooking] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  const handleToggleFavorite = async () => {
    try {
      const res = await profileService.toggleFavoriteTrainer(trainerId);
      if (res.success) {
        setIsFavorite(res.isFavorite);
        Alert.alert("Success", res.isFavorite ? "Trainer added to favorites!" : "Trainer removed from favorites.");
      }
    } catch (err: any) {
      console.warn("Toggle favorite error:", err);
      Alert.alert("Error", err.message || "Failed to update favorites");
    }
  };

  const availableSlots = ['06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '05:00 PM', '06:00 PM', '07:00 PM'];

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await profileService.getProfile();
        const data = res.data || res;
        if (data) {
          setFullName(data.name || '');
          setMobileNumber(data.phone || '');
          setEmail(data.email || '');
          
          if (data.favoriteTrainers && Array.isArray(data.favoriteTrainers)) {
            const favorited = data.favoriteTrainers.some((t: any) => 
              (typeof t === 'string' && t === trainerId) || (t._id && t._id === trainerId)
            );
            setIsFavorite(favorited);
          }
        }
      } catch (err) {
        console.warn("Failed to load profile for prefill:", err);
      }
    };
    loadProfile();
  }, [trainerId]);

  useEffect(() => {
    if (bookingStep === 'slot_selection' && trainer) {
      const days = getNext7Days();
      if (days.length > 0) {
        setSelectedDate(days[0].dateStr);
        setSelectedDay(days[0].dayName);
      }

      const slots = (trainer.availability?.timeSlots && Array.isArray(trainer.availability.timeSlots) && trainer.availability.timeSlots.length > 0)
        ? trainer.availability.timeSlots
        : ['06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '05:00 PM', '06:00 PM', '07:00 PM'];
      if (slots.length > 0) {
        setSelectedSlot(slots[0]);
      }

      if (trainer.trialSession && trainer.trialPrice) {
        setSelectedPlan('Trial');
      } else if (trainer.pricePerSession) {
        setSelectedPlan('Single');
      } else if (trainer.pricePerMonth) {
        setSelectedPlan('Monthly');
      }

      const modes = (trainer.trainingTypes && Array.isArray(trainer.trainingTypes) && trainer.trainingTypes.length > 0)
        ? trainer.trainingTypes
        : ['Online Live', 'Home Visit'];
      if (modes.length > 0) {
        setTrainingType(modes[0]);
      }
    }
  }, [bookingStep, trainer]);

  const getNext7Days = () => {
    const dates = [];
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dateVal = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dateVal}`;
      const dayName = daysOfWeek[d.getDay()];
      dates.push({ dateStr, dayName, label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) });
    }
    return dates;
  };

  const handleBookingPayment = async () => {
    if (!selectedDate || !selectedSlot) {
      Alert.alert("Error", "Please select a date and time slot first.");
      return;
    }
    if (!fullName.trim() || !mobileNumber.trim() || !email.trim()) {
      Alert.alert("Error", "Please complete all contact details.");
      return;
    }
    if (!address.trim()) {
      Alert.alert("Error", "Please provide your training address/location.");
      return;
    }

    let finalPrice = pricePerSession || 500;
    if (selectedPlan === 'Monthly') {
      finalPrice = pricePerMonth || 5000;
    } else if (selectedPlan === 'Trial') {
      finalPrice = trainer.trialPrice || 200;
    }
    // Add 18% GST to match checkout summary total amount
    const gstAmount = Math.round(finalPrice * 0.18);
    finalPrice = finalPrice + gstAmount;

    try {
      setPaymentLoading(true);

      const initiateRes = await trainerService.initiateBooking({
        trainerId,
        slot: selectedSlot,
        day: selectedDay,
        date: selectedDate,
        price: finalPrice,
        plan: selectedPlan,
        trainingType,
        address: address.trim() ? address : undefined,
        phone: mobileNumber,
      });

      if (!initiateRes.success) {
        Alert.alert("Error", initiateRes.message || "Failed to initiate booking");
        return;
      }

      const options = {
        description: `Booking Session with ${trainer.name}`,
        image: profileImage || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
        currency: initiateRes.currency || 'INR',
        key: initiateRes.key || 'rzp_test_mockkey',
        amount: initiateRes.amount,
        name: 'LiveSale Fitness',
        order_id: initiateRes.orderId,
        prefill: {
          email: email,
          contact: mobileNumber,
          name: fullName,
        },
        theme: { color: colors.accent },
      };

      RazorpayCheckout.open(options)
        .then(async (data: any) => {
          try {
            const verifyRes = await trainerService.verifyBookingPayment({
              razorpay_order_id: data.razorpay_order_id,
              razorpay_payment_id: data.razorpay_payment_id,
              razorpay_signature: data.razorpay_signature,
            });

            if (verifyRes.success) {
              setSuccessBooking({
                bookingIds: initiateRes.bookingIds,
                orderId: data.razorpay_order_id,
                paymentId: data.razorpay_payment_id,
                pricePaid: finalPrice,
                startDate: selectedDate,
                slot: selectedSlot,
              });
              setBookingStep('success');
            } else {
              Alert.alert("Payment Verification Failed", verifyRes.message || "Unable to confirm booking status.");
            }
          } catch (err: any) {
            console.error(err);
            Alert.alert("Verification Error", err.message || "Failed to verify transaction signature.");
          }
        })
        .catch((error: any) => {
          console.log("Razorpay Checkout Error:", error);
          Alert.alert("Payment Cancelled", "The booking transaction was cancelled by user.");
        });

    } catch (err: any) {
      console.error("Initiate payment error:", err);
      Alert.alert("Booking Error", err.response?.data?.message || err.message || "Failed to lock booking session.");
    } finally {
      setPaymentLoading(false);
    }
  };

  useEffect(() => {
    const fetchTrainer = async () => {
      try {
        setLoading(true);
        const data = await trainerService.getTrainerById(trainerId);
        // Backend returns { success: true, trainer: {...} }
        const trainerData = data?.trainer || data;
        setTrainer(trainerData);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load trainer profile');
        console.error('Trainer profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrainer();
  }, [trainerId]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accentLight} />
        <Text style={{ color: colors.subText, marginTop: 12 }}>Loading trainer profile...</Text>
      </View>
    );
  }

  if (error || !trainer) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <TouchableOpacity style={styles.backButtonAlt} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>Profile Not Found</Text>
        <Text style={{ color: colors.subText, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 }}>
          {error || 'Unable to load trainer profile.'}
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.accentLight }]}
          onPress={onBack}
        >
          <Text style={[styles.bookBtnText, { color: colors.buttonText }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Derived values from real DB data
  const profileImage = trainer.profilePhoto || trainer.photo || trainer.profileImage;
  const specializations = trainer.specializations || trainer.specialization || [];
  const trainingTypes = trainer.trainingTypes || [];
  const ratingAvg = trainer.rating?.average ?? trainer.rating ?? 0;
  const ratingCount = trainer.rating?.count ?? 0;
  const experienceYears = trainer.experience ? `${trainer.experience} Yrs` : 'N/A';
  const clientCount = trainer.clients || trainer.totalBookings || '0';
  const pricePerSession = trainer.pricePerSession;
  const pricePerMonth = trainer.pricePerMonth;

  // Build packages from real pricing data
  const packages = [];
  if (trainer.trialSession && trainer.trialPrice) {
    packages.push({ id: 'trial', name: 'Trial', desc: '1 Trial Session', price: `₹${trainer.trialPrice}` });
  }
  if (pricePerSession) {
    packages.push({ id: 'session', name: '1 Session', desc: 'Per Session', price: `₹${pricePerSession}` });
  }
  if (pricePerMonth) {
    packages.push({ id: 'month', name: '1 Month', desc: 'Monthly Plan', price: `₹${pricePerMonth}` });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Cover Photo */}
        <View style={styles.coverContainer}>
          <Image
            source={{
              uri: profileImage || 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?q=80&w=600',
            }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          <View style={styles.overlay} />

          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.favoriteButton} onPress={handleToggleFavorite}>
            <Text style={{ fontSize: 18, color: isFavorite ? '#EF4444' : '#FFFFFF' }}>{isFavorite ? '❤️' : '♡'}</Text>
          </TouchableOpacity>

          {/* Status Badge */}
          {trainer.status && (
            <View style={[styles.statusBadge, { backgroundColor: trainer.status === 'active' ? '#22C55E' : '#EAB308' }]}>
              <Text style={styles.statusBadgeText}>{trainer.status.toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Floating Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.trainerName, { color: colors.text }]}>{trainer.name}</Text>
            {ratingAvg > 0 && (
              <View style={[styles.ratingBadge, { backgroundColor: colors.accentLight }]}>
                <Text style={[styles.starIcon, { color: colors.buttonText }]}>★</Text>
                <Text style={[styles.ratingText, { color: colors.buttonText }]}>{ratingAvg.toFixed(1)}</Text>
              </View>
            )}
          </View>

          {/* Specializations */}
          {specializations.length > 0 && (
            <Text style={[styles.trainerType, { color: colors.subText }]}>
              {specializations.join(' · ')}
            </Text>
          )}

          {/* City */}
          {trainer.city && (
            <Text style={[styles.cityText, { color: colors.accent }]}>📍 {trainer.city}</Text>
          )}

          {/* Reviews count */}
          {ratingCount > 0 && (
            <Text style={[styles.reviewText, { color: colors.subText }]}>{ratingCount} Reviews</Text>
          )}

          {/* Languages */}
          {trainer.languages?.length > 0 && (
            <Text style={[styles.langText, { color: colors.subText }]}>
              🗣️ {trainer.languages.join(', ')}
            </Text>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{experienceYears}</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Experience</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{clientCount}</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Clients</Text>
          </View>
          {pricePerSession && (
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>₹{pricePerSession}</Text>
              <Text style={[styles.statLabel, { color: colors.subText }]}>Per Session</Text>
            </View>
          )}
        </View>

        {/* Training Types */}
        {trainingTypes.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Training Types</Text>
            <View style={styles.tagsRow}>
              {trainingTypes.map((type: string, i: number) => (
                <View key={i} style={[styles.tag, { backgroundColor: colors.card, borderColor: colors.accentLight }]}>
                  <Text style={[styles.tagText, { color: colors.text }]}>{type}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Specializations Tags */}
        {specializations.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Specializations</Text>
            <View style={styles.tagsRow}>
              {specializations.map((spec: string, i: number) => (
                <View key={i} style={[styles.tag, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.tagText, { color: colors.subText }]}>{spec}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* About Section */}
        {trainer.bio && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
            <Text style={[styles.aboutText, { color: colors.subText }]}>{trainer.bio}</Text>
          </View>
        )}

        {/* Certifications */}
        {trainer.certifications?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Certifications</Text>
            {trainer.certifications.map((cert: string, i: number) => (
              <View key={i} style={styles.certRow}>
                <Text style={{ color: colors.accentLight, marginRight: 8 }}>✓</Text>
                <Text style={[styles.aboutText, { color: colors.subText }]}>{cert}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Packages Section */}
        {packages.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Packages</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.packagesScroll}>
              {packages.map((pkg) => (
                <View key={pkg.id} style={[styles.packageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.packageName, { color: colors.text }]}>{pkg.name}</Text>
                  <Text style={[styles.packageDesc, { color: colors.subText }]}>{pkg.desc}</Text>
                  <Text style={[styles.packagePrice, { color: colors.accentLight }]}>{pkg.price}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

      </ScrollView>

      {/* Sticky Bottom CTA */}
      <View style={[styles.bottomCTA, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.bookBtn, { backgroundColor: colors.accentLight }]}
          onPress={() => setBookingStep('slot_selection')}
        >
          <Text style={[styles.bookBtnText, { color: colors.buttonText }]}>
            Book a Session{pricePerSession ? `  ·  ₹${pricePerSession}` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stepper Booking Modal */}
      {bookingStep !== 'none' && (
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={() => setBookingStep('none')}
        >
          <View style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
            {/* Modal Header */}
            {bookingStep !== 'success' && (
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity 
                  onPress={() => {
                    if (bookingStep === 'slot_selection') setBookingStep('none');
                    else if (bookingStep === 'user_details') setBookingStep('slot_selection');
                    else if (bookingStep === 'payment_summary') setBookingStep('user_details');
                  }}
                  style={styles.modalBackBtn}
                >
                  <Text style={[styles.modalBackTxt, { color: colors.text }]}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitleHeader, { color: colors.text }]}>Book Trainer</Text>
                <TouchableOpacity onPress={() => setBookingStep('none')} style={styles.modalCloseBtn}>
                  <Text style={[styles.modalCloseTxt, { color: colors.text }]}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step Content Switcher */}
            {bookingStep === 'slot_selection' && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                {/* Step indicator */}
                <Text style={[styles.stepIndicatorText, { color: colors.accent }]}>Step 1 of 3: Date & Slot</Text>
                
                {/* Date Selector */}
                <Text style={[styles.modalSectionLabel, { color: colors.text }]}>Select Date</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateSelectorScroll}>
                  {getNext7Days().map((dayObj) => {
                    const isSelected = selectedDate === dayObj.dateStr;
                    return (
                      <TouchableOpacity
                        key={dayObj.dateStr}
                        style={[
                          styles.dateSelectBox,
                          {
                            borderColor: isSelected ? colors.accent : colors.border,
                            backgroundColor: isSelected ? colors.accent + '1A' : colors.card,
                            borderWidth: isSelected ? 2 : 1,
                          }
                        ]}
                        onPress={() => {
                          setSelectedDate(dayObj.dateStr);
                          setSelectedDay(dayObj.dayName);
                        }}
                      >
                        <Text style={[styles.dateBoxDay, { color: isSelected ? colors.accent : colors.subText }]}>{dayObj.dayName.substring(0, 3)}</Text>
                        <Text style={[styles.dateBoxLabel, { color: colors.text }]}>{dayObj.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Slot Selector */}
                <Text style={[styles.modalSectionLabel, { color: colors.text, marginTop: 20 }]}>Select Time Slot</Text>
                <View style={styles.slotsGridContainer}>
                  {((trainer.availability?.timeSlots && Array.isArray(trainer.availability.timeSlots) && trainer.availability.timeSlots.length > 0)
                    ? trainer.availability.timeSlots
                    : ['06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '05:00 PM', '06:00 PM', '07:00 PM']
                  ).map((slot: string) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[
                          styles.slotSelectBox,
                          {
                            borderColor: isSelected ? colors.accent : colors.border,
                            backgroundColor: isSelected ? colors.accent + '1A' : colors.card,
                            borderWidth: isSelected ? 2 : 1,
                          }
                        ]}
                        onPress={() => setSelectedSlot(slot)}
                      >
                        <Text style={[styles.slotSelectTxt, { color: colors.text }]}>{slot}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Plan Package Selection */}
                <Text style={[styles.modalSectionLabel, { color: colors.text, marginTop: 20 }]}>Select Plan Type</Text>
                <View style={styles.planSelectorRow}>
                  {(() => {
                    const dynamicPlans = [];
                    if (trainer.trialSession && trainer.trialPrice) {
                      dynamicPlans.push({ key: 'Trial', label: `Trial Session\n₹${trainer.trialPrice}` });
                    }
                    if (trainer.pricePerSession) {
                      dynamicPlans.push({ key: 'Single', label: `Single Session\n₹${trainer.pricePerSession}` });
                    }
                    if (trainer.pricePerMonth) {
                      dynamicPlans.push({ key: 'Monthly', label: `Monthly Plan\n₹${trainer.pricePerMonth}` });
                    }
                    if (dynamicPlans.length === 0) {
                      dynamicPlans.push({ key: 'Single', label: `Single Session\n₹500` });
                    }
                    return dynamicPlans.map((p) => {
                      const isSelected = selectedPlan === p.key;
                      return (
                        <TouchableOpacity
                          key={p.key}
                          style={[
                            styles.planSelectCard,
                            {
                              borderColor: isSelected ? colors.accent : colors.border,
                              backgroundColor: isSelected ? colors.accent + '1A' : colors.card,
                              borderWidth: isSelected ? 2 : 1,
                            }
                          ]}
                          onPress={() => setSelectedPlan(p.key as any)}
                        >
                          <Text style={[styles.planCardTxt, { color: colors.text }]} numberOfLines={2}>{p.label}</Text>
                        </TouchableOpacity>
                      );
                    });
                  })()}
                </View>

                {/* Training Mode Preference */}
                <Text style={[styles.modalSectionLabel, { color: colors.text, marginTop: 20 }]}>Select Mode Preference</Text>
                <View style={styles.planSelectorRow}>
                  {((trainer.trainingTypes && Array.isArray(trainer.trainingTypes) && trainer.trainingTypes.length > 0)
                    ? trainer.trainingTypes
                    : ['Online Live', 'Home Visit']
                  ).map((mode: string) => {
                    const isSelected = trainingType === mode;
                    return (
                      <TouchableOpacity
                        key={mode}
                        style={[
                          styles.planSelectCard,
                          {
                            borderColor: isSelected ? colors.accent : colors.border,
                            backgroundColor: isSelected ? colors.accent + '1A' : colors.card,
                            borderWidth: isSelected ? 2 : 1,
                          }
                        ]}
                        onPress={() => setTrainingType(mode)}
                      >
                        <Text style={[styles.planCardTxt, { color: colors.text }]}>{mode}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={[styles.continueModalBtn, { backgroundColor: colors.accent, marginTop: 30 }]}
                  onPress={() => {
                    if (!selectedDate || !selectedSlot) {
                      Alert.alert("Required", "Please select a date and slot first.");
                      return;
                    }
                    setBookingStep('user_details');
                  }}
                >
                  <Text style={styles.continueModalBtnText}>Continue</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {bookingStep === 'user_details' && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                <Text style={[styles.stepIndicatorText, { color: colors.accent }]}>Step 2 of 3: Contact Details</Text>
                
                <View style={styles.modalFormWrapper}>
                  <Text style={[styles.formInputLabel, { color: colors.subText }]}>Full Name</Text>
                  <TextInput
                    style={[styles.modalInputField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter your name"
                    placeholderTextColor="#64748B"
                  />

                  <Text style={[styles.formInputLabel, { color: colors.subText }]}>Contact Phone Number</Text>
                  <TextInput
                    style={[styles.modalInputField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                    value={mobileNumber}
                    onChangeText={setMobileNumber}
                    keyboardType="phone-pad"
                    placeholder="Enter contact number"
                    placeholderTextColor="#64748B"
                  />

                  <Text style={[styles.formInputLabel, { color: colors.subText }]}>Email ID</Text>
                  <TextInput
                    style={[styles.modalInputField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    placeholder="Enter email ID"
                    placeholderTextColor="#64748B"
                  />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8 }}>
                    <Text style={[styles.formInputLabel, { color: colors.subText, marginTop: 0, marginBottom: 0 }]}>
                      Training Address / Location
                    </Text>
                    <TouchableOpacity 
                      onPress={handleGetCurrentLocation} 
                      disabled={fetchingLocation}
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                      {fetchingLocation ? (
                        <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 4 }} />
                      ) : null}
                      <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>
                        {fetchingLocation ? 'Fetching...' : '📍 Use Current Location'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.modalInputField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card, height: 75, textAlignVertical: 'top' }]}
                    value={address}
                    onChangeText={setAddress}
                    multiline={true}
                    placeholder="Enter full address or location"
                    placeholderTextColor="#64748B"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.continueModalBtn, { backgroundColor: colors.accent, marginTop: 30 }]}
                  onPress={() => {
                    if (!fullName.trim() || !mobileNumber.trim() || !email.trim()) {
                      Alert.alert("Required", "Please fill in all contact details.");
                      return;
                    }
                    if (!address.trim()) {
                      Alert.alert("Required", "Please provide a valid training address/location.");
                      return;
                    }
                    setBookingStep('payment_summary');
                  }}
                >
                  <Text style={styles.continueModalBtnText}>Continue to Payment</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {bookingStep === 'payment_summary' && (() => {
              let basePrice = pricePerSession || 500;
              if (selectedPlan === 'Monthly') {
                basePrice = pricePerMonth || 5000;
              } else if (selectedPlan === 'Trial') {
                basePrice = trainer.trialPrice || 200;
              }
              const gstAmount = Math.round(basePrice * 0.18);
              const totalAmount = basePrice + gstAmount;
              
              return (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                  <Text style={[styles.stepIndicatorText, { color: colors.accent }]}>Step 3 of 3: Checkout Summary</Text>
                  
                  {/* Summary Details Card */}
                  <View style={[styles.checkoutSummaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.checkoutSummaryTitle, { color: colors.text }]}>Booking Summary</Text>
                    
                    <View style={styles.checkoutSummaryRow}>
                      <Text style={styles.checkoutSummaryLabel}>Trainer</Text>
                      <Text style={[styles.checkoutSummaryValue, { color: colors.text }]}>{trainer.name}</Text>
                    </View>
                    <View style={styles.checkoutSummaryRow}>
                      <Text style={styles.checkoutSummaryLabel}>Format</Text>
                      <Text style={[styles.checkoutSummaryValue, { color: colors.text }]}>{trainingType} · {selectedPlan}</Text>
                    </View>
                    <View style={styles.checkoutSummaryRow}>
                      <Text style={styles.checkoutSummaryLabel}>Date & Time</Text>
                      <Text style={[styles.checkoutSummaryValue, { color: colors.text }]}>{selectedDate} at {selectedSlot}</Text>
                    </View>

                    <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

                    <View style={styles.checkoutSummaryRow}>
                      <Text style={styles.checkoutSummaryLabel}>Subtotal</Text>
                      <Text style={[styles.checkoutSummaryValue, { color: colors.text }]}>₹{basePrice}</Text>
                    </View>
                    <View style={styles.checkoutSummaryRow}>
                      <Text style={styles.checkoutSummaryLabel}>GST (18%)</Text>
                      <Text style={[styles.checkoutSummaryValue, { color: colors.text }]}>₹{gstAmount}</Text>
                    </View>
                    <View style={styles.checkoutSummaryRow}>
                      <Text style={[styles.checkoutSummaryLabel, { fontWeight: '900', color: colors.text }]}>Total Amount</Text>
                      <Text style={[styles.checkoutSummaryValue, { color: colors.accent, fontWeight: '900', fontSize: 16 }]}>₹{totalAmount}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.continueModalBtn, { backgroundColor: colors.accent, marginTop: 30 }]}
                    onPress={handleBookingPayment}
                    disabled={paymentLoading}
                  >
                    {paymentLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.continueModalBtnText}>🔒 Pay ₹{totalAmount}</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              );
            })()}

            {bookingStep === 'success' && successBooking && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                <View style={styles.successWrapper}>
                  <View style={{ width: 250, height: 250, marginBottom: 10, justifyContent: 'center', alignItems: 'center' }}>
                    <LottieView
                      source={{ uri: 'https://lottie.host/cce983d8-6579-4125-bf2b-263af30918de/Zfae9KVFPD.lottie' }}
                      autoPlay
                      loop
                      speed={1}
                      style={{ width: 250, height: 250 }}
                    />
                  </View>
                  <Text style={[styles.successTitle, { color: colors.text }]}>Session Booked!</Text>
                  <Text style={[styles.successSubtitle, { color: colors.subText }]}>Your trainer session is confirmed.</Text>

                  <View style={[styles.successDetailsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.checkoutSummaryRow}>
                      <Text style={styles.checkoutSummaryLabel}>Trainer</Text>
                      <Text style={[styles.checkoutSummaryValue, { color: colors.text }]}>{trainer.name}</Text>
                    </View>
                    <View style={styles.checkoutSummaryRow}>
                      <Text style={styles.checkoutSummaryLabel}>Format</Text>
                      <Text style={[styles.checkoutSummaryValue, { color: colors.text }]}>{trainingType}</Text>
                    </View>
                    <View style={styles.checkoutSummaryRow}>
                      <Text style={styles.checkoutSummaryLabel}>Session Slot</Text>
                      <Text style={[styles.checkoutSummaryValue, { color: colors.text }]}>{successBooking.slot} ({successBooking.startDate})</Text>
                    </View>
                    <View style={styles.checkoutSummaryRow}>
                      <Text style={styles.checkoutSummaryValue}>Amount Paid</Text>
                      <Text style={[styles.checkoutSummaryValue, { color: colors.text, fontWeight: 'bold' }]}>₹{successBooking.pricePaid}</Text>
                    </View>
                    <View style={styles.checkoutSummaryRow}>
                      <Text style={styles.checkoutSummaryLabel}>Order ID</Text>
                      <Text style={[styles.checkoutSummaryValue, { color: colors.subText, fontSize: 11 }]}>{successBooking.orderId}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.continueModalBtn, { backgroundColor: colors.accent, marginTop: 40, width: '100%' }]}
                    onPress={() => setBookingStep('none')}
                  >
                    <Text style={styles.continueModalBtnText}>Back to Profile</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  coverContainer: {
    height: 380,
    position: 'relative',
    overflow: 'hidden',
  },
  coverImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 500,
    width: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 65 : 35,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 65 : 35,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonAlt: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 65 : 35,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  statusBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: -50,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  trainerName: {
    fontSize: 22,
    fontWeight: '900',
    flex: 1,
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  starIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '800',
  },
  trainerType: {
    fontSize: 14,
    marginBottom: 4,
  },
  cityText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 12,
    marginBottom: 2,
  },
  langText: {
    fontSize: 12,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    padding: 14,
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
    fontWeight: '600',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 22,
  },
  certRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  packagesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  packageCard: {
    width: 150,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 12,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  packageDesc: {
    fontSize: 12,
    marginBottom: 12,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '900',
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  bottomCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
  },
  bookBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookBtnText: {
    fontSize: 16,
    fontWeight: '800',
  },
  // Booking Stepper styles
  modalContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalBackBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  modalBackTxt: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalTitleHeader: {
    fontSize: 18,
    fontWeight: '900',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseTxt: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  stepIndicatorText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  modalSectionLabel: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  dateSelectorScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  dateSelectBox: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dateBoxDay: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dateBoxLabel: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  slotsGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  slotSelectBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: '30%',
    alignItems: 'center',
  },
  slotSelectTxt: {
    fontSize: 12,
    fontWeight: '700',
  },
  planSelectorRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  planSelectCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  planCardTxt: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 18,
  },
  continueModalBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  continueModalBtnText: {
    color: '#0D0E12',
    fontSize: 15,
    fontWeight: '900',
  },
  modalFormWrapper: {
    marginBottom: 10,
  },
  formInputLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInputField: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  checkoutSummaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  checkoutSummaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },
  checkoutSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  checkoutSummaryLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  checkoutSummaryValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalDivider: {
    height: 1,
    marginVertical: 12,
  },
  successWrapper: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  successTickCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTick: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 14,
    marginBottom: 30,
  },
  successDetailsCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
});

export default TrainerProfileScreen;
