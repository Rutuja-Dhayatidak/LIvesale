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
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { healthStoreService, HealthStoreProduct } from '../services/healthstore';
import { profileService } from '../services/profile';
// @ts-ignore
import RazorpayCheckout from 'react-native-razorpay';

const { width } = Dimensions.get('window');

const requestLocationPermission = async () => {
  if (Platform.OS === 'ios') {
    return true;
  }
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission Required',
        message: 'This app needs access to your location to automatically prefill your delivery details.',
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

interface CheckoutScreenProps {
  isDarkMode: boolean;
  productId: string;
  selectedVariantIndex: number;
  onBack: () => void;
  onPaymentSuccess: (details: {
    orderId: string;
    paymentId: string;
    amount: number;
    productName: string;
  }) => void;
}

const CheckoutScreen: React.FC<CheckoutScreenProps> = ({
  isDarkMode,
  productId,
  selectedVariantIndex,
  onBack,
  onPaymentSuccess,
}) => {
  const colors = {
    bg: isDarkMode ? '#0D0E12' : '#F1F2F4',
    card: isDarkMode ? '#1E1F24' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#111827',
    subText: isDarkMode ? '#94A3B8' : '#6B7280',
    border: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    accent: '#00FF66',
    buttonText: '#000000',
  };

  const [product, setProduct] = useState<HealthStoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutStep, setCheckoutStep] = useState<'address' | 'summary'>('address');

  // Shipping Address States
  const [shippingName, setShippingName] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingState, setShippingState] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [specialRemark, setSpecialRemark] = useState('');

  useEffect(() => {
    const initCheckout = async () => {
      try {
        setLoading(true);
        // 1. Fetch Product details
        const res = await healthStoreService.getProductById(productId);
        const data = res?.data || res;
        setProduct(data);

        // 2. Fetch User Profile for prefill
        const profileRes = await profileService.getProfile();
        const profileData = profileRes?.data || profileRes;
        if (profileData) {
          setShippingName(profileData.name || '');
          setShippingPhone(profileData.phone || '');
          setShippingCity(profileData.city || '');
          setShippingState(profileData.location || '');
          if (profileData.specialRemark) {
            setSpecialRemark(profileData.specialRemark);
          }
          
          if (profileData.name && profileData.phone && shippingAddress && profileData.city && profileData.location) {
            setCheckoutStep('summary');
          }
        }
      } catch (err: any) {
        console.error('Checkout initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initCheckout();
  }, [productId]);

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
        const addr = data.address;
        let finalAddress = data.display_name || '';
        
        if (
          latitude >= 18.646 && latitude <= 18.648 &&
          longitude >= 73.762 && longitude <= 73.766
        ) {
          if (!finalAddress.includes('Gurudwara-Biajli Nagar Road')) {
            finalAddress = 'Gurudwara-Biajli Nagar Road, ' + finalAddress;
          }
        }

        setShippingAddress(finalAddress);
        setShippingCity(addr.city || addr.town || addr.village || addr.county || '');
        setShippingState(addr.state || '');
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

      // 1. Try High Accuracy (GPS) first with a 10-second timeout
      Geolocation.getCurrentPosition(
        async (position) => {
          console.log('GPS Location succeeded:', position.coords);
          await getAddressFromCoords(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.log('High accuracy (GPS) failed/timed out, falling back to network location:', error);
          
          // 2. Fallback to Low Accuracy (Wi-Fi/Cellular) which is faster indoors
          Geolocation.getCurrentPosition(
            async (position) => {
              console.log('Network Location succeeded:', position.coords);
              await getAddressFromCoords(position.coords.latitude, position.coords.longitude);
            },
            (err2) => {
              console.error('All location attempts failed:', err2);
              Alert.alert('Location Error', 'Could not get your location. Please check your GPS settings and try again.');
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

  const handleSaveAddressAndContinue = () => {
    if (!shippingName.trim() || !shippingPhone.trim() || !shippingAddress.trim() || !shippingCity.trim() || !shippingState.trim()) {
      return Alert.alert('Missing Fields', 'Please fill in all shipping details.');
    }
    setCheckoutStep('summary');
  };

  const handleProceedToPayment = async () => {
    if (!product) return;

    try {
      setPaymentLoading(true);

      const items = [
        {
          productId: product._id,
          quantity: 1,
          purchaseType: 'One Time',
          flavor: currentVariant ? currentVariant.flavor : undefined,
          size: currentVariant ? currentVariant.size : undefined,
        }
      ];

      const addressPayload = {
        fullName: shippingName,
        mobile: shippingPhone,
        address: shippingAddress,
        city: shippingCity,
        state: shippingState,
        email: '',
      };

      // Create order
      const orderRes = await healthStoreService.createOrder(items, product.healthStore || '', addressPayload, specialRemark);
      const orderData = orderRes?.data || orderRes;

      if (!orderData || !orderData.razorpayOrderId) {
        throw new Error('Failed to generate payment order');
      }

      // Razorpay options
      const options = {
        description: `Order for ${product.name}`,
        image: imagesArray[0] || defaultImage,
        currency: orderData.currency || 'INR',
        key: orderData.keyId,
        amount: orderData.amount,
        name: orderData.storeName || 'LiveSale Fitness',
        order_id: orderData.razorpayOrderId,
        prefill: {
          email: addressPayload.email,
          contact: addressPayload.mobile,
          name: addressPayload.fullName,
        },
        theme: { color: '#00FF66' }
      };

      // Open Razorpay Checkout SDK
      RazorpayCheckout.open(options)
        .then(async (data: any) => {
          try {
            setPaymentLoading(true);
            await healthStoreService.verifyPayment({
              razorpayOrderId: data.razorpay_order_id,
              razorpayPaymentId: data.razorpay_payment_id,
              razorpaySignature: data.razorpay_signature,
              orderId: orderData.orderId,
            });
            onPaymentSuccess({
              orderId: orderData.orderId,
              paymentId: data.razorpay_payment_id,
              amount: orderData.amount,
              productName: product.name,
            });
          } catch (verifyErr: any) {
            console.error('Signature verification error:', verifyErr);
            Alert.alert('Verification Failed', 'Payment signature verification failed. Please contact support.');
          } finally {
            setPaymentLoading(false);
          }
        })
        .catch((error: any) => {
          console.log('Razorpay payment cancelled or failed:', error);
          Alert.alert('Payment Cancelled', error.description || 'Payment process was closed.');
        });

    } catch (err: any) {
      console.error('Payment initiation error:', err);
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to initiate payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ color: colors.subText, marginTop: 12 }}>Initializing Checkout...</Text>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text, fontSize: 16 }}>Product details not found.</Text>
        <TouchableOpacity style={[styles.paySubmitBtn, { backgroundColor: colors.accent, paddingHorizontal: 20 }]} onPress={onBack}>
          <Text style={{ color: colors.buttonText }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      
      {checkoutStep === 'address' ? (
        // Step 1: Address Input Form
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12 }}>
          <View style={styles.summaryHeader}>
            <TouchableOpacity onPress={onBack} style={styles.backArrow}>
              <Text style={[styles.backArrowText, { color: colors.text }]}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.shippingModalTitle, { color: colors.text }]}>Delivery Address</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.shippingModalForm}>
            <Text style={[styles.shippingInputLabel, { color: colors.subText }]}>FULL NAME</Text>
            <TextInput
              style={[styles.shippingModalInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E1F24' : '#FFFFFF' }]}
              placeholder="Rutuja Dhayatidak"
              placeholderTextColor="#64748B"
              value={shippingName}
              onChangeText={setShippingName}
            />

            <Text style={[styles.shippingInputLabel, { color: colors.subText, marginTop: 12 }]}>MOBILE NUMBER</Text>
            <TextInput
              style={[styles.shippingModalInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E1F24' : '#FFFFFF' }]}
              placeholder="9876543210"
              placeholderTextColor="#64748B"
              keyboardType="phone-pad"
              value={shippingPhone}
              onChangeText={setShippingPhone}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <Text style={[styles.shippingInputLabel, { color: colors.subText, marginTop: 0 }]}>DELIVERY ADDRESS</Text>
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
              style={[styles.shippingModalInput, { height: 75, textAlignVertical: 'top', color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E1F24' : '#FFFFFF' }]}
              placeholder="Building name, Street, Landmark..."
              placeholderTextColor="#64748B"
              multiline={true}
              value={shippingAddress}
              onChangeText={setShippingAddress}
            />

            <Text style={[styles.shippingInputLabel, { color: colors.subText, marginTop: 12 }]}>CITY</Text>
            <TextInput
              style={[styles.shippingModalInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E1F24' : '#FFFFFF' }]}
              placeholder="Pune"
              placeholderTextColor="#64748B"
              value={shippingCity}
              onChangeText={setShippingCity}
            />

            <Text style={[styles.shippingInputLabel, { color: colors.subText, marginTop: 12 }]}>STATE</Text>
            <TextInput
              style={[styles.shippingModalInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? '#1E1F24' : '#FFFFFF' }]}
              placeholder="Maharashtra"
              placeholderTextColor="#64748B"
              value={shippingState}
              onChangeText={setShippingState}
            />

            <TouchableOpacity 
              style={[styles.paySubmitBtn, { backgroundColor: colors.accent }]}
              onPress={handleSaveAddressAndContinue}
            >
              <Text style={[styles.paySubmitText, { color: colors.buttonText }]}>Save & Continue</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      ) : (
        // Step 2: Order Summary
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12 }}>
          <View style={styles.summaryHeader}>
            <TouchableOpacity onPress={() => setCheckoutStep('address')} style={styles.backArrow}>
              <Text style={[styles.backArrowText, { color: colors.text }]}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.shippingModalTitle, { color: colors.text }]}>Order Summary</Text>
          </View>

          {/* Progress Stepper Bar */}
          <View style={styles.stepperContainer}>
            <View style={styles.stepWrapper}>
              <View style={[styles.stepCircle, styles.stepCompleted]}>
                <Text style={styles.stepCheckmark}>✓</Text>
              </View>
              <Text style={[styles.stepLabel, { color: colors.text }]}>Address</Text>
            </View>
            <View style={[styles.stepLine, { backgroundColor: '#00FF66' }]} />
            
            <View style={styles.stepWrapper}>
              <View style={[styles.stepCircle, styles.stepActive]}>
                <Text style={styles.stepNumberActive}>2</Text>
              </View>
              <Text style={[styles.stepLabel, { color: colors.text, fontWeight: '700' }]}>Summary</Text>
            </View>
            <View style={styles.stepLine} />
            
            <View style={styles.stepWrapper}>
              <View style={[styles.stepCircle, styles.stepInactive]}>
                <Text style={styles.stepNumberInactive}>3</Text>
              </View>
              <Text style={[styles.stepLabel, { color: colors.subText }]}>Payment</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.shippingModalForm}>
            {/* Delivery Address Details Card */}
            <View style={[styles.deliverToCard, { backgroundColor: isDarkMode ? '#1E222B' : '#F9FAFB', borderColor: colors.border }]}>
              <View style={styles.deliverToHeader}>
                <Text style={[styles.deliverToLabel, { color: colors.text }]}>Deliver to:</Text>
                <TouchableOpacity 
                  style={[styles.changeBtn, { borderColor: colors.accent }]} 
                  onPress={() => setCheckoutStep('address')}
                >
                  <Text style={[styles.changeBtnText, { color: colors.accent }]}>Change</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.deliverToName, { color: colors.text }]}>{shippingName}</Text>
              <Text style={[styles.deliverToAddress, { color: colors.subText }]} numberOfLines={3}>
                {shippingAddress}, {shippingCity}, {shippingState}
              </Text>
              <Text style={[styles.deliverToPhone, { color: colors.text }]}>{shippingPhone}</Text>
            </View>

            {/* Product Details Section */}
            <View style={[styles.summaryProductCard, { backgroundColor: isDarkMode ? '#1E1F24' : '#FFFFFF', borderColor: colors.border }]}>
              <Image source={{ uri: imagesArray[0] || defaultImage }} style={styles.summaryProductImage} />
              <View style={styles.summaryProductInfo}>
                <Text style={[styles.summaryProductName, { color: colors.text }]} numberOfLines={2}>
                  {product.name}
                </Text>
                {currentVariant ? (
                  <Text style={[styles.summaryProductVariant, { color: colors.subText }]}>
                    Size: {currentVariant.size} · Flavor: {currentVariant.flavor}
                  </Text>
                ) : (
                  <Text style={[styles.summaryProductVariant, { color: colors.subText }]}>
                    {product.category}
                  </Text>
                )}
                
                <View style={styles.summaryPriceRow}>
                  <Text style={[styles.summarySellingPrice, { color: colors.accent }]}>₹{sellingPrice}</Text>
                  {mrpPrice && mrpPrice > sellingPrice ? (
                    <>
                      <Text style={[styles.summaryMrpPrice, { color: colors.subText }]}>₹{mrpPrice}</Text>
                      <Text style={styles.summaryDiscountText}>
                        {Math.round(((mrpPrice - sellingPrice) / mrpPrice) * 100)}% Off
                      </Text>
                    </>
                  ) : null}
                </View>
                <Text style={[styles.deliveryDateText, { color: colors.subText }]}>
                  Delivery by {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
              </View>
            </View>

            {/* Price Details Section */}
            <View style={[styles.priceDetailsCard, { backgroundColor: isDarkMode ? '#1E1F24' : '#FFFFFF', borderColor: colors.border }]}>
              <Text style={[styles.priceDetailsTitle, { color: colors.text }]}>Price Details</Text>
              <View style={styles.priceDetailRow}>
                <Text style={[styles.priceDetailLabel, { color: colors.subText }]}>MRP (incl. of all taxes)</Text>
                <Text style={[styles.priceDetailVal, { color: colors.text }]}>₹{mrpPrice || sellingPrice}</Text>
              </View>
              <View style={styles.priceDetailRow}>
                <Text style={[styles.priceDetailLabel, { color: colors.subText }]}>Delivery Fees</Text>
                <Text style={[styles.priceDetailVal, { color: colors.accent }]}>FREE</Text>
              </View>
              {mrpPrice && mrpPrice > sellingPrice ? (
                <View style={styles.priceDetailRow}>
                  <Text style={[styles.priceDetailLabel, { color: colors.subText }]}>Discounts</Text>
                  <Text style={[styles.priceDetailVal, { color: colors.accent }]}>-₹{mrpPrice - sellingPrice}</Text>
                </View>
              ) : null}
              <View style={styles.priceDetailDivider} />
              <View style={styles.priceDetailRow}>
                <Text style={[styles.totalAmountLabel, { color: colors.text }]}>Total Amount</Text>
                <Text style={[styles.totalAmountVal, { color: colors.accent }]}>₹{sellingPrice}</Text>
              </View>
              
              {mrpPrice && mrpPrice > sellingPrice ? (
                <View style={[styles.savingsBanner, { backgroundColor: 'rgba(0, 255, 102, 0.1)' }]}>
                  <Text style={[styles.savingsBannerText, { color: colors.accent }]}>
                    You'll save ₹{mrpPrice - sellingPrice} on this order!
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Summary Continue Button */}
            <View style={styles.summaryFooterContainer}>
              <View style={styles.footerPriceContainer}>
                <Text style={[styles.footerOriginalPrice, { color: colors.subText }]}>₹{mrpPrice || sellingPrice}</Text>
                <Text style={[styles.footerFinalPrice, { color: colors.text }]}>₹{sellingPrice}</Text>
              </View>
              <TouchableOpacity 
                style={[styles.continueBtn, { backgroundColor: '#FFC72C' }]} 
                onPress={handleProceedToPayment}
                disabled={paymentLoading}
              >
                {paymentLoading ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Text style={styles.continueBtnText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  backArrow: {
    marginRight: 12,
    padding: 4,
  },
  backArrowText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  shippingModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
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
  shippingModalForm: {
    paddingBottom: 40,
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
    marginBottom: 12,
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

export default CheckoutScreen;
