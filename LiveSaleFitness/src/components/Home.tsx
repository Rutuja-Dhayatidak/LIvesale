import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Animated,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { trainerService, Trainer } from '../services/trainer';
import { healthStoreService } from '../services/healthstore';
import { gymService, Gym } from '../services/Gym';

const { width } = Dimensions.get('window');

interface Supplement {
  id: string;
  name: string;
  goal: string;
  rating: number;
  price: string;
  badge: string;
  image: string;
}

const trendingSupplements: Supplement[] = [
  {
    id: '1',
    name: 'Whey Protein',
    goal: 'Muscle Gain',
    rating: 4.8,
    price: '₹1,999',
    badge: 'Best Seller',
    image: 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?q=80&w=400',
  },
  {
    id: '2',
    name: 'Mass Gainer',
    goal: 'Weight Gain',
    rating: 4.7,
    price: '₹1,499',
    badge: 'Popular',
    image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?q=80&w=400',
  },
  {
    id: '3',
    name: 'Creatine',
    goal: 'Strength',
    rating: 4.9,
    price: '₹799',
    badge: 'Top Rated',
    image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=400',
  },
  {
    id: '4',
    name: 'Pre Workout',
    goal: 'Energy Boost',
    rating: 4.6,
    price: '₹999',
    badge: 'Trending',
    image: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?q=80&w=400',
  },
];


interface HomeProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onNavigateToTrainers?: () => void;
  onNavigateToDiet?: () => void;
  onNavigateToSupplements?: () => void;
  onTrainerSelect?: (trainerId: string) => void;
  onNavigateToCart?: () => void;
  onNavigateToGyms?: () => void;
  onGymSelect?: (gymId: string) => void;
}

