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
} from 'react-native';
import { healthStoreService, HealthStoreProduct } from '../services/healthstore';

const { width } = Dimensions.get('window');

interface ProductDetailScreenProps {
  isDarkMode: boolean;
  productId: string;
  onBack: () => void;
  onBuyNow: (productId: string, variantIndex: number) => void;
  onAddToCart?: (product: HealthStoreProduct, variantIndex: number) => void;
}

const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({ isDarkMode, productId, onBack, onBuyNow, onAddToCart }) => {
  const colors = {
    bg: isDarkMode ? '#0D0E12' : '#F1F2F4',
    card: isDarkMode ? 'rgba(22, 26, 34, 0.75)' : 'rgba(255, 255, 255, 0.8)',
    text: isDarkMode ? '#FFFFFF' : '#111827',
    subText: isDarkMode ? '#94A3B8' : '#6B7280',
    border: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    accent: '#00FF66', // Neon green accent from HealthStoreScreen
    buttonBg: '#00FF66',
    buttonText: '#000000',
  };

  const [product, setProduct] = useState<HealthStoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await healthStoreService.getProductById(productId);
        const data = res?.data || res;
        setProduct(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load product details');
        console.error('Product profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  const handleBuyNowPress = () => {
    onBuyNow(productId, selectedVariantIndex);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ color: colors.subText, marginTop: 12 }}>Loading product details...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <TouchableOpacity style={styles.backButtonAlt} onPress={onBack}>
          <Text style={[styles.bookBtnText, { color: colors.buttonText }]}>Go Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>Product Not Found</Text>
        <Text style={{ color: colors.subText, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 }}>
          {error || 'Unable to load product details.'}
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.accent }]}
          onPress={onBack}
        >
          <Text style={[styles.bookBtnText, { color: colors.buttonText }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const defaultImage = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
  const imagesArray = product.images && product.images.length > 0 
    ? product.images 
    : [product.image || defaultImage];
    
  const isSupplement = product.productType === 'Supplement';
  const hasVariants = isSupplement && product.variants && product.variants.length > 0;
  const currentVariant = hasVariants ? product.variants![selectedVariantIndex] : null;

  const sellingPrice = currentVariant ? currentVariant.sellingPrice : (product.sellingPrice || product.oneTimePrice || product.price || 0);
  const mrpPrice = currentVariant ? currentVariant.mrp : (product.originalPrice || null);
  const size = currentVariant ? currentVariant.size : product.quantity;
  const flavor = currentVariant ? currentVariant.flavor : ((product as any).nutritionInfo?.flavor || (product as any).flavor);
  const stock = currentVariant ? currentVariant.stock : (product as any).stock;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Cover Photo Container */}
        <View style={styles.coverContainer}>
          <Image
            source={{ uri: imagesArray[activeImageIndex] }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          <View style={styles.overlay} />

          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Thumbnail Selector (Multiple Images) */}
        {imagesArray.length > 1 && (
          <View style={{ marginTop: 12 }}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.thumbnailList}
            >
              {imagesArray.map((imgUrl, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  onPress={() => setActiveImageIndex(index)}
                  style={[
                    styles.thumbnailWrapper,
                    { borderColor: activeImageIndex === index ? colors.accent : 'transparent' }
                  ]}
                >
                  <Image source={{ uri: imgUrl }} style={styles.thumbnailImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Floating Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
          </View>
          {product.brand && (
            <Text style={[styles.brandText, { color: colors.accent }]}>{product.brand}</Text>
          )}
          <Text style={[styles.categoryText, { color: colors.subText }]}>{product.category}</Text>
        </View>

        {/* Pricing & Cart Info */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border, flex: 1, marginRight: 8 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Text style={[styles.statValue, { color: colors.text }]}>₹{sellingPrice}</Text>
              {mrpPrice && mrpPrice > sellingPrice && (
                <Text style={styles.slashedPrice}>₹{mrpPrice}</Text>
              )}
            </View>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Price</Text>
          </View>
          {size && (
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border, flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>{size}</Text>
              <Text style={[styles.statLabel, { color: colors.subText }]}>Quantity / Size</Text>
            </View>
          )}
        </View>

        {/* Variant Selector Section */}
        {hasVariants && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Variant</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.variantScroll}>
              {product.variants!.map((variant, index) => {
                const isSelected = selectedVariantIndex === index;
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.8}
                    onPress={() => setSelectedVariantIndex(index)}
                    style={[
                      styles.variantPill,
                      {
                        backgroundColor: isSelected ? colors.accent : colors.card,
                        borderColor: isSelected ? colors.accent : colors.border,
                      }
                    ]}
                  >
                    <Text style={[styles.variantFlavor, { color: isSelected ? colors.buttonText : colors.text }]}>
                      {variant.flavor}
                    </Text>
                    <Text style={[styles.variantSize, { color: isSelected ? colors.buttonText : colors.subText }]}>
                      Size: {variant.size} · ₹{variant.sellingPrice}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Dynamic Details based on Product Type */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Product Information</Text>

          <View style={[styles.detailsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {isSupplement ? (
              <>
                {product.brand && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.subText }]}>🏷️ Brand</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{product.brand}</Text>
                  </View>
                )}
                {size && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.subText }]}>📦 Quantity</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{size}</Text>
                  </View>
                )}
                {flavor && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.subText }]}>🍓 Flavor</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{flavor}</Text>
                  </View>
                )}
                {stock !== undefined && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.subText }]}>📊 Stock Status</Text>
                    <Text style={[styles.detailValue, { color: stock > 0 ? '#10B981' : '#EF4444', fontWeight: 'bold' }]}>
                      {stock > 0 ? `In Stock (${stock} left)` : 'Out of Stock'}
                    </Text>
                  </View>
                )}
                {product.deliveryAvailable !== undefined && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.subText }]}>🚚 Delivery</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {product.deliveryAvailable ? 'Available' : 'Not Available'}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                {(product as any).foodPreference && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.subText }]}>🥬 Preference</Text>
                    <Text style={[styles.detailValue, { color: colors.accent }]}>{(product as any).foodPreference}</Text>
                  </View>
                )}
                {(product as any).mealTime && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.subText }]}>☀️ Meal Time</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{(product as any).mealTime}</Text>
                  </View>
                )}
                {(product as any).servingSize && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.subText }]}>👥 Serving Size</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{(product as any).servingSize}</Text>
                  </View>
                )}
                {(product as any).portionSize && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.subText }]}>🍽️ Portion Size</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{(product as any).portionSize}</Text>
                  </View>
                )}
                {(product as any).preparationTime && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.subText }]}>🕒 Prep Time</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{(product as any).preparationTime}</Text>
                  </View>
                )}
                {(product as any).orderType && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.subText }]}>🛍️ Order Type</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{(product as any).orderType}</Text>
                  </View>
                )}
                {(product as any).duration && (product as any).duration !== 'N/A' && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.subText }]}>📅 Plan Duration</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{(product as any).duration}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* Benefits Section */}
        {(product as any).benefits && (product as any).benefits.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Key Benefits</Text>
            <View style={[styles.detailsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {(product as any).benefits.map((benefit: string, index: number) => (
                <View key={index} style={styles.detailRow}>
                  <Text style={{ color: colors.accent, marginRight: 8, fontWeight: 'bold' }}>✓</Text>
                  <Text style={[styles.benefitText, { color: colors.text, flex: 1 }]}>{benefit}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Customization Options Section */}
        {!isSupplement && (product as any).customizationOptions && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Customization Options</Text>
            <View style={[styles.detailsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {Object.entries((product as any).customizationOptions).map(([key, val]) => {
                if (val === undefined || val === null || val === '') return null;
                const displayVal = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : val;
                
                // Get Emojis dynamically
                const getCustomizationEmoji = (name: string) => {
                  const n = name.toLowerCase();
                  if (n.includes('protein')) return '🥩';
                  if (n.includes('carb')) return '🍞';
                  if (n.includes('spice')) return '🌶️';
                  if (n.includes('oil')) return '💧';
                  if (n.includes('sugar')) return '🍬';
                  return '⚙️';
                };

                return (
                  <View key={key} style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.subText, textTransform: 'capitalize' }]}>
                      {getCustomizationEmoji(key)} {key.replace(/([A-Z])/g, ' $1')}
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{displayVal as string}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Nutritional Information (Diet specific) */}
        {!isSupplement && (product as any).nutritionInfo && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Nutritional Information</Text>
            <View style={[styles.detailsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {Object.entries((product as any).nutritionInfo).map(([key, val]) => {
                if (val === undefined || val === null || val === '') return null;
                
                const getNutritionalEmoji = (name: string) => {
                  const n = name.toLowerCase();
                  if (n.includes('calories')) return '🔥';
                  if (n.includes('protein')) return '💪';
                  if (n.includes('carbs')) return '🍞';
                  if (n.includes('fat')) return '🥑';
                  if (n.includes('fiber')) return '🌾';
                  return '📈';
                };

                return (
                  <View key={key} style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.subText, textTransform: 'capitalize' }]}>
                      {getNutritionalEmoji(key)} {key}
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.accent }]}>{val as string}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Ingredients & Allergy Info Section */}
        {!isSupplement && (product as any).ingredientsAllergyInfo && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Ingredients & Allergens</Text>
            <View style={[styles.detailsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {(product as any).ingredientsAllergyInfo.ingredients && (
                <View style={[styles.detailRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                  <Text style={[styles.detailLabel, { color: colors.subText, marginBottom: 4 }]}>📝 Ingredients</Text>
                  <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18 }}>
                    {(product as any).ingredientsAllergyInfo.ingredients}
                  </Text>
                </View>
              )}
              {(product as any).ingredientsAllergyInfo.allergyWarning && (
                <View style={[styles.detailRow, { flexDirection: 'column', alignItems: 'flex-start', borderBottomWidth: 0 }]}>
                  <Text style={[styles.detailLabel, { color: '#EF4444', marginBottom: 4, fontWeight: '700' }]}>⚠️ Allergy Warning</Text>
                  <Text style={{ color: '#FCA5A5', fontSize: 13, lineHeight: 18 }}>
                    {(product as any).ingredientsAllergyInfo.allergyWarning}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Description Section */}
        {product.description && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
            <Text style={[styles.descText, { color: colors.subText }]}>{product.description}</Text>
          </View>
        )}

        {/* Ingredients (Supplement specific) */}
        {isSupplement && product.ingredients && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Ingredients</Text>
            <Text style={[styles.descText, { color: colors.subText }]}>{product.ingredients}</Text>
          </View>
        )}

        {/* How to use (Supplement specific) */}
        {isSupplement && product.howToUse && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>How to Use</Text>
            <Text style={[styles.descText, { color: colors.subText }]}>{product.howToUse}</Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom CTAs */}
      <View style={[styles.bottomCTA, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.cartBtn, { borderColor: colors.accent }]}
          onPress={() => {
            if (onAddToCart && product) {
              onAddToCart(product, selectedVariantIndex);
            }
          }}
        >
          <Text style={[styles.cartBtnText, { color: colors.accent }]}>
            Add to Cart
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.buyBtn, { backgroundColor: colors.accent }]}
          onPress={handleBuyNowPress}
        >
          <Text style={[styles.buyBtnText, { color: colors.buttonText }]}>
            Buy Now  ·  ₹{sellingPrice}
          </Text>
        </TouchableOpacity>
      </View>

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
    height: 320,
    position: 'relative',
    overflow: 'hidden',
  },
  coverImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
    width: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonAlt: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
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
  infoCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  productName: {
    fontSize: 22,
    fontWeight: '900',
    flex: 1,
  },
  brandText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    justifyContent: 'space-between',
  },
  statBox: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
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
  descText: {
    fontSize: 14,
    lineHeight: 22,
  },
  detailsContainer: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  buyBtn: {
    flex: 2,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00FF66',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  buyBtnText: {
    fontSize: 15,
    fontWeight: '900',
  },
  shippingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  shippingModalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '85%',
  },
  shippingModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  shippingModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalCloseBtnWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shippingModalCloseIcon: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  shippingModalForm: {
    paddingBottom: 20,
  },
  shippingInputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  shippingModalInput: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  paySubmitBtn: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#00FF66',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  paySubmitText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bookBtnText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bookBtnTextAlt: {
    fontSize: 16,
    fontWeight: '800',
  },
  benefitText: {
    fontSize: 14,
    lineHeight: 20,
  },
  thumbnailList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 10,
  },
  thumbnailWrapper: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  slashedPrice: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginLeft: 6,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  variantScroll: {
    paddingVertical: 8,
    gap: 12,
  },
  variantPill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 140,
    justifyContent: 'center',
  },
  variantFlavor: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  variantSize: {
    fontSize: 11,
    fontWeight: '600',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backArrow: {
    marginRight: 12,
    padding: 4,
  },
  backArrowText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 24,
  },
  stepWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepCompleted: {
    backgroundColor: '#00FF66',
  },
  stepActive: {
    backgroundColor: '#2563EB',
  },
  stepInactive: {
    backgroundColor: '#374151',
  },
  stepCheckmark: {
    color: '#0D0E12',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepNumberActive: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepNumberInactive: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  stepLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  stepLine: {
    height: 2,
    backgroundColor: '#374151',
    flex: 1,
    marginTop: -16,
    marginHorizontal: -15,
  },
  deliverToCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  deliverToHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliverToLabel: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  changeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  changeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deliverToName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  deliverToAddress: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  deliverToPhone: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryProductCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  summaryProductImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  summaryProductInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  summaryProductName: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryProductVariant: {
    fontSize: 12,
    marginTop: 2,
  },
  summaryPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 6,
    gap: 8,
  },
  summarySellingPrice: {
    fontSize: 16,
    fontWeight: '900',
  },
  summaryMrpPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  summaryDiscountText: {
    fontSize: 12,
    color: '#00FF66',
    fontWeight: '700',
  },
  deliveryDateText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  priceDetailsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  priceDetailsTitle: {
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  priceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceDetailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  priceDetailVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  priceDetailDivider: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    marginVertical: 12,
  },
  totalAmountLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  totalAmountVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  savingsBanner: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  savingsBannerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  summaryFooterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  footerPriceContainer: {
    flexDirection: 'column',
  },
  footerOriginalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  footerFinalPrice: {
    fontSize: 20,
    fontWeight: '900',
  },
  continueBtn: {
    paddingHorizontal: 32,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
  },
});

export default ProductDetailScreen;
