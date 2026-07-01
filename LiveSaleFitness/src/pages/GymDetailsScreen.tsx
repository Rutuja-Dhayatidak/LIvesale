import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Linking,
  Animated,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { gymService, Gym } from '../services/Gym';
import { profileService } from '../services/profile';
// @ts-ignore
import RazorpayCheckout from 'react-native-razorpay';

const { width } = Dimensions.get('window');

interface GymDetailsScreenProps {
  gymId: string;
  isDarkMode: boolean;
  onBack: () => void;
}

const amenityIconMap: Record<string, string> = {
  'cardio': '🏃',
  'weight': '🏋️',
  'strength': '💪',
  'trainer': '🎓',
  'changing': '🚿',
  'water': '🥛',
  'locker': '🔒',
  'wifi': '📶',
  'ac': '❄️',
  'parking': '🅿️',
  'steam': '🧖',
  'pool': '🏊',
};

const getAmenityIcon = (name: string) => {
  const normalized = name.toLowerCase();
  for (const [key, icon] of Object.entries(amenityIconMap)) {
    if (normalized.includes(key)) return icon;
  }
  return '⚡';
};

const GymDetailsScreen: React.FC<GymDetailsScreenProps> = ({ gymId, isDarkMode, onBack }) => {
  const [gym, setGym] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedTrainer, setSelectedTrainer] = useState<any | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Membership purchase flow states
  const [purchaseStep, setPurchaseStep] = useState<'none' | 'plan_details' | 'user_details' | 'payment_page' | 'success_page'>('none');
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);

  // User Form Details
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('male');
  const [dob, setDob] = useState('15/05/1997');
  const [city, setCity] = useState('Latur, Maharashtra');
  const [emergencyContact, setEmergencyContact] = useState('9876501234');
  const [healthIssue, setHealthIssue] = useState('None');
  const [joiningDate, setJoiningDate] = useState('01/06/2024');
  const [fitnessGoal, setFitnessGoal] = useState('Weight Loss');

  // Payment states
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(100);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking' | 'gym'>('upi');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [successMembership, setSuccessMembership] = useState<any | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  const handleToggleFavorite = async () => {
    try {
      const res = await profileService.toggleFavoriteGym(gymId);
      if (res.success) {
        setIsFavorite(res.isFavorite);
        Alert.alert("Success", res.isFavorite ? "Gym added to favorites!" : "Gym removed from favorites.");
      }
    } catch (err: any) {
      console.warn("Toggle favorite error:", err);
      Alert.alert("Error", err.message || "Failed to update favorites");
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileRes = await profileService.getProfile();
        const profileData = profileRes?.data || profileRes;
        if (profileData) {
          setFullName(profileData.name || '');
          setEmail(profileData.email || '');
          setMobileNumber(profileData.phone || '');
          if (profileData.gender) setGender(profileData.gender);
          if (profileData.city) setCity(profileData.city);
          if (profileData.fitnessGoal) setFitnessGoal(profileData.fitnessGoal);
          
          if (profileData.favoriteGyms && Array.isArray(profileData.favoriteGyms)) {
            const favorited = profileData.favoriteGyms.some((g: any) => 
              (typeof g === 'string' && g === gymId) || (g._id && g._id === gymId)
            );
            setIsFavorite(favorited);
          }
        }
      } catch (err) {
        console.warn('Failed to load profile for prefill:', err);
      }
    };
    loadProfile();
  }, [gymId]);

  const handlePayment = async () => {
    if (!selectedPlan || !gym) return;

    try {
      setPaymentLoading(true);

      const subTotal = Number(selectedPlan.price);
      // If Coupon is GET100 or FITNESS100 apply 100 off, else use current discountAmount
      const discount = couponCode === 'FITNESS100' || couponCode.toUpperCase() === 'GET100' ? 100 : discountAmount;
      const gst = Math.round((subTotal - discount) * 0.18);
      const totalPayable = subTotal - discount + gst;

      // 1. Call initiate membership endpoint
      const initiateData = {
        gymId: gym._id,
        planId: selectedPlan.id,
        planTitle: selectedPlan.title,
        planType: selectedPlan.title,
        pricePaid: totalPayable,
        duration: selectedPlan.duration,
        discountAmount: discount,
        facilitiesIncluded: gym.amenities && gym.amenities.length > 0 ? gym.amenities : ["Gym Access", "Cardio", "Strength Training", "Locker Facility", "Basic Trainer Guidance", "Steam & Shower"]
      };

      const initiateRes = await gymService.initiateMembership(initiateData);
      
      if (!initiateRes || !initiateRes.success || !initiateRes.orderId) {
        throw new Error(initiateRes.message || "Failed to initiate payment");
      }

      // 2. Options for Razorpay SDK Checkout
      const options = {
        description: `Membership for ${gym.name}`,
        image: gym.heroImage || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600',
        currency: initiateRes.currency || 'INR',
        key: initiateRes.key || 'rzp_test_dummykey',
        amount: initiateRes.amount,
        name: gym.name,
        order_id: initiateRes.orderId,
        prefill: {
          email: email || 'user@example.com',
          contact: mobileNumber || '9999999999',
          name: fullName || 'User'
        },
        theme: { color: '#FF7A00' }
      };

      // 3. Trigger Razorpay Checkout
      RazorpayCheckout.open(options)
        .then(async (data: any) => {
          try {
            setPaymentLoading(true);
            // 4. Verify payment
            const verifyRes = await gymService.verifyMembership({
              razorpay_order_id: data.razorpay_order_id,
              razorpay_payment_id: data.razorpay_payment_id,
              razorpay_signature: data.razorpay_signature,
            });

            if (verifyRes.success) {
              setSuccessMembership({
                membershipId: verifyRes.membership?.id || `GYM-MEM-${Date.now().toString().slice(-4)}`,
                gymName: gym.name,
                planTitle: selectedPlan.title,
                startDate: verifyRes.membership?.startDate ? new Date(verifyRes.membership.startDate).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' }),
                endDate: verifyRes.membership?.endDate ? new Date(verifyRes.membership.endDate).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' }),
                amountPaid: totalPayable,
                paymentStatus: 'Paid',
                invoiceNumber: verifyRes.membership?.invoiceNumber || `INV-${Date.now()}`
              });
              setPurchaseStep('success_page');
            } else {
              Alert.alert('Verification Failed', verifyRes.message || 'Payment signature verification failed.');
            }
          } catch (verifyErr: any) {
            console.error('Verify error:', verifyErr);
            Alert.alert('Verification Failed', 'Could not verify payment signature.');
          } finally {
            setPaymentLoading(false);
          }
        })
        .catch((err: any) => {
          console.warn('Payment cancelled/failed:', err);
          Alert.alert('Payment Cancelled', err.description || 'Payment was cancelled or failed.');
        });

    } catch (error: any) {
      console.error('Payment initiation error:', error);
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to initiate purchase.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const colors = {
    bg: isDarkMode ? '#0D0E12' : '#F8FAFC',
    card: isDarkMode ? '#161A22' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#0F172A',
    subText: isDarkMode ? '#94A3B8' : '#475569',
    border: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    accent: isDarkMode ? '#A3E635' : '#EAB308',
    accentLight: isDarkMode ? 'rgba(163, 230, 53, 0.12)' : 'rgba(234, 179, 8, 0.12)',
    buttonText: isDarkMode ? '#0D0E12' : '#FFFFFF',
    tagBg: isDarkMode ? '#1E293B' : '#F1F5F9',
  };

  useEffect(() => {
    const fetchGymDetails = async () => {
      try {
        setLoading(true);
        const res = await gymService.getGymById(gymId);
        setGym(res.data || res.gym || res);
      } catch (err) {
        console.warn('Error fetching gym details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGymDetails();
  }, [gymId]);

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.subText }]}>Loading Gym details...</Text>
      </View>
    );
  }

  if (!gym) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Gym not found</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.accent }]} onPress={onBack}>
          <Text style={{ color: colors.buttonText, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ratingVal = typeof gym.rating === 'number' ? gym.rating : (gym.rating as any)?.average || 4.5;
  const ratingCount = (gym.rating as any)?.count || 120;
  const imagesList: string[] = [];
  if (gym.heroImage) {
    imagesList.push(gym.heroImage);
  }
  if (Array.isArray(gym.images)) {
    gym.images.forEach(img => {
      if (img && !imagesList.includes(img)) imagesList.push(img);
    });
  }
  if (Array.isArray((gym as any).galleryImages)) {
    (gym as any).galleryImages.forEach((img: string) => {
      if (img && !imagesList.includes(img)) imagesList.push(img);
    });
  }
  if (imagesList.length === 0) {
    imagesList.push('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600');
  }
  const locationText = gym.location ? `${gym.location.address}, ${gym.location.city}` : 'Pune, Maharashtra';

  const handleCall = () => {
    if (gym.phone) {
      Linking.openURL(`tel:${gym.phone}`);
    }
  };

  const handlePurchaseMembership = () => {
    if (!gym) return;
    
    // Find the cheapest plan
    let cheapestPlan: any = null;
    if ((gym as any).membershipPlans && (gym as any).membershipPlans.length > 0) {
      let minPrice = Infinity;
      (gym as any).membershipPlans.forEach((plan: any) => {
        const p = Number(plan.price);
        if (!isNaN(p) && p < minPrice) {
          minPrice = p;
          cheapestPlan = plan;
        }
      });
    }

    if (cheapestPlan) {
      setSelectedPlan({
        id: (cheapestPlan as any)._id || `plan_cheapest`,
        title: (cheapestPlan as any).title,
        price: (cheapestPlan as any).price,
        duration: (cheapestPlan as any).duration || '30 Days',
        validity: (cheapestPlan as any).validity || '30 Days',
        saving: (cheapestPlan as any).saving || 0,
      });
    } else {
      // Fallback default plan
      setSelectedPlan({
        id: 'plan_default',
        title: 'Monthly Pass',
        price: 1999,
        duration: '30 Days',
        validity: '30 Days',
        saving: 0,
      });
    }
    setPurchaseStep('plan_details');
  };

  const handleScrollImage = (event: any) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / width);
    if (index !== activeImageIndex) {
      setActiveImageIndex(index);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Floating Back Action bar */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity style={[styles.backIconBtn, { backgroundColor: 'rgba(0,0,0,0.6)' }]} onPress={onBack}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.backIconBtn, { backgroundColor: 'rgba(0,0,0,0.6)' }]} onPress={handleToggleFavorite}>
          <Text style={{ fontSize: 18, color: isFavorite ? '#EF4444' : '#FFFFFF' }}>{isFavorite ? '❤️' : '♡'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Swipable Image Gallery */}
        <View style={styles.heroContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            nestedScrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            onScroll={handleScrollImage}
            scrollEventThrottle={16}
            style={styles.galleryScroll}
          >
            {imagesList.map((imgUrl, index) => (
              <Image key={index} source={{ uri: imgUrl }} style={styles.heroImage} />
            ))}
          </ScrollView>
          <View style={styles.overlay} pointerEvents="none" />
          
          {/* Gallery dots indicator */}
          {imagesList.length > 1 ? (
            <View style={styles.dotsContainer}>
              {imagesList.map((_, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.dot, 
                    activeImageIndex === index ? [styles.activeDot, { backgroundColor: colors.accent }] : undefined
                  ]} 
                />
              ))}
            </View>
          ) : null}
        </View>

        {/* Details Card */}
        <View style={[styles.detailsBlock, { backgroundColor: colors.card }]}>
          {/* Title and Verified */}
          <View style={styles.titleRow}>
            <Text style={[styles.gymName, { color: colors.text }]}>{gym.name}</Text>
            {!!gym.verified ? (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.accentLight }]}>
                <Text style={[styles.verifiedText, { color: colors.accent }]}>✓ VERIFIED</Text>
              </View>
            ) : null}
          </View>
          
          <Text style={[styles.gymLocationText, { color: colors.subText }]}>📍 {locationText}</Text>

          {/* Rating, Reviews Block */}
          <View style={[styles.ratingContainer, { borderColor: colors.border }]}>
            <View style={styles.ratingInfoCol}>
              <Text style={[styles.ratingNumber, { color: colors.text }]}>{ratingVal.toFixed(1)}</Text>
              <View style={styles.starsWrapper}>
                <Text style={styles.starText}>★</Text>
                <Text style={styles.starText}>★</Text>
                <Text style={styles.starText}>★</Text>
                <Text style={styles.starText}>★</Text>
                <Text style={styles.starText}>★</Text>
              </View>
              <Text style={[styles.ratingCountText, { color: colors.subText }]}>({ratingCount} Reviews)</Text>
            </View>
            <View style={[styles.dividerVertical, { backgroundColor: colors.border }]} />
            <View style={styles.ratingInfoCol}>
              <Text style={[styles.ratingNumber, { color: colors.text }]}>100%</Text>
              <Text style={[styles.ratingCountText, { color: colors.subText }]}>Safety Check</Text>
            </View>
          </View>

          {/* Free Trial Banner */}
          {gym.freeTrial && gym.freeTrial.available ? (
            <View style={[styles.freeTrialCard, { backgroundColor: isDarkMode ? '#1E293B' : '#F0FDF4', borderColor: '#22C55E' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, marginRight: 10 }}>🎁</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#22C55E', fontWeight: '900', fontSize: 14 }}>Free Trial Available!</Text>
                  <Text style={[styles.freeTrialDesc, { color: colors.text }]}>
                    {gym.freeTrial.days ? `${gym.freeTrial.days}-Day Pass: ` : ''}
                    {gym.freeTrial.description || 'Get free trial access to explore the gym equipment and group sessions.'}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* About description */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About Gym</Text>
          <Text style={[styles.aboutText, { color: colors.subText }]}>
            {gym.description || 'Welcome to ' + gym.name + '. We offer high-quality cardio machines, strength training equipment, and premium certified trainers to help you achieve your ultimate fitness goals.'}
          </Text>

          {/* Amenities Grid */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>Amenities</Text>
          <View style={styles.amenitiesContainer}>
            {(gym.amenities && gym.amenities.length > 0 ? gym.amenities : ['Cardio Area', 'Weight Section', 'Certified Trainers', 'Changing Rooms', 'Water Dispenser', 'Locker System']).map((amenity, idx) => (
              <View key={idx} style={[styles.amenityPill, { backgroundColor: colors.tagBg, borderColor: colors.border }]}>
                <Text style={[styles.amenityText, { color: colors.text }]}>
                  {getAmenityIcon(amenity)}  {amenity}
                </Text>
              </View>
            ))}
          </View>

          {/* Membership Plans */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 22 }]}>Membership Plans</Text>
          {(gym as any).membershipPlans && (gym as any).membershipPlans.length > 0 ? (
            (gym as any).membershipPlans.map((plan: any, idx: number) => {
              const isPopular = plan.isPopular || idx === 0;
              return (
                <TouchableOpacity 
                  key={idx} 
                  activeOpacity={0.85}
                  onPress={() => {
                    Alert.alert("Debug", "Plan selected: " + plan.title);
                    setSelectedPlan({
                      id: plan._id || `plan_${idx}`,
                      title: plan.title,
                      price: plan.price,
                      duration: plan.duration || '30 Days',
                      validity: plan.validity || '30 Days',
                      saving: plan.saving,
                    });
                    setPurchaseStep('plan_details');
                  }}
                  style={[
                    styles.planCard, 
                    { 
                      backgroundColor: isDarkMode ? '#1E2433' : '#F8FAFC', 
                      borderColor: isPopular ? colors.accent : colors.border,
                      borderWidth: isPopular ? 1.5 : 1,
                    }
                  ]}
                >
                  {!!isPopular ? (
                    <View style={[styles.popularBadge, { backgroundColor: colors.accent }]}>
                      <Text style={[styles.popularBadgeText, { color: colors.buttonText }]}>POPULAR</Text>
                    </View>
                  ) : null}
                  <View style={styles.planInfo}>
                    <Text style={[styles.planTitle, { color: colors.text }]}>{plan.title}</Text>
                    <Text style={[styles.planDuration, { color: colors.subText }]}>{plan.duration} · Validity: {plan.validity || 'Standard'}</Text>
                  </View>
                  <View style={styles.planPriceCol}>
                    <Text style={[styles.planPrice, { color: colors.accent }]}>₹{plan.price}</Text>
                    {!!plan.saving ? <Text style={styles.planSaving}>Save ₹{plan.saving}</Text> : null}
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <TouchableOpacity 
              activeOpacity={0.85}
              onPress={() => {
                Alert.alert("Debug", "Plan selected: Monthly Pass");
                setSelectedPlan({
                  id: 'monthly_pass',
                  title: 'Monthly Pass',
                  price: 1999,
                  duration: '1 Month',
                  validity: '30 Days',
                });
                setPurchaseStep('plan_details');
              }}
              style={[styles.planCard, { backgroundColor: isDarkMode ? '#1E2433' : '#F8FAFC', borderColor: colors.accent, borderWidth: 1.5 }]}
            >
              <View style={[styles.popularBadge, { backgroundColor: colors.accent }]}>
                <Text style={[styles.popularBadgeText, { color: colors.buttonText }]}>BEST VALUE</Text>
              </View>
              <View style={styles.planInfo}>
                <Text style={[styles.planTitle, { color: colors.text }]}>Monthly Pass</Text>
                <Text style={[styles.planDuration, { color: colors.subText }]}>1 Month · Unlimited Access</Text>
              </View>
              <View style={styles.planPriceCol}>
                <Text style={[styles.planPrice, { color: colors.accent }]}>₹1,999</Text>
              </View>
            </TouchableOpacity>
          )}
          {/* Offers List */}
          {gym.offers && gym.offers.length > 0 ? (
            <View style={{ marginTop: 22 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>🏷️ Exclusive Offers</Text>
              {gym.offers.map((offer: any, idx: number) => (
                <View key={idx} style={[styles.offerCard, { backgroundColor: colors.tagBg, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 20, marginRight: 10, marginTop: 2 }}>🏷️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.offerTitle, { color: colors.text }]}>{offer.title}</Text>
                      {offer.description ? <Text style={[styles.offerDesc, { color: colors.subText }]}>{offer.description}</Text> : null}
                      {offer.expiryDate ? <Text style={styles.offerExpiry}>Expires: {offer.expiryDate}</Text> : null}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* Trainers Carousel */}
          {gym.trainers && gym.trainers.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 22 }]}>Our Expert Trainers</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {gym.trainers.map((tr: any, idx: number) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.trainerItem, { backgroundColor: colors.tagBg, borderColor: colors.border }]}
                    onPress={() => setSelectedTrainer(tr)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: tr.photo || 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?q=80&w=150' }} style={styles.trainerPic} />
                    <Text style={[styles.trainerName, { color: colors.text }]} numberOfLines={1}>{tr.name}</Text>
                    <Text style={[styles.trainerSpec, { color: colors.subText }]} numberOfLines={1}>⏳ {tr.experience || '3+ Yrs Exp'}</Text>
                    {tr.trainingType ? (
                      <Text style={[styles.trainerSpec, { color: colors.accent, fontWeight: '800', marginTop: 2 }]} numberOfLines={1}>⚡ {tr.trainingType}</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : null}

          {/* Location & Timings Details Card */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Location & Timing</Text>
          <View style={[styles.contactCard, { backgroundColor: colors.tagBg, borderColor: colors.border }]}>
            <View style={styles.contactRow}>
              <Text style={styles.contactIcon}>🕛</Text>
              <View style={styles.contactTextCol}>
                <Text style={[styles.contactLabel, { color: colors.text }]}>Operating Hours</Text>
                <Text style={[styles.contactValue, { color: colors.subText }]}>Mon - Sat: 6:00 AM - 10:00 PM</Text>
                <Text style={[styles.contactValue, { color: colors.subText }]}>Sunday: 7:00 AM - 12:00 PM</Text>
              </View>
            </View>
            
            <View style={[styles.dividerHorizontal, { backgroundColor: colors.border }]} />
            
            <View style={styles.contactRow}>
              <Text style={styles.contactIcon}>📞</Text>
              <View style={styles.contactTextCol}>
                <Text style={[styles.contactLabel, { color: colors.text }]}>Call & Support</Text>
                <Text style={[styles.contactValue, { color: colors.subText }]}>{gym.phone || '+91 98765 43210'}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Footer */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }, cardShadow]}>
        <View style={styles.footerPriceCol}>
          <Text style={[styles.footerLabel, { color: colors.subText }]}>Starting from</Text>
          <Text style={[styles.footerPrice, { color: colors.text }]}>
            ₹{(() => {
              if (gym && (gym as any).membershipPlans && (gym as any).membershipPlans.length > 0) {
                const prices = (gym as any).membershipPlans.map((plan: any) => Number(plan.price)).filter((p: number) => !isNaN(p));
                if (prices.length > 0) {
                  return Math.min(...prices).toLocaleString('en-IN');
                }
              }
              return '1,999';
            })()}
            <Text style={{ fontSize: 13, fontWeight: 'normal', color: colors.subText }}> /mo</Text>
          </Text>
        </View>
        <TouchableOpacity style={[styles.footerBtn, { backgroundColor: colors.accent }]} onPress={handlePurchaseMembership} activeOpacity={0.88}>
          <Text style={[styles.footerBtnText, { color: colors.buttonText }]}>Purchase Membership</Text>
        </TouchableOpacity>
      </View>

      {/* Trainer Details Full Screen Overlay */}
      {selectedTrainer ? (
        <View style={[styles.fullScreenOverlay, { backgroundColor: colors.bg }]}>
          {/* Giant Trainer Photo (Half Screen Height) */}
          <View style={styles.trainerHeroContainer}>
            <Image 
              source={{ uri: selectedTrainer.photo || 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?q=80&w=400' }} 
              style={styles.trainerHeroImage} 
            />
            <View style={styles.trainerHeroOverlay} />

            {/* Back action button */}
            <TouchableOpacity 
              style={[styles.trainerHeroBackBtn, { backgroundColor: 'rgba(0,0,0,0.5)' }]} 
              onPress={() => setSelectedTrainer(null)}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' }}>←</Text>
            </TouchableOpacity>

            {/* Name and Specialization Overlay on bottom of image */}
            <View style={styles.trainerHeroTitleBlock}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.trainerHeroName} numberOfLines={1}>{selectedTrainer.name}</Text>
                {(() => {
                  const instaUrl = selectedTrainer.instagramLink || selectedTrainer.instagram || selectedTrainer.profileLink;
                  if (!instaUrl) return null;
                  return (
                    <TouchableOpacity 
                      style={styles.headerInstaIconBtn}
                      onPress={() => {
                        Linking.openURL(instaUrl.startsWith('http') ? instaUrl : `https://${instaUrl}`);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 16 }}>📸</Text>
                    </TouchableOpacity>
                  );
                })()}
              </View>
              {selectedTrainer.specialization ? (
                <Text style={[styles.trainerHeroSpec, { color: colors.accent }]}>
                  🏆 {selectedTrainer.specialization}
                </Text>
              ) : null}
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.trainerHeroScrollContent}>
            {/* Badges Row */}
            <View style={styles.fullBadgesRow}>
              {selectedTrainer.experience ? (
                <View style={[styles.fullBadge, { backgroundColor: colors.tagBg }]}>
                  <Text style={[styles.fullBadgeText, { color: colors.text }]}>⏳ Exp: {selectedTrainer.experience}</Text>
                </View>
              ) : null}
              {selectedTrainer.trainingType ? (
                <View style={[styles.fullBadge, { backgroundColor: colors.accentLight }]}>
                  <Text style={[styles.fullBadgeText, { color: colors.accent }]}>⚡ {selectedTrainer.trainingType}</Text>
                </View>
              ) : null}
            </View>

            {/* Biography */}
            {selectedTrainer.bio ? (
              <View style={[styles.fullSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.fullSectionTitle, { color: colors.text }]}>Biography</Text>
                <Text style={[styles.fullSectionContent, { color: colors.subText }]}>{selectedTrainer.bio}</Text>
              </View>
            ) : null}

            {/* Certification */}
            {selectedTrainer.certification ? (
              <View style={[styles.fullSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.fullSectionTitle, { color: colors.text }]}>Certification</Text>
                <Text style={[styles.fullSectionContent, { color: colors.subText }]}>📜 {selectedTrainer.certification}</Text>
              </View>
            ) : null}

            {/* Availability */}
            {selectedTrainer.availability ? (
              <View style={[styles.fullSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.fullSectionTitle, { color: colors.text }]}>Availability & Timings</Text>
                <Text style={[styles.fullSectionContent, { color: colors.subText }]}>🕒 {selectedTrainer.availability}</Text>
              </View>
            ) : null}

            {/* Skills & Tags */}
            {(() => {
              const skillsVal = selectedTrainer.skills;
              let skillsArr: string[] = [];
              if (Array.isArray(skillsVal)) {
                skillsArr = skillsVal;
              } else if (typeof skillsVal === 'string' && skillsVal.trim().length > 0) {
                skillsArr = skillsVal.split(',').map(s => s.trim()).filter(Boolean);
              }
              if (skillsArr.length === 0) return null;
              return (
                <View style={[styles.fullSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.fullSectionTitle, { color: colors.text }]}>Skills & Tags</Text>
                  <View style={styles.fullSkillsContainer}>
                    {skillsArr.map((skill: string, index: number) => (
                      <View key={index} style={[styles.fullSkillPill, { backgroundColor: colors.tagBg }]}>
                        <Text style={[styles.fullSkillText, { color: colors.text }]}>💪 {skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}
          </ScrollView>
        </View>
      ) : null}

      {/* Membership Purchase Flow Overlay Modal */}
      {purchaseStep !== 'none' && selectedPlan ? (
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={() => setPurchaseStep('none')}
        >
          <View style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
            {/* Modal Header */}
            {purchaseStep !== 'success_page' && (
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity 
                  onPress={() => {
                    if (purchaseStep === 'plan_details') setPurchaseStep('none');
                    else if (purchaseStep === 'user_details') setPurchaseStep('plan_details');
                    else if (purchaseStep === 'payment_page') setPurchaseStep('user_details');
                  }} 
                  style={styles.modalHeaderBack}
                >
                  <Text style={[styles.modalBackArrow, { color: colors.text }]}>←</Text>
                </TouchableOpacity>
                <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>
                  {purchaseStep === 'plan_details' && 'Plan Details'}
                  {purchaseStep === 'user_details' && 'User Details'}
                  {purchaseStep === 'payment_page' && 'Payment'}
                </Text>
                <View style={{ width: 40 }} />
              </View>
            )}

            {/* Step Content */}
            {purchaseStep === 'plan_details' && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                {/* Plan Main Details Card */}
                <View style={[styles.mPlanCard, { backgroundColor: isDarkMode ? '#1E2433' : '#F1F5F9' }]}>
                  <Text style={styles.mPlanCardIcon}>📅</Text>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={[styles.mPlanCardTitle, { color: colors.text }]}>{selectedPlan.title}</Text>
                    <Text style={[styles.mPlanCardPrice, { color: colors.text }]}>
                      ₹{selectedPlan.price}
                      <Text style={{ fontSize: 14, fontWeight: 'normal', color: colors.subText }}> /month</Text>
                    </Text>
                    <Text style={[styles.mPlanCardValidity, { color: colors.subText }]}>Valid for {selectedPlan.duration}</Text>
                  </View>
                </View>

                {/* Plan Validity details list */}
                <View style={[styles.detailsList, { borderColor: colors.border }]}>
                  <View style={styles.detailsListRow}>
                    <Text style={[styles.detailsListLabel, { color: colors.subText }]}>Plan Validity</Text>
                    <Text style={[styles.detailsListValue, { color: colors.text }]}>{selectedPlan.duration}</Text>
                  </View>
                  <View style={styles.detailsListRow}>
                    <Text style={[styles.detailsListLabel, { color: colors.subText }]}>Joining Fee</Text>
                    <Text style={[styles.detailsListValue, { color: colors.text }]}>₹0</Text>
                  </View>
                  <View style={styles.detailsListRow}>
                    <Text style={[styles.detailsListLabel, { color: colors.subText }]}>Access Time</Text>
                    <Text style={[styles.detailsListValue, { color: colors.text }]}>Full Day</Text>
                  </View>
                  <View style={[styles.dividerHorizontal, { backgroundColor: colors.border, marginVertical: 12 }]} />
                  <View style={styles.detailsListRow}>
                    <Text style={[styles.detailsListLabelBold, { color: colors.text }]}>Total Payable</Text>
                    <Text style={[styles.detailsListValueBold, { color: colors.accent }]}>₹{selectedPlan.price}</Text>
                  </View>
                </View>

                {/* Facilities Included */}
                <Text style={[styles.mSectionTitle, { color: colors.text }]}>Facilities Included</Text>
                <View style={styles.facilitiesList}>
                  {['Gym Access', 'Cardio', 'Strength Training', 'Locker Facility', 'Basic Trainer Guidance', 'Steam & Shower'].map((facility, fIdx) => (
                    <View key={fIdx} style={styles.facilityItem}>
                      <Text style={styles.checkIcon}>✓</Text>
                      <Text style={[styles.facilityText, { color: colors.text }]}>{facility}</Text>
                    </View>
                  ))}
                </View>

                {/* Plan Rules */}
                <Text style={[styles.mSectionTitle, { color: colors.text }]}>Plan Rules</Text>
                <View style={styles.rulesList}>
                  <Text style={[styles.ruleItem, { color: colors.subText }]}>• This plan is non-refundable.</Text>
                  <Text style={[styles.ruleItem, { color: colors.subText }]}>• Membership is non-transferable.</Text>
                  <Text style={[styles.ruleItem, { color: colors.subText }]}>• Pause is allowed for 7 days in a year.</Text>
                </View>

                {/* Footer Action */}
                <TouchableOpacity 
                  style={[styles.continueBtn, { backgroundColor: '#7C3AED' }]} 
                  onPress={() => setPurchaseStep('user_details')}
                >
                  <Text style={styles.continueBtnText}>Continue</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {purchaseStep === 'user_details' && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                <View style={styles.stepperSubHeader}>
                  <View style={[styles.circleBadge, { backgroundColor: '#7C3AED' }]}>
                    <Text style={styles.circleBadgeText}>4</Text>
                  </View>
                  <Text style={[styles.stepperSubText, { color: colors.text }]}>User Details</Text>
                </View>

                <View style={styles.formContainer}>
                  <Text style={[styles.formLabel, { color: colors.subText }]}>Full Name</Text>
                  <TextInput 
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E2433' : '#FFFFFF' }]} 
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter full name"
                    placeholderTextColor="#64748B"
                  />

                  <Text style={[styles.formLabel, { color: colors.subText }]}>Mobile Number</Text>
                  <TextInput 
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E2433' : '#FFFFFF' }]} 
                    value={mobileNumber}
                    onChangeText={setMobileNumber}
                    keyboardType="phone-pad"
                    placeholder="Enter mobile number"
                    placeholderTextColor="#64748B"
                  />

                  <Text style={[styles.formLabel, { color: colors.subText }]}>Email</Text>
                  <TextInput 
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E2433' : '#FFFFFF' }]} 
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    placeholder="Enter email address"
                    placeholderTextColor="#64748B"
                  />

                  <Text style={[styles.formLabel, { color: colors.subText }]}>Gender</Text>
                  <View style={styles.radioGroup}>
                    {(['male', 'female', 'other'] as const).map((g) => (
                      <TouchableOpacity 
                        key={g} 
                        style={styles.radioOption}
                        onPress={() => setGender(g)}
                      >
                        <View style={[styles.radioCircle, { borderColor: gender === g ? '#7C3AED' : colors.border }]}>
                          {gender === g && <View style={styles.radioDot} />}
                        </View>
                        <Text style={[styles.radioLabel, { color: colors.text }]}>{g.charAt(0).toUpperCase() + g.slice(1)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.formLabel, { color: colors.subText }]}>Date of Birth</Text>
                  <TextInput 
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E2433' : '#FFFFFF' }]} 
                    value={dob}
                    onChangeText={setDob}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor="#64748B"
                  />

                  <Text style={[styles.formLabel, { color: colors.subText }]}>City</Text>
                  <TextInput 
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E2433' : '#FFFFFF' }]} 
                    value={city}
                    onChangeText={setCity}
                    placeholder="Enter city"
                    placeholderTextColor="#64748B"
                  />

                  <Text style={[styles.formLabel, { color: colors.subText }]}>Emergency Contact</Text>
                  <TextInput 
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E2433' : '#FFFFFF' }]} 
                    value={emergencyContact}
                    onChangeText={setEmergencyContact}
                    keyboardType="phone-pad"
                    placeholder="Emergency phone number"
                    placeholderTextColor="#64748B"
                  />

                  <Text style={[styles.formLabel, { color: colors.subText }]}>Health Issue (if any)</Text>
                  <TextInput 
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E2433' : '#FFFFFF' }]} 
                    value={healthIssue}
                    onChangeText={setHealthIssue}
                    placeholder="None / specify"
                    placeholderTextColor="#64748B"
                  />

                  <Text style={[styles.formLabel, { color: colors.subText }]}>Preferred Joining Date</Text>
                  <TextInput 
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E2433' : '#FFFFFF' }]} 
                    value={joiningDate}
                    onChangeText={setJoiningDate}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor="#64748B"
                  />

                  <Text style={[styles.formLabel, { color: colors.subText }]}>Fitness Goal</Text>
                  <TextInput 
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E2433' : '#FFFFFF' }]} 
                    value={fitnessGoal}
                    onChangeText={setFitnessGoal}
                    placeholder="Weight Loss / Muscle Gain etc."
                    placeholderTextColor="#64748B"
                  />
                </View>

                {/* Continue button */}
                <TouchableOpacity 
                  style={[styles.continueBtn, { backgroundColor: '#7C3AED', marginTop: 12 }]} 
                  onPress={() => {
                    if (!fullName.trim() || !mobileNumber.trim()) {
                      Alert.alert("Missing Fields", "Please enter at least Name and Mobile Number.");
                      return;
                    }
                    setPurchaseStep('payment_page');
                  }}
                >
                  <Text style={styles.continueBtnText}>Continue to Payment</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {purchaseStep === 'payment_page' && (() => {
              const subTotal = Number(selectedPlan.price);
              const discount = couponCode === 'FITNESS100' || couponCode.toUpperCase() === 'GET100' ? 100 : discountAmount;
              const gst = Math.round((subTotal - discount) * 0.18);
              const totalPayable = subTotal - discount + gst;

              return (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                  <View style={styles.stepperSubHeader}>
                    <View style={[styles.circleBadge, { backgroundColor: '#7C3AED' }]}>
                      <Text style={styles.circleBadgeText}>5</Text>
                    </View>
                    <Text style={[styles.stepperSubText, { color: colors.text }]}>Payment Page</Text>
                  </View>

                  {/* Payment Breakdown Card */}
                  <View style={[styles.paymentReceiptCard, { borderColor: colors.border, backgroundColor: isDarkMode ? '#1E2433' : '#FFFFFF' }]}>
                    <View style={styles.receiptRow}>
                      <Text style={[styles.receiptLabel, { color: colors.text }]}>{selectedPlan.title}</Text>
                      <Text style={[styles.receiptValue, { color: colors.text }]}>₹{subTotal}</Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={[styles.receiptLabel, { color: colors.text }]}>Joining Fee</Text>
                      <Text style={[styles.receiptValue, { color: colors.text }]}>₹0</Text>
                    </View>
                    {discount > 0 && (
                      <View style={styles.receiptRow}>
                        <Text style={[styles.receiptLabel, { color: '#22C55E' }]}>Discount</Text>
                        <Text style={[styles.receiptValue, { color: '#22C55E' }]}>- ₹{discount}</Text>
                      </View>
                    )}
                    <View style={[styles.dividerHorizontal, { backgroundColor: colors.border, marginVertical: 8 }]} />
                    <View style={styles.receiptRow}>
                      <Text style={[styles.receiptLabel, { color: colors.subText }]}>Sub Total</Text>
                      <Text style={[styles.receiptValue, { color: colors.text }]}>₹{subTotal - discount}</Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={[styles.receiptLabel, { color: colors.subText }]}>GST (18%)</Text>
                      <Text style={[styles.receiptValue, { color: colors.text }]}>₹{gst}</Text>
                    </View>
                    <View style={[styles.dividerHorizontal, { backgroundColor: colors.border, marginVertical: 8 }]} />
                    <View style={styles.receiptRow}>
                      <Text style={[styles.receiptLabelBold, { color: colors.text }]}>Total Payable</Text>
                      <Text style={[styles.receiptValueBold, { color: '#7C3AED' }]}>₹{totalPayable}</Text>
                    </View>
                  </View>

                  {/* Coupon section */}
                  <Text style={[styles.formLabel, { color: colors.subText, marginTop: 16 }]}>Apply Coupon</Text>
                  <View style={styles.couponContainer}>
                    <TextInput 
                      style={[styles.couponInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E2433' : '#FFFFFF' }]} 
                      value={couponCode}
                      onChangeText={setCouponCode}
                      placeholder="Enter Coupon Code (e.g. GET100)"
                      placeholderTextColor="#64748B"
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity 
                      style={[styles.couponBtn, { backgroundColor: '#7C3AED' }]}
                      onPress={() => {
                        if (couponCode.toUpperCase() === 'GET100' || couponCode.toUpperCase() === 'FITNESS100') {
                          setDiscountAmount(100);
                          Alert.alert("Success", "Coupon applied successfully! ₹100 Discount added.");
                        } else {
                          Alert.alert("Invalid Coupon", "Please use coupon GET100 or FITNESS100.");
                        }
                      }}
                    >
                      <Text style={styles.couponBtnText}>Apply</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Payment Methods */}
                  <Text style={[styles.formLabel, { color: colors.subText, marginTop: 20 }]}>Payment Methods</Text>
                  <View style={[styles.paymentMethodsContainer, { borderColor: colors.border }]}>
                    {[
                      { key: 'upi', label: 'UPI / QR Code', icon: '📱' },
                      { key: 'card', label: 'Credit / Debit Card', icon: '💳' },
                      { key: 'netbanking', label: 'Net Banking', icon: '🏛️' },
                      { key: 'gym', label: 'Pay at Gym (Cash / Card)', icon: '🏪' }
                    ].map((method) => (
                      <TouchableOpacity 
                        key={method.key} 
                        style={[styles.paymentMethodItem, { borderBottomColor: colors.border }]}
                        onPress={() => setPaymentMethod(method.key as any)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 18, marginRight: 12 }}>{method.icon}</Text>
                          <Text style={[styles.paymentMethodLabel, { color: colors.text }]}>{method.label}</Text>
                        </View>
                        <View style={[styles.radioCircle, { borderColor: paymentMethod === method.key ? '#7C3AED' : colors.border }]}>
                          {paymentMethod === method.key && <View style={styles.radioDot} />}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Pay button */}
                  <TouchableOpacity 
                    style={[styles.continueBtn, { backgroundColor: '#7C3AED', marginTop: 24 }]} 
                    onPress={handlePayment}
                    disabled={paymentLoading}
                  >
                    {paymentLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.continueBtnText}>🔒 Pay ₹{totalPayable}</Text>
                    )}
                  </TouchableOpacity>
                  <Text style={styles.termsText}>By continuing, you agree to our Terms & Conditions</Text>
                </ScrollView>
              );
            })()}

            {purchaseStep === 'success_page' && successMembership && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                <View style={styles.stepperSubHeader}>
                  <View style={[styles.circleBadge, { backgroundColor: '#7C3AED' }]}>
                    <Text style={styles.circleBadgeText}>6</Text>
                  </View>
                  <Text style={[styles.stepperSubText, { color: colors.text }]}>Success Page</Text>
                </View>

                {/* Success Banner */}
                <View style={styles.successBanner}>
                  <View style={styles.successIconCircle}>
                    <Text style={styles.successIconTick}>✓</Text>
                  </View>
                  <Text style={[styles.successTitleText, { color: colors.text }]}>Payment Successful!</Text>
                  <Text style={[styles.successSubtitleText, { color: colors.subText }]}>Membership Activated</Text>
                </View>

                {/* Receipt Details Card */}
                <View style={[styles.successReceiptCard, { borderColor: colors.border, backgroundColor: isDarkMode ? '#1E2433' : '#FFFFFF' }]}>
                  <View style={styles.receiptDetailRow}>
                    <Text style={styles.receiptDetailLabel}>Membership ID</Text>
                    <Text style={[styles.receiptDetailValue, { color: colors.text }]}>{successMembership.membershipId}</Text>
                  </View>
                  <View style={styles.receiptDetailRow}>
                    <Text style={styles.receiptDetailLabel}>Gym Name</Text>
                    <Text style={[styles.receiptDetailValue, { color: colors.text }]}>{successMembership.gymName}</Text>
                  </View>
                  <View style={styles.receiptDetailRow}>
                    <Text style={styles.receiptDetailLabel}>Plan Name</Text>
                    <Text style={[styles.receiptDetailValue, { color: colors.text }]}>{successMembership.planTitle}</Text>
                  </View>
                  <View style={styles.receiptDetailRow}>
                    <Text style={styles.receiptDetailLabel}>Start Date</Text>
                    <Text style={[styles.receiptDetailValue, { color: colors.text }]}>{successMembership.startDate}</Text>
                  </View>
                  <View style={styles.receiptDetailRow}>
                    <Text style={styles.receiptDetailLabel}>End Date</Text>
                    <Text style={[styles.receiptDetailValue, { color: colors.text }]}>{successMembership.endDate}</Text>
                  </View>
                  <View style={styles.receiptDetailRow}>
                    <Text style={styles.receiptDetailLabel}>Amount Paid</Text>
                    <Text style={[styles.receiptDetailValue, { color: colors.text }]}>₹{successMembership.amountPaid}</Text>
                  </View>
                  <View style={styles.receiptDetailRow}>
                    <Text style={styles.receiptDetailLabel}>Payment Status</Text>
                    <Text style={[styles.receiptDetailValue, { color: '#22C55E', fontWeight: 'bold' }]}>{successMembership.paymentStatus}</Text>
                  </View>
                </View>

                {/* QR Code Graphic */}
                <View style={[styles.qrCodeContainer, { borderColor: colors.border, backgroundColor: isDarkMode ? '#1E2433' : '#FFFFFF' }]}>
                  <Text style={{ fontSize: 75, color: colors.text }}>🔳</Text>
                  <Text style={[styles.qrCodeLabel, { color: colors.subText }]}>Show this QR at gym entry</Text>
                </View>

                {/* View memberships or close */}
                <TouchableOpacity 
                  style={[styles.continueBtn, { backgroundColor: '#7C3AED', marginTop: 12 }]} 
                  onPress={() => {
                    setPurchaseStep('none');
                    onBack();
                  }}
                >
                  <Text style={styles.continueBtnText}>View My Membership</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.continueBtn, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#7C3AED', marginTop: 10 }]} 
                  onPress={() => Alert.alert("Success", "Invoice downloaded successfully.")}
                >
                  <Text style={{ color: '#7C3AED', fontWeight: '700' }}>Download Invoice</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </Modal>
      ) : null}
    </View>
  );
};

const cardShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 10,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  floatingHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    right: 16,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: -2,
  },
  heroContainer: {
    height: 270,
    width: '100%',
    position: 'relative',
    backgroundColor: '#000000',
  },
  galleryScroll: {
    width: '100%',
    height: '100%',
  },
  heroImage: {
    width: width,
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  activeDot: {
    width: 16,
    height: 6,
    borderRadius: 3,
  },
  detailsBlock: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -24,
    padding: 20,
    paddingTop: 24,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  gymName: {
    fontSize: 24,
    fontWeight: '900',
    flex: 1,
    letterSpacing: -0.5,
  },
  verifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '900',
  },
  gymLocationText: {
    fontSize: 13,
    marginTop: 6,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    marginVertical: 18,
  },
  ratingInfoCol: {
    alignItems: 'center',
    flex: 1,
  },
  ratingNumber: {
    fontSize: 20,
    fontWeight: '900',
  },
  starsWrapper: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  starText: {
    color: '#EAB308',
    fontSize: 10,
    marginHorizontal: 0.5,
  },
  ratingCountText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dividerVertical: {
    width: 1,
    height: 40,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  aboutText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  planCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: 16,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  popularBadgeText: {
    fontSize: 8,
    fontWeight: '900',
  },
  planInfo: {
    flex: 0.7,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  planDuration: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  planPriceCol: {
    alignItems: 'flex-end',
    flex: 0.3,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '900',
  },
  planSaving: {
    color: '#22C55E',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 10,
  },
  amenityPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  amenityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  trainerItem: {
    width: 140,
    borderRadius: 16,
    padding: 10,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  trainerPic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  trainerName: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  trainerSpec: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '500',
  },
  contactCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  contactIcon: {
    fontSize: 18,
    marginRight: 12,
    marginTop: 2,
  },
  contactTextCol: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 12,
    marginBottom: 2,
    fontWeight: '500',
  },
  dividerHorizontal: {
    height: 1,
    marginVertical: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 15 : 0,
  },
  footerPriceCol: {
    justifyContent: 'center',
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  footerPrice: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  footerBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  footerBtnText: {
    fontSize: 14,
    fontWeight: '900',
  },
  freeTrialCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginVertical: 12,
    borderStyle: 'dashed',
  },
  freeTrialDesc: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  offerCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  offerDesc: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  offerExpiry: {
    fontSize: 9,
    color: '#EF4444',
    fontWeight: '700',
    marginTop: 4,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    padding: 20,
  },
  fullScreenOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
  },
  fullHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  fullBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trainerHeroContainer: {
    height: 380,
    width: '100%',
    position: 'relative',
    backgroundColor: '#000000',
  },
  trainerHeroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  trainerHeroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  trainerHeroBackBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  trainerHeroTitleBlock: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 5,
  },
  trainerHeroName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  trainerHeroSpec: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  trainerHeroScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  fullBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  fullBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    marginHorizontal: 6,
  },
  fullBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  fullSection: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  fullSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  fullSectionContent: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  fullSkillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  fullSkillPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  fullSkillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  headerInstaIconBtn: {
    marginLeft: 8,
    backgroundColor: '#E1306C',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal Purchase Flow styles
  modalContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 40 : 0,
  },
  modalHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  modalHeaderBack: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackArrow: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  mPlanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  mPlanCardIcon: {
    fontSize: 32,
  },
  mPlanCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  mPlanCardPrice: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 2,
  },
  mPlanCardValidity: {
    fontSize: 12,
  },
  detailsList: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  detailsListRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  detailsListLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailsListValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailsListLabelBold: {
    fontSize: 15,
    fontWeight: '800',
  },
  detailsListValueBold: {
    fontSize: 16,
    fontWeight: '900',
  },
  mSectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 10,
    marginBottom: 12,
  },
  facilitiesList: {
    marginBottom: 20,
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  checkIcon: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  facilityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rulesList: {
    marginBottom: 24,
  },
  ruleItem: {
    fontSize: 13,
    lineHeight: 18,
    marginVertical: 2,
  },
  continueBtn: {
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  stepperSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  circleBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  circleBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepperSubText: {
    fontSize: 18,
    fontWeight: '800',
  },
  formContainer: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  formInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  radioGroup: {
    flexDirection: 'row',
    marginVertical: 6,
    gap: 20,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7C3AED',
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentReceiptCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  receiptLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  receiptValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  receiptLabelBold: {
    fontSize: 15,
    fontWeight: '800',
  },
  receiptValueBold: {
    fontSize: 16,
    fontWeight: '900',
  },
  couponContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  couponInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  couponBtn: {
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  paymentMethodsContainer: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  paymentMethodLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
  },
  successBanner: {
    alignItems: 'center',
    marginVertical: 24,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIconTick: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  successTitleText: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  successSubtitleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  successReceiptCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  receiptDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  receiptDetailLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  receiptDetailValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  qrCodeContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  qrCodeLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },
});

export default GymDetailsScreen;