const Home: React.FC<HomeProps> = ({ isDarkMode, onToggleTheme, onNavigateToTrainers, onNavigateToDiet, onNavigateToSupplements, onTrainerSelect, onNavigateToCart, onNavigateToGyms, onGymSelect }) => {
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [locationName, setLocationName] = useState('Fetching location...');
  const [homeTrainers, setHomeTrainers] = useState<Trainer[]>([]);
  const [trainersLoading, setTrainersLoading] = useState(true);
  const [supplements, setSupplements] = useState<any[]>([]);
  const [supplementsLoading, setSupplementsLoading] = useState(true);
  const [homeGyms, setHomeGyms] = useState<Gym[]>([]);
  const [gymsLoading, setGymsLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
 
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 750,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    const requestLocationPermission = async () => {
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'App needs access to your location to show nearby gyms.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            setLocationName('Location denied');
            return;
          }
        }
        
        Geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
                headers: {
                  'User-Agent': 'LiveSaleFitnessApp/1.0',
                  'Accept-Language': 'en-US,en;q=0.9',
                }
              });
              
              if (!response.ok) {
                const text = await response.text();
                throw new Error(`API Error: ${response.status} ${text.substring(0, 20)}`);
              }
              
              const data = await response.json();
              
              if (data && data.address) {
                const city = data.address.city || data.address.town || data.address.village || 'Unknown';
                const state = data.address.state || '';
                setLocationName(`${city}${state ? `, ${state}` : ''}`);
              } else {
                setLocationName('Location found');
              }
            } catch (error: any) {
              setLocationName(`Error: ${error.message}`);
            }
          },
          (error) => {
            setLocationName(`Error: ${error.message}`);
            console.warn('Geolocation Error:', error);
          },
          { enableHighAccuracy: false, timeout: 20000, maximumAge: 10000 }
        );
      } catch (err) {
        console.warn(err);
      }
    };

    requestLocationPermission();
  }, []);

  // Fetch top 4 trainers from real API for home preview
  useEffect(() => {
    const fetchHomeTrainers = async () => {
      try {
        const data = await trainerService.getAllTrainers();
        const list: Trainer[] = Array.isArray(data) ? data : (data.data || data.trainers || []);
        setHomeTrainers(list.slice(0, 4)); // max 4 on home screen
      } catch (err) {
        console.warn('Home trainers fetch error:', err);
      } finally {
        setTrainersLoading(false);
      }
    };
    fetchHomeTrainers();
  }, []);

  // Fetch top 4 supplements from real API for home preview
  useEffect(() => {
    const fetchHomeSupplements = async () => {
      try {
        const data = await healthStoreService.getSupplementProducts();
        const list = Array.isArray(data) ? data : (data.data || data.products || []);
        setSupplements(list.slice(0, 4)); // max 4 on home screen
      } catch (err) {
        console.warn('Home supplements fetch error:', err);
      } finally {
        setSupplementsLoading(false);
      }
    };
    fetchHomeSupplements();
  }, []);

  // Fetch top 4 gyms from real API for home preview
  useEffect(() => {
    const fetchHomeGyms = async () => {
      try {
        const data = await gymService.getAllGyms();
        const list = Array.isArray(data) ? data : (data.data || data.gyms || []);
        setHomeGyms(list.slice(0, 4)); // max 4 on home screen
      } catch (err) {
        console.warn('Home gyms fetch error:', err);
      } finally {
        setGymsLoading(false);
      }
    };
    fetchHomeGyms();
  }, []);
 
  const handleBannerScroll = (event: any) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / (width - 32));
    setActiveBannerIndex(index);
  };
 
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, -6],
    extrapolate: 'clamp',
  });
 
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });
 
  const bannerScale = scrollY.interpolate({
    inputRange: [-80, 0, 150],
    outputRange: [1.03, 1, 0.98],
    extrapolate: 'clamp',
  });
 
  const colors = {
    bg: isDarkMode ? '#0D0E12' : '#F1F2F4',
    card: isDarkMode ? '#161A22' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#111827',
    subText: isDarkMode ? '#94A3B8' : '#6B7280',
    border: isDarkMode ? '#242C3D' : '#E5E7EB',
    accent: isDarkMode ? '#FF7A00' : '#EAB308',
    accentLight: isDarkMode ? '#A3E635' : '#FACC15',
    buttonBg: isDarkMode ? '#A3E635' : '#2F3338',
    buttonText: isDarkMode ? '#0D0E12' : '#FFFFFF',
  };
 
  const cardShadow = !isDarkMode ? {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  } : {};
 
  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.bg, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <Animated.ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
      {/* Header Section */}
      <Animated.View style={[styles.header, { transform: [{ translateY: headerTranslateY }], opacity: headerOpacity }]}>
        <View style={styles.headerLeft}>
          <View style={styles.logoLocationContainer}>
            <Text style={[styles.logoText, { color: colors.text }]}>
              LiveSale<Text style={[styles.logoAccent, { color: colors.accent }]}>.Fitness</Text>
            </Text>
            <TouchableOpacity style={styles.locationSelector}>
              <Text style={styles.locationPin}>📍</Text>
              <Text style={[styles.locationText, { color: colors.subText }]}>{locationName} ▾</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={[styles.themeToggleContainer, { backgroundColor: colors.card, borderColor: colors.border }]} 
            onPress={onToggleTheme} 
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 16 }}>{isDarkMode ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.notificationButton, { backgroundColor: colors.card, borderColor: colors.border }]} 
            activeOpacity={0.8}
            onPress={onNavigateToCart}
          >
            <Image
              source={{ uri: isDarkMode ? 'https://img.icons8.com/material-outlined/96/ffffff/shopping-cart.png' : 'https://img.icons8.com/material-outlined/96/111827/shopping-cart.png' }}
              style={styles.bellIconImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Search Bar Section */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Image
            source={{ uri: isDarkMode ? 'https://img.icons8.com/material-outlined/96/94a3b8/search.png' : 'https://img.icons8.com/material-outlined/96/6b7280/search.png' }}
            style={styles.searchIconImage}
            resizeMode="contain"
          />
          <TextInput
            placeholder="Search gyms, trainers, supplements..."
            placeholderTextColor={colors.subText}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
        <TouchableOpacity style={[styles.filterButton, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.8}>
          <Image
            source={{ uri: isDarkMode ? 'https://img.icons8.com/material-outlined/96/94a3b8/sliders.png' : 'https://img.icons8.com/material-outlined/96/6b7280/sliders.png' }}
            style={styles.filterIconImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* Promotional Banner Section */}
      <Animated.View style={[styles.bannerContainer, { transform: [{ scale: bannerScale }] }]}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleBannerScroll}
          scrollEventThrottle={16}
          style={styles.bannerScrollView}
        >
          {/* Banner Item 1 */}
          <View style={styles.bannerItem}>
            {/* Dark overlay backdrop simulated layout */}
            <View style={styles.bannerOverlay}>
              <View style={styles.bannerLeft}>
                <Text style={styles.bannerBadge}>LIVE FITNESS DEALS NEAR YOU</Text>
                <Text style={styles.bannerTitle}>FITNESS{"\n"}MADE AFFORDABLE</Text>
                <Text style={styles.bannerSubtitle}>Save up to 40% on gym memberships</Text>
                <TouchableOpacity style={styles.exploreButton}>
                  <Text style={styles.exploreButtonText}>Explore Deals  →</Text>
                </TouchableOpacity>
              </View>

              {/* Glowing 40% Off Badge */}
              <View style={styles.percentBadge}>
                <Text style={styles.percentBadgeText}>UP TO{"\n"}<Text style={styles.percentBadgeBold}>40%</Text>{"\n"}OFF</Text>
              </View>
            </View>

            {/* Dummy image representation on the right side of banner background */}
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=600' }}
              style={styles.bannerBgImage}
            />
          </View>

          {/* Banner Item 2 */}
          <View style={styles.bannerItem}>
            <View style={styles.bannerOverlay}>
              <View style={styles.bannerLeft}>
                <Text style={[styles.bannerBadge, { color: '#FF7A00' }]}>EXPERT TRAINING SESSIONS</Text>
                <Text style={styles.bannerTitle}>PERSONAL TRAINER{"\n"}DISCOUNTS</Text>
                <Text style={styles.bannerSubtitle}>Get certified personal coaching today</Text>
                <TouchableOpacity style={[styles.exploreButton, { backgroundColor: '#FF7A00' }]}>
                  <Text style={[styles.exploreButtonText, { color: '#FFFFFF' }]}>Explore Trainers  →</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.percentBadge, { backgroundColor: '#FF7A00' }]}>
                <Text style={[styles.percentBadgeText, { color: '#FFFFFF' }]}>UP TO{"\n"}<Text style={styles.percentBadgeBold}>30%</Text>{"\n"}OFF</Text>
              </View>
            </View>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=600' }}
              style={styles.bannerBgImage}
            />
          </View>

          {/* Banner Item 3 */}
          <View style={styles.bannerItem}>
            <View style={styles.bannerOverlay}>
              <View style={styles.bannerLeft}>
                <Text style={[styles.bannerBadge, { color: '#8B5CF6' }]}>TOP QUALITY SUPPLEMENTS</Text>
                <Text style={styles.bannerTitle}>SUPPLEMENTS{"\n"}MARKETPLACE</Text>
                <Text style={styles.bannerSubtitle}>Premium protein whey and wellness kits</Text>
                <TouchableOpacity style={[styles.exploreButton, { backgroundColor: '#8B5CF6' }]}>
                  <Text style={[styles.exploreButtonText, { color: '#FFFFFF' }]}>Shop Supplements  →</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.percentBadge, { backgroundColor: '#8B5CF6' }]}>
                <Text style={[styles.percentBadgeText, { color: '#FFFFFF' }]}>UP TO{"\n"}<Text style={styles.percentBadgeBold}>25%</Text>{"\n"}OFF</Text>
              </View>
            </View>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?q=80&w=600' }}
              style={styles.bannerBgImage}
            />
          </View>
        </ScrollView>

        {/* Slider Dots Indicator */}
        <View style={styles.dotsContainer}>
          <View style={[styles.dot, activeBannerIndex === 0 && styles.activeDot]} />
          <View style={[styles.dot, activeBannerIndex === 1 && styles.activeDot]} />
          <View style={[styles.dot, activeBannerIndex === 2 && styles.activeDot]} />
        </View>
      </Animated.View>

      {/* Navigation Scroll Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScrollContent}
        style={styles.categoriesScroll}
      >
        <TouchableOpacity style={[styles.categoryCard, isDarkMode ? styles.gymsCard : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }, cardShadow]}>
          <View style={{ ...StyleSheet.absoluteFill, borderRadius: 16, overflow: 'hidden' }}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=200' }}
              style={[styles.cardBgImage, { opacity: isDarkMode ? 0.12 : 0.05 }]}
              resizeMode="cover"
            />
          </View>
          <View style={[styles.categoryIconBg, { backgroundColor: isDarkMode ? '#C2E28F' : '#C8E6C9' }]}>
            <Image
              source={{ uri: 'https://img.icons8.com/ios-filled/100/000000/dumbbell.png' }}
              style={styles.categoryIconImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.categoryTitle, { color: colors.text }]}>Gyms</Text>
          <Text style={[styles.categorySubtitle, { color: colors.subText }]}>Top gyms{"\n"}near you</Text>
          <View style={[styles.arrowCircle, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>
            <Image
              source={{ uri: isDarkMode ? 'https://img.icons8.com/material-outlined/48/ffffff/right.png' : 'https://img.icons8.com/material-outlined/48/111827/right.png' }}
              style={styles.arrowIcon}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
 
        {/* Trainers */}
        <TouchableOpacity
          style={[styles.categoryCard, isDarkMode ? styles.trainersCard : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }, cardShadow]}
          activeOpacity={0.85}
          onPress={onNavigateToTrainers}
        >
          <View style={{ ...StyleSheet.absoluteFill, borderRadius: 16, overflow: 'hidden' }}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=200' }}
              style={[styles.cardBgImage, { opacity: isDarkMode ? 0.12 : 0.05 }]}
              resizeMode="cover"
            />
          </View>
          <View style={[styles.categoryIconBg, { backgroundColor: isDarkMode ? '#FBC093' : '#FFE0B2' }]}>
            <Image
              source={{ uri: 'https://img.icons8.com/ios-filled/100/000000/surgeon.png' }}
              style={styles.categoryIconImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.categoryTitle, { color: colors.text }]}>Trainers</Text>
          <Text style={[styles.categorySubtitle, { color: colors.subText }]}>Certified{"\n"}trainers</Text>
          <View style={[styles.arrowCircle, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>
            <Image
              source={{ uri: isDarkMode ? 'https://img.icons8.com/material-outlined/48/ffffff/right.png' : 'https://img.icons8.com/material-outlined/48/111827/right.png' }}
              style={styles.arrowIcon}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
 
        {/* Diet Plans */}
        <TouchableOpacity
          style={[styles.categoryCard, isDarkMode ? styles.dietCard : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }, cardShadow]}
          activeOpacity={0.85}
          onPress={onNavigateToDiet}
        >
          <View style={{ ...StyleSheet.absoluteFill, borderRadius: 16, overflow: 'hidden' }}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=200' }}
              style={[styles.cardBgImage, { opacity: isDarkMode ? 0.12 : 0.05 }]}
              resizeMode="cover"
            />
          </View>
          <View style={[styles.categoryIconBg, { backgroundColor: isDarkMode ? '#CBB6FC' : '#E1BEE7' }]}>
            <Image
              source={{ uri: 'https://img.icons8.com/ios-filled/100/000000/apple.png' }}
              style={styles.categoryIconImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.categoryTitle, { color: colors.text }]}>Diet Plans</Text>
          <Text style={[styles.categorySubtitle, { color: colors.subText }]}>Custom diet{"\n"}plans</Text>
          <View style={[styles.arrowCircle, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>
            <Image
              source={{ uri: isDarkMode ? 'https://img.icons8.com/material-outlined/48/ffffff/right.png' : 'https://img.icons8.com/material-outlined/48/111827/right.png' }}
              style={styles.arrowIcon}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
 
        {/* Supplements */}
        <TouchableOpacity
          style={[styles.categoryCard, isDarkMode ? styles.supplementsCard : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }, cardShadow]}
          activeOpacity={0.85}
          onPress={onNavigateToSupplements}
        >
          <View style={{ ...StyleSheet.absoluteFill, borderRadius: 16, overflow: 'hidden' }}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?q=80&w=200' }}
              style={[styles.cardBgImage, { opacity: isDarkMode ? 0.12 : 0.05 }]}
              resizeMode="cover"
            />
          </View>
          <View style={[styles.categoryIconBg, { backgroundColor: isDarkMode ? '#B7D9F7' : '#BBDEFB' }]}>
            <Image
              source={{ uri: 'https://img.icons8.com/ios-filled/100/000000/protein-powder.png' }}
              style={styles.categoryIconImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.categoryTitle, { color: colors.text }]}>Supplements</Text>
          <Text style={[styles.categorySubtitle, { color: colors.subText }]}>Top quality{"\n"}supplements</Text>
          <View style={[styles.arrowCircle, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}>
            <Image
              source={{ uri: isDarkMode ? 'https://img.icons8.com/material-outlined/48/ffffff/right.png' : 'https://img.icons8.com/material-outlined/48/111827/right.png' }}
              style={styles.arrowIcon}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Trending Supplements Section */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>🔥 Trending Supplements</Text>
        <TouchableOpacity onPress={onNavigateToSupplements} activeOpacity={0.7}>
          <Text style={[styles.viewAllText, { color: colors.accent }]}>View All ›</Text>
        </TouchableOpacity>
      </View>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.horizontalScroll}
        contentContainerStyle={styles.horizontalScrollContent}
      >
        {supplementsLoading ? (
          <View style={{ width: 120, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: colors.subText, fontSize: 12 }}>Loading...</Text>
          </View>
        ) : supplements.length === 0 ? (
          <View style={{ width: 200, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 }}>
            <Text style={{ color: colors.subText, fontSize: 13 }}>No supplements found</Text>
          </View>
        ) : (
          supplements.map((item) => {
            const price = item.sellingPrice ? `₹${item.sellingPrice}` : item.price ? `₹${item.price}` : 'N/A';
            const imageUrl = item.image || (item.images && item.images[0]) || 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?q=80&w=400';
            const brand = item.brand || item.category || 'Supplement';
            return (
              <TouchableOpacity 
                key={item._id}
                style={[styles.offerCard, { backgroundColor: colors.card, borderColor: colors.border }, cardShadow]}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: imageUrl }}
                  style={[styles.offerImage, { borderTopLeftRadius: 12, borderTopRightRadius: 12 }]}
                />
                <View style={[styles.discountBadge, { backgroundColor: colors.accentLight }]}>
                  <Text style={[styles.discountText, { color: colors.buttonText }]}>{brand}</Text>
                </View>
                <View style={styles.offerContent}>
                  <Text style={[styles.offerTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.offerSub, { color: colors.subText }]}>{item.productType}</Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ color: '#EAB308', fontSize: 11, marginRight: 2 }}>★</Text>
                    <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>4.5</Text>
                  </View>
     
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceCurrent, { color: colors.text, fontWeight: '900', fontSize: 14 }]}>{price}</Text>
                    <TouchableOpacity 
                      style={[styles.addButton, { backgroundColor: colors.accentLight }]}
                      activeOpacity={0.8}
                      onPress={() => console.log('Add supplement:', item.name)}
                    >
                      <Text style={[styles.addButtonText, { color: colors.buttonText }]}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Nearby Gyms Section */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>📍 Nearby Gyms</Text>
        <TouchableOpacity onPress={onNavigateToGyms} activeOpacity={0.7}>
          <Text style={[styles.viewAllText, { color: colors.accent }]}>View All ›</Text>
        </TouchableOpacity>
      </View>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.horizontalScroll}
        contentContainerStyle={styles.horizontalScrollContent}
      >
        {gymsLoading ? (
          <View style={{ width: 120, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: colors.subText, fontSize: 12 }}>Loading...</Text>
          </View>
        ) : homeGyms.length === 0 ? (
          <View style={{ width: 200, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 }}>
            <Text style={{ color: colors.subText, fontSize: 13 }}>No gyms found</Text>
          </View>
        ) : (
          homeGyms.map((item) => {
            const imageUrl = item.heroImage || item.images?.[0] || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=400';
            const rating = Number(item.rating) || 4.5;
            const distance = item.distance || '1.2 km away';
            const city = item.location?.city ? String(item.location.city) : 'Pune';
            return (
              <TouchableOpacity 
                key={item._id} 
                style={[styles.gymCard, { backgroundColor: colors.card, borderColor: colors.border }, cardShadow]}
                onPress={() => onGymSelect?.(item._id)}
                activeOpacity={0.88}
              >
                <View style={styles.gymImageContainer}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.gymImage}
                  />
                  <View style={[styles.gymLogoOverlay, { backgroundColor: '#000000' }]}>
                    <Text style={styles.gymLogoText}>{city.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.ratingBadge}>
                  <Text style={styles.starIcon}>★</Text>
                  <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                </View>
                <View style={styles.gymContent}>
                  <Text style={[styles.gymTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={[styles.gymDetails, { color: colors.subText, marginBottom: 0 }]}>{distance}</Text>
                    <Text style={[styles.gymPrice, { color: colors.accent }]}>₹1,999<Text style={[styles.gymUnit, { color: colors.subText }]}>/mo</Text></Text>
                  </View>
                </View>
                <View style={[styles.gymViewButton, { backgroundColor: colors.accentLight }]}>
                  <Text style={[styles.gymViewButtonText, { color: colors.buttonText }]}>View Gym</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Popular Trainers Section */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>👤  Trainers</Text>
        <TouchableOpacity onPress={onNavigateToTrainers} activeOpacity={0.7}>
          <Text style={[styles.viewAllText, { color: colors.accent }]}>View All ›</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.horizontalScroll, { marginBottom: 100 }]}
        contentContainerStyle={styles.horizontalScrollContent}
      >
        {trainersLoading ? (
          <View style={{ width: 120, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: colors.subText, fontSize: 12 }}>Loading...</Text>
          </View>
        ) : homeTrainers.length === 0 ? (
          <View style={{ width: 200, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 }}>
            <Text style={{ color: colors.subText, fontSize: 13 }}>No trainers found</Text>
          </View>
        ) : (
          homeTrainers.map((item) => {
            const photoUrl = item.photo || item.profileImage || 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?q=80&w=400';
            const specialization = (item.specializations?.[0] || item.specialization?.[0] || 'Fitness Trainer');
            const price = item.pricePerSession ? `₹${item.pricePerSession}` : 'Contact';
            const rating = Number(item.rating) || 4.5;
            return (
              <TouchableOpacity
                key={item._id}
                style={[styles.trainerCard, { backgroundColor: colors.card, borderColor: colors.accentLight }, cardShadow]}
                activeOpacity={0.88}
                onPress={() => onTrainerSelect?.(item._id)}
              >
                <Image
                  source={{ uri: photoUrl }}
                  style={styles.trainerImage}
                  resizeMode="cover"
                />
                <View style={styles.trainerInfo}>
                  <View style={styles.trainerHeaderRow}>
                    <Text style={[styles.trainerName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <View style={[styles.topRatedBadge, { borderColor: colors.accentLight }]}>
                      <Text style={[styles.topRatedText, { color: colors.accentLight }]}>★ Top Rated</Text>
                    </View>
                  </View>

                  <Text style={[styles.trainerType, { color: colors.subText }]} numberOfLines={1}>{specialization}</Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ color: '#EAB308', fontSize: 12, marginRight: 4 }}>★</Text>
                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{rating.toFixed(1)}</Text>
                    <Text style={{ color: colors.subText, fontSize: 10, marginLeft: 4 }}>(120+ reviews)</Text>
                  </View>

                  <View style={[styles.trainerDivider, { backgroundColor: colors.border }]} />

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.trainerPrice, { color: colors.text }]}>{price}</Text>
                    <Text style={[styles.trainerUnit, { color: colors.subText }]}> /session</Text>
                  </View>

                  <View style={styles.trainerFooterRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, marginRight: 4 }}>🛡️</Text>
                      <Text style={[styles.verifiedText, { color: colors.accentLight }]}>Verified Trainer</Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={[styles.bookNowButton, { backgroundColor: colors.accentLight }]}
                      activeOpacity={0.8}
                      onPress={() => onTrainerSelect?.(item._id)}
                    >
                      <Text style={[styles.bookNowText, { color: colors.buttonText }]}>Book Now →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </Animated.ScrollView>
  </Animated.View>
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 150 : 130,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeToggleContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  logoLocationContainer: {
    flexDirection: 'column',
  },
  logoText: {
    fontSize: 23,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: Platform.select({
      ios: 'Arial Rounded MT Bold',
      android: 'sans-serif-condensed',
    }),
    letterSpacing: 1.5,
    textTransform: 'uppercase', // Bold, clean look
  },
  logoAccent: {
    color: '#FF7A00',
    fontWeight: '400',
    fontFamily: Platform.select({
      ios: 'Arial Rounded MT Bold',
      android: 'sans-serif-light',
    }),
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationPin: {
    fontSize: 12,
    marginRight: 4,
  },
  locationText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#161A22',
    borderWidth: 1,
    borderColor: '#242C3D',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellIconImage: {
    width: 22,
    height: 22,
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF7A00',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginVertical: 12,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    height: 48,
    backgroundColor: '#161A22',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242C3D',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIconImage: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    height: '100%',
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: '#161A22',
    borderWidth: 1,
    borderColor: '#242C3D',
    borderRadius: 12,
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIconImage: {
    width: 22,
    height: 22,
  },
  bannerContainer: {
    height: 180,
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#161A22',
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 10,
  },
  bannerScrollView: {
    flex: 1,
  },
  bannerItem: {
    width: width - 32,
    height: 180,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerBgImage: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    opacity: 0.6,
  },
  bannerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    zIndex: 2,
    backgroundColor: 'rgba(22, 26, 34, 0.7)',
  },
  bannerLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  bannerBadge: {
    color: '#FF7A00',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
    marginBottom: 6,
  },
  bannerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 12,
  },
  exploreButton: {
    backgroundColor: '#A3E635', // Electric Lime/Green
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  exploreButtonText: {
    color: '#0D0E12',
    fontSize: 12,
    fontWeight: '700',
  },
  percentBadge: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#A3E635',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#161A22',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    marginTop: 10,
  },
  percentBadgeText: {
    color: '#0D0E12',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 11,
  },
  percentBadgeBold: {
    fontSize: 15,
    fontWeight: '900',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: '#A3E635',
    width: 14,
  },
  categoriesScroll: {
    marginVertical: 4,
  },
  categoriesScrollContent: {
    paddingLeft: 16,
    paddingRight: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  categoryCard: {
    width: 135,
    height: 172,
    borderRadius: 16,
    padding: 12,
    paddingBottom: 16,
    alignItems: 'flex-start',
    position: 'relative',
    marginRight: 12,
  },
  cardBgImage: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    width: '90%',
    height: '90%',
    opacity: 0.12,
    borderRadius: 16,
  },
  gymsCard: {
    backgroundColor: '#111713',
    borderWidth: 1,
    borderColor: '#19241B',
  },
  trainersCard: {
    backgroundColor: '#1B1412',
    borderWidth: 1,
    borderColor: '#2D1F1A',
  },
  dietCard: {
    backgroundColor: '#15121B',
    borderWidth: 1,
    borderColor: '#221930',
  },
  supplementsCard: {
    backgroundColor: '#12161E',
    borderWidth: 1,
    borderColor: '#1B2433',
  },
  categoryIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryIconImage: {
    width: 22,
    height: 22,
  },
  categoryTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'left',
    marginBottom: 4,
  },
  categorySubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'left',
    lineHeight: 14,
  },
  arrowCircle: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowIcon: {
    width: 12,
    height: 12,
    opacity: 0.6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  viewAllText: {
    color: '#FF7A00',
    fontSize: 12,
    fontWeight: '700',
  },
  horizontalScroll: {
    paddingLeft: 0,
    marginBottom: 10,
  },
  horizontalScrollContent: {
    paddingLeft: 16,
    paddingRight: 24,
    paddingTop: 8,
    paddingBottom: 22,
  },
  offerCard: {
    width: 170,
    backgroundColor: '#161A22',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242C3D',
    marginRight: 12,
  },
  offerImage: {
    height: 115,
    width: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#A3E635',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    color: '#0D0E12',
    fontSize: 9,
    fontWeight: '800',
  },
  offerContent: {
    padding: 10,
  },
  offerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  offerSub: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceCurrent: {
    color: '#A3E635',
    fontSize: 14,
    fontWeight: '800',
  },
  priceUnit: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: 'normal',
  },
  priceOriginal: {
    color: '#64748B',
    fontSize: 11,
    textDecorationLine: 'line-through',
    marginLeft: 6,
    flex: 1,
  },
  offerActionArrow: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  addButtonText: {
    fontSize: 11,
    fontWeight: '800',
  },
  gymCard: {
    width: 240,
    height: 245,
    backgroundColor: '#161A22',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242C3D',
    marginRight: 12,
  },
  gymImageContainer: {
    position: 'relative',
    height: 125,
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  gymImage: {
    height: '100%',
    width: '100%',
  },
  gymLogoOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gymLogoText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(13, 14, 18, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  starIcon: {
    color: '#EAB308',
    fontSize: 10,
    marginRight: 3,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  gymContent: {
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 48,
  },
  gymTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  gymDetails: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
    marginBottom: 8,
  },
  gymPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gymPrice: {
    color: '#A3E635',
    fontSize: 14,
    fontWeight: '800',
  },
  gymUnit: {
    fontSize: 10,
    color: '#64748B',
  },
  gymViewButton: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gymViewButtonText: {
    fontSize: 10,
    fontWeight: '800',
  },
  trainerCard: {
    width: 290,
    height: 170,
    backgroundColor: '#161A22',
    borderWidth: 1.5,
    borderRadius: 20,
    marginRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  trainerImage: {
    width: 105,
    height: '100%',
  },
  trainerInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
    height: '100%',
  },
  trainerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topRatedBadge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRatedText: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  trainerName: {
    fontSize: 15,
    fontWeight: '900',
    maxWidth: '55%',
  },
  trainerType: {
    fontSize: 11,
    marginTop: -2,
  },
  trainerDivider: {
    height: 0.5,
    width: '100%',
    opacity: 0.5,
    marginVertical: 4,
  },
  trainerPrice: {
    fontSize: 14,
    fontWeight: '900',
  },
  trainerUnit: {
    fontSize: 10,
  },
  trainerFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '800',
  },
  bookNowButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookNowText: {
    fontSize: 9,
    fontWeight: '900',
  },
});

export default Home;
