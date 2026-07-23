import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions, Animated, Easing, ActivityIndicator } from 'react-native';
import { healthStoreService, HealthStoreProduct } from '../services/healthstore';
import { profileService } from '../services/profile';
import { UserDietPreferences } from '../types/diet';
import { isFoodPreferenceCompatible, getRecommendation } from '../utils/dietRecommendation';

interface HealthStoreScreenProps {
  isDarkMode: boolean;
  onProductSelect: (productId: string) => void;
  initialTab?: 'diet' | 'supplement';
  onAddToCart?: (product: HealthStoreProduct) => void;
}

const { width } = Dimensions.get('window');

const HealthStoreScreen: React.FC<HealthStoreScreenProps> = ({ isDarkMode, onProductSelect, initialTab = 'diet', onAddToCart }) => {
  const [activeTab, setActiveTab] = useState<'diet' | 'supplement'>(initialTab);
  const [storeItems, setStoreItems] = useState<HealthStoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPrefs, setUserPrefs] = useState<UserDietPreferences | null>(null);

  useEffect(() => {
    const loadUserPrefs = async () => {
      try {
        const res = await profileService.getProfile();
        const data = res.data || res;
        if (data) {
          setUserPrefs({
            foodPreference: data.foodPreference || 'veg',
            dietGoal: data.dietGoal || 'build_muscle',
            allergies: data.allergies || [],
            specialRemark: data.specialRemark || '',
          });
        }
      } catch (err) {
        console.warn('Failed to load profile for HealthStoreScreen preferences:', err);
      }
    };
    loadUserPrefs();
  }, []);
  
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [favorites, setFavorites] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: activeTab === 'diet' ? 0 : 1,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        let data;
        if (activeTab === 'diet') {
          data = await healthStoreService.getDietProducts();
        } else {
          data = await healthStoreService.getSupplementProducts();
        }
        // Handle variations of API returns (arrays vs { success: true, data: [...] })
        const products = Array.isArray(data) ? data : (data.data || data.products || []);
        setStoreItems(products);
      } catch (err: any) {
        console.error("Fetch products error:", err);
        setError(err.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [activeTab]);

  const colors = {
    bg: isDarkMode ? '#0D0E12' : '#F8F9FA',
    text: isDarkMode ? '#FFFFFF' : '#1A1D20',
    textMuted: isDarkMode ? '#94A3B8' : '#6B7280',
    cardBg: isDarkMode ? '#1E2433' : '#FFFFFF',
    border: isDarkMode ? '#2A354D' : '#E5E7EB',
    accent: '#0A8443', // Deep premium green
    accentLight: isDarkMode ? '#1C2E24' : '#F4F9F6',
    pillBg: isDarkMode ? '#242C3D' : '#F3F4F6',
    pillText: isDarkMode ? '#CBD5E1' : '#4B5563',
    heartColor: isDarkMode ? '#94A3B8' : '#6B7280',
    tabBg: isDarkMode ? '#161A22' : '#E5E5E5',
    tabActive: isDarkMode ? '#2A2B30' : '#FFFFFF',
  };

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const renderItem = ({ item }: { item: HealthStoreProduct }) => {
    const imageUri = item.image || (item.images && item.images[0]) || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80';
    const sellingPrice = item.sellingPrice || item.oneTimePrice || item.price || (item.variants && item.variants[0]?.sellingPrice) || 0;
    const originalPrice = item.originalPrice || (item.variants && item.variants[0]?.mrp) || null;
    const isDiet = item.productType === 'Diet' || item.productType === 'Food';
    const isFav = !!favorites[item._id];

    // Compute recommendation and allergy logic
    const recommendation = userPrefs ? getRecommendation(userPrefs, item) : null;
    const isRecommended = !!recommendation?.isRecommended;
    const hasAllergyWarning = !!recommendation?.hasAllergyWarning;
    const allergyMatch = recommendation?.allergyMatch || '';

    // Determine category / tag
    const tagText = isDiet ? 'High Protein' : (item.category || 'Supplement');
    const tagIcon = isDiet ? '🌱' : '⚡';

    // Extract macros or fallback
    const calories = (item as any).nutritionInfo?.calories || (isDiet ? 320 : null);
    const protein = (item as any).nutritionInfo?.protein || (isDiet ? 18 : null);
    const fiber = (item as any).nutritionInfo?.fiber || (isDiet ? 6 : null);

    const pills = [];
    if (isDiet) {
      if (calories) pills.push({ icon: '🔥', label: `${calories} kcal` });
      if (protein) pills.push({ icon: '💪', label: `${protein}g Protein` });
      if (fiber) pills.push({ icon: '🥦', label: isDiet ? 'High Fiber' : `${fiber}g Fiber` });

      if (pills.length === 0) {
        if (item.quantity) pills.push({ icon: '📦', label: item.quantity });
        if (item.brand) pills.push({ icon: '🏷️', label: item.brand });
        pills.push({ icon: '🌟', label: 'Premium' });
      }
    } else {
      if (item.brand) pills.push({ icon: '🏷️', label: item.brand });
      if (item.category) pills.push({ icon: '⚡', label: item.category });
      const sizeStr = item.quantity || (item.variants && item.variants[0]?.size);
      if (sizeStr) {
        pills.push({ icon: '📦', label: sizeStr.toString().includes('g') || sizeStr.toString().includes('lb') || sizeStr.toString().includes('kg') ? sizeStr : `${sizeStr} kg` });
      }
    }

    const cardHeight = isDiet ? (hasAllergyWarning ? 250 : 215) : (hasAllergyWarning ? 275 : 240);

    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border, height: cardHeight }]}
        activeOpacity={0.9}
        onPress={() => onProductSelect(item._id)}
      >
        {/* Left Side: Image Container */}
        <View style={[styles.imageContainer, { height: cardHeight }]}>
          <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />
          {/* Bestseller Badge */}
          <View style={[styles.bestsellerBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.bestsellerStar}>★</Text>
            <Text style={styles.bestsellerText}>Bestseller</Text>
          </View>
        </View>

        {/* Right Side: Content */}
        <View style={styles.cardContent}>
          {/* Header Tag and Wishlist */}
          <View style={styles.headerRow}>
            <View style={styles.tagWrapper}>
              <Text style={[styles.tagIcon, { color: colors.accent }]}>{tagIcon}</Text>
              <Text style={[styles.tagText, { color: colors.accent }]}>{tagText}</Text>
            </View>
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => toggleFavorite(item._id)}
              style={styles.heartButton}
            >
              <Text style={[styles.heartIcon, { color: isFav ? '#EF4444' : colors.heartColor }]}>
                {isFav ? '❤️' : '♡'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Goal & Allergy Badges */}
          {isRecommended && (
            <View style={[styles.recommendationBadge, { backgroundColor: colors.accentLight }]}>
              <Text style={{ color: colors.accent, fontSize: 10, fontWeight: 'bold' }}>★ Recommended for your goal</Text>
            </View>
          )}

          {hasAllergyWarning && (
            <View style={styles.allergyWarningContainer}>
              <Text style={styles.allergyWarningText}>⚠️ Contains ingredient matching your allergy ({allergyMatch})</Text>
            </View>
          )}

          {/* Title */}
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
            {item.name}
          </Text>

          {/* Description */}
          <Text style={[styles.cardDescription, { color: colors.textMuted }]} numberOfLines={2}>
            {item.description}
          </Text>

          {/* Macronutrients / Info Pills */}
          <View style={styles.pillsContainer}>
            {pills.slice(0, 3).map((pill, idx) => (
              <View key={idx} style={[styles.pill, { backgroundColor: colors.pillBg }]}>
                <Text style={[styles.pillText, { color: colors.pillText }]}>
                  {pill.icon} {pill.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Price & Add to Cart */}
          <View style={styles.cardFooter}>
            <View style={styles.priceContainer}>
              <Text style={[styles.cardPrice, { color: colors.accent }]}>
                ₹{sellingPrice}
              </Text>
              {originalPrice && originalPrice > sellingPrice && (
                <Text style={styles.originalPriceText}>
                  ₹{originalPrice}
                </Text>
              )}
            </View>
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.addButton, { backgroundColor: colors.accent }]}
              onPress={(e) => {
                e.stopPropagation();
                if (onAddToCart) {
                  onAddToCart(item);
                }
              }}
            >
              <Text style={styles.addButtonIcon}>🛒</Text>
              <Text style={styles.addButtonText}>Add to Cart</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.headerTitle, { color: colors.text }]}>Health Store</Text>

      {/* Top Navigation Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: colors.tabBg }]}>
        <Animated.View
          style={[
            styles.activeBackground,
            {
              backgroundColor: colors.tabActive,
              transform: [{
                translateX: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, (width - 48) / 2],
                })
              }]
            }
          ]}
        />
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('diet')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'diet' ? colors.accent : colors.textMuted }
          ]}>Diet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('supplement')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'supplement' ? colors.accent : colors.textMuted }
          ]}>Supplement</Text>
        </TouchableOpacity>
      </View>

      {/* Item List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: 'red', textAlign: 'center' }}>{error}</Text>
        </View>
      ) : (() => {
        const displayedItems = storeItems.filter(item => {
          if (!userPrefs) return true;
          const foodType = item.foodPreference || (item as any).foodType || '';
          return isFoodPreferenceCompatible(userPrefs.foodPreference, foodType);
        });

        return (
          <FlatList
            data={displayedItems}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 }}>
              <Text style={{ color: colors.textMuted }}>No products found</Text>
            </View>
          }
        />
        );
      })()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    position: 'relative',
  },
  activeBackground: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    width: (width - 48) / 2,
    borderRadius: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100, // padding for bottom navigation
  },
  card: {
    flexDirection: 'row',
    height: 210,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  imageContainer: {
    width: 180,
    height: 210,
    position: 'relative',
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  bestsellerBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 12,
    elevation: 2,
  },
  bestsellerStar: {
    color: '#FFFFFF',
    fontSize: 9,
    marginRight: 3,
  },
  bestsellerText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heartButton: {
    padding: 2,
  },
  heartIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 20,
    marginVertical: 2,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginRight: 4,
    marginBottom: 2,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  priceContainer: {
    flexDirection: 'column',
  },
  originalPriceText: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    elevation: 1,
  },
  addButtonIcon: {
    color: '#FFFFFF',
    fontSize: 11,
    marginRight: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 11,
  },
  recommendationBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
    marginBottom: 4,
  },
  allergyWarningContainer: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginVertical: 4,
  },
  allergyWarningText: {
    color: '#991B1B',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default HealthStoreScreen;
