import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
  Animated,
} from 'react-native';
import { healthStoreService } from '../services/healthstore';

const { width, height } = Dimensions.get('window');

interface MyOrdersScreenProps {
  isDarkMode: boolean;
  onBack: () => void;
}

interface OrderItem {
  name: string;
  image?: string;
  price: number;
  quantity: number;
  flavor?: string;
  size?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  total: number;
  subtotal?: number;
  deliveryCharge?: number;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  updatedAt?: string;
  invoiceNumber?: string;
  healthStore?: { storeName?: string; city?: string };
  address?: {
    fullName: string;
    address: string;
    city?: string;
    state?: string;
    mobile?: string;
    email?: string;
  };
}

// Timeline steps — order goes through these stages
const ORDER_STEPS = [
  { key: 'Pending', label: 'Order Placed', icon: '📋', desc: 'Your order has been received' },
  { key: 'Confirmed', label: 'Confirmed', icon: '✅', desc: 'Seller confirmed your order' },
  { key: 'Shipped', label: 'Shipped', icon: '🚚', desc: 'Your order is on the way' },
  { key: 'Delivered', label: 'Delivered', icon: '🎉', desc: 'Order delivered successfully' },
];

const CANCELLED_STEP = { key: 'Cancelled', label: 'Cancelled', icon: '❌', desc: 'This order was cancelled' };

const getStepIndex = (status: string): number => {
  const s = status?.toLowerCase();
  if (s === 'pending') return 0;
  if (s === 'confirmed') return 1;
  if (s === 'shipped') return 2;
  if (s === 'delivered') return 3;
  return -1; // cancelled / failed
};

const MyOrdersScreen: React.FC<MyOrdersScreenProps> = ({ isDarkMode, onBack }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  // Lazy mount: wait for slide-in animation to finish before rendering heavy content
  const [isReady, setIsReady] = useState(false);

  // Animation for modal bottom sheet
  const slideAnim = useRef(new Animated.Value(height)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  // Animated values for each timeline step
  const stepAnims = useRef(ORDER_STEPS.map(() => new Animated.Value(0))).current;

  const colors = {
    bg: isDarkMode ? '#0D0E12' : '#F1F2F4',
    card: isDarkMode ? 'rgba(22, 26, 34, 0.95)' : '#FFFFFF',
    modal: isDarkMode ? '#161A22' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#111827',
    subText: isDarkMode ? '#94A3B8' : '#6B7280',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    accent: '#00FF66',
    accentOrange: '#FF7A00',
    buttonText: '#000000',
    timelineDone: '#10B981',
    timelineActive: '#FF7A00',
    timelinePending: isDarkMode ? '#2A2E38' : '#E5E7EB',
    lineColor: isDarkMode ? '#2A2E38' : '#E5E7EB',
  };

  /* ─── API ─── */
  const fetchOrders = async () => {
    try {
      setError(null);
      const res = await healthStoreService.getOrders(1, 50);
      const data = res?.data || res?.orders || [];
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : [];
      setOrders(sorted);
    } catch (err: any) {
      console.error('Fetch orders error:', err);
      setError(err.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Delay content mount until after screen slide-in animation completes (~350ms)
    // This keeps the JS thread free during transition → zero freeze/pause
    const timer = setTimeout(() => {
      setIsReady(true);
      fetchOrders();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => { setRefreshing(true); fetchOrders(); };

  /* ─── Modal open/close ─── */
  const openModal = (order: Order) => {
    setSelectedOrder(order);
    setModalVisible(true);
    // reset step anims
    stepAnims.forEach(a => a.setValue(0));
    // slide up + fade overlay
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      // Stagger animate each timeline step
      const stepIndex = getStepIndex(order.orderStatus);
      const activeCount = stepIndex === -1 ? 1 : stepIndex + 1;
      const anims = stepAnims.slice(0, activeCount).map((anim, i) =>
        Animated.timing(anim, { toValue: 1, duration: 350, delay: i * 180, useNativeDriver: true })
      );
      Animated.stagger(180, anims).start();
    });
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: height, duration: 280, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => {
      setModalVisible(false);
      setSelectedOrder(null);
      slideAnim.setValue(height);
    });
  };

  /* ─── Helpers ─── */
  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'delivered' || s === 'paid') return '#10B981';
    if (s === 'pending' || s === 'shipped' || s === 'confirmed') return '#F59E0B';
    if (s === 'cancelled' || s === 'failed') return '#EF4444';
    return colors.subText;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  };

  /* ─── Timeline Component ─── */
  const renderTimeline = (order: Order) => {
    const currentIndex = getStepIndex(order.orderStatus);
    const isCancelled = currentIndex === -1;
    const steps = isCancelled ? [ORDER_STEPS[0], CANCELLED_STEP] : ORDER_STEPS;

    return (
      <View style={styles.timelineContainer}>
        {steps.map((step, idx) => {
          const isDone = !isCancelled && idx < currentIndex;
          const isActive = !isCancelled ? idx === currentIndex : idx === steps.length - 1;
          const isLast = idx === steps.length - 1;

          // Color logic
          const dotColor = isDone ? colors.timelineDone
            : isActive ? (isCancelled ? '#EF4444' : colors.timelineActive)
              : colors.timelinePending;

          const labelColor = isDone || isActive ? colors.text : colors.subText;
          const animVal = stepAnims[isDone || isActive ? (isCancelled && isActive ? 1 : idx) : idx];

          return (
            <View key={step.key} style={styles.timelineStep}>
              {/* Left column: dot + line */}
              <View style={styles.timelineDotCol}>
                <Animated.View
                  style={[
                    styles.timelineDot,
                    {
                      backgroundColor: dotColor,
                      borderColor: dotColor,
                      opacity: animVal,
                      transform: [{ scale: animVal.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
                    },
                    (isDone || isActive) && styles.timelineDotActive,
                  ]}
                >
                  {isActive && !isCancelled && (
                    <View style={[styles.timelineDotInner, { backgroundColor: '#fff' }]} />
                  )}
                  {isDone && (
                    <Text style={styles.timelineCheckmark}>✓</Text>
                  )}
                  {isCancelled && isActive && (
                    <Text style={styles.timelineCancelMark}>✕</Text>
                  )}
                </Animated.View>
                {!isLast && (
                  <View style={[styles.timelineLine, {
                    backgroundColor: isDone ? colors.timelineDone : colors.lineColor,
                  }]} />
                )}
              </View>

              {/* Right column: content */}
              <Animated.View
                style={[
                  styles.timelineContent,
                  {
                    opacity: animVal,
                    transform: [{ translateX: animVal.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                  },
                ]}
              >
                <View style={styles.timelineLabelRow}>
                  <Text style={styles.timelineIcon}>{step.icon}</Text>
                  <Text style={[styles.timelineLabel, { color: labelColor }]}>{step.label}</Text>
                  {isActive && (
                    <View style={[styles.activePill, {
                      backgroundColor: isCancelled ? 'rgba(239,68,68,0.15)' : 'rgba(255,122,0,0.15)',
                    }]}>
                      <Text style={[styles.activePillText, { color: isCancelled ? '#EF4444' : colors.timelineActive }]}>
                        {isCancelled ? 'Cancelled' : 'Current'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.timelineDesc, { color: colors.subText }]}>{step.desc}</Text>
                {isActive && (
                  <Text style={[styles.timelineDate, { color: colors.subText }]}>
                    {formatDateTime(order.updatedAt || order.createdAt)}
                  </Text>
                )}
              </Animated.View>
            </View>
          );
        })}
      </View>
    );
  };

  /* ─── Order Detail Modal ─── */
  const renderOrderDetailModal = () => {
    if (!selectedOrder) return null;
    const order = selectedOrder;
    const defaultImg = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=150&q=80';

    return (
      <Modal transparent animationType="none" visible={modalVisible} onRequestClose={closeModal}>
        {/* Overlay */}
        <Animated.View style={[styles.modalOverlay, { opacity: overlayAnim }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeModal} />
        </Animated.View>

        {/* Bottom Sheet */}
        <Animated.View
          style={[
            styles.bottomSheet,
            { backgroundColor: colors.modal, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleBarContainer}>
            <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
          </View>

          {/* Sheet Header */}
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.sheetOrderNum, { color: colors.text }]}>
                Order #{order.orderNumber || order._id.slice(-8).toUpperCase()}
              </Text>
              <Text style={[styles.sheetOrderDate, { color: colors.subText }]}>
                Placed on {formatDate(order.createdAt)}
              </Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.border }]} onPress={closeModal}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>

            {/* ── Status badges ── */}
            <View style={styles.sheetBadgeRow}>
              <View style={[styles.sheetBadge, { borderColor: getStatusColor(order.paymentStatus) }]}>
                <Text style={{ fontSize: 10, color: getStatusColor(order.paymentStatus), fontWeight: '800', textTransform: 'uppercase' }}>
                  💳 {order.paymentStatus}
                </Text>
              </View>
              <View style={[styles.sheetBadge, { borderColor: getStatusColor(order.orderStatus) }]}>
                <Text style={{ fontSize: 10, color: getStatusColor(order.orderStatus), fontWeight: '800', textTransform: 'uppercase' }}>
                  📦 {order.orderStatus}
                </Text>
              </View>
            </View>

            {/* ── Timeline ── */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Timeline</Text>
              {renderTimeline(order)}
            </View>

            {/* ── Items ── */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Items Ordered</Text>
              {order.items.map((prod, idx) => (
                <View key={idx} style={[styles.productRow, idx < order.items.length - 1 && { marginBottom: 12 }]}>
                  <Image source={{ uri: prod.image || defaultImg }} style={styles.productImage} />
                  <View style={styles.productDetails}>
                    <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>{prod.name}</Text>
                    {(prod.size || prod.flavor) ? (
                      <Text style={[styles.productVariant, { color: colors.subText }]}>
                        {prod.size ? `Size: ${prod.size}` : ''}
                        {prod.size && prod.flavor ? '  ·  ' : ''}
                        {prod.flavor ? `Flavor: ${prod.flavor}` : ''}
                      </Text>
                    ) : null}
                    <View style={styles.priceQuantityRow}>
                      <Text style={[styles.productPrice, { color: colors.accent }]}>₹{prod.price}</Text>
                      <Text style={[styles.productQty, { color: colors.subText }]}>Qty: {prod.quantity}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* ── Price Breakdown ── */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Price Details</Text>
              {order.subtotal !== undefined && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceRowLabel, { color: colors.subText }]}>Subtotal</Text>
                  <Text style={[styles.priceRowVal, { color: colors.text }]}>₹{order.subtotal}</Text>
                </View>
              )}
              {order.deliveryCharge !== undefined && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceRowLabel, { color: colors.subText }]}>Delivery</Text>
                  <Text style={[styles.priceRowVal, { color: order.deliveryCharge === 0 ? '#10B981' : colors.text }]}>
                    {order.deliveryCharge === 0 ? 'FREE' : `₹${order.deliveryCharge}`}
                  </Text>
                </View>
              )}
              <View style={[styles.priceRow, styles.priceRowTotal, { borderTopColor: colors.border }]}>
                <Text style={[styles.priceRowLabel, { color: colors.text, fontWeight: '800', fontSize: 14 }]}>Total Paid</Text>
                <Text style={[styles.priceRowVal, { color: colors.accentOrange, fontWeight: '900', fontSize: 18 }]}>₹{order.total}</Text>
              </View>
            </View>

            {/* ── Delivery Address ── */}
            {order.address && (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Delivery Address</Text>
                <View style={styles.addressBlock}>
                  <Text style={styles.addressIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.addressName, { color: colors.text }]}>{order.address.fullName}</Text>
                    <Text style={[styles.addressLine, { color: colors.subText }]}>{order.address.address}</Text>
                    {order.address.city && (
                      <Text style={[styles.addressLine, { color: colors.subText }]}>
                        {order.address.city}{order.address.state ? `, ${order.address.state}` : ''}
                      </Text>
                    )}
                    {order.address.mobile && (
                      <Text style={[styles.addressLine, { color: colors.subText }]}>📞 {order.address.mobile}</Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* ── Invoice ── */}
            {order.invoiceNumber && (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 32 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Invoice</Text>
                  <Text style={{ color: colors.accentOrange, fontWeight: '800', fontSize: 13 }}>{order.invoiceNumber}</Text>
                </View>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </Animated.View>
      </Modal>
    );
  };

  /* ─── Order Card (List) — Original UI, clickable to open timeline modal ─── */
  const renderOrderCard = ({ item }: { item: Order }) => {
    const defaultImage = 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80';

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => openModal(item)}
        style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.orderNumber, { color: colors.text }]}>Order #{item.orderNumber || item._id.substring(item._id.length - 8).toUpperCase()}</Text>
            <Text style={[styles.orderDate, { color: colors.subText }]}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.statusBadges}>
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(0, 255, 102, 0.08)', borderColor: getStatusColor(item.paymentStatus) }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.paymentStatus) }]}>
                {item.paymentStatus}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 122, 0, 0.08)', borderColor: getStatusColor(item.orderStatus) }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.orderStatus) }]}>
                {item.orderStatus}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: 'rgba(150, 150, 150, 0.12)' }]} />

        {/* Product Items — all items shown */}
        {item.items.map((prod, idx) => (
          <View key={idx} style={styles.productRow}>
            <Image
              source={{ uri: prod.image || defaultImage }}
              style={styles.productImage}
            />
            <View style={styles.productDetails}>
              <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
                {prod.name}
              </Text>
              {(prod.size || prod.flavor) ? (
                <Text style={[styles.productVariant, { color: colors.subText }]}>
                  {prod.size ? `Size: ${prod.size}` : ''}
                  {prod.size && prod.flavor ? '  ·  ' : ''}
                  {prod.flavor ? `Flavor: ${prod.flavor}` : ''}
                </Text>
              ) : null}
              <View style={styles.priceQuantityRow}>
                <Text style={[styles.productPrice, { color: colors.accent }]}>₹{prod.price}</Text>
                <Text style={[styles.productQty, { color: colors.subText }]}>Qty: {prod.quantity}</Text>
              </View>
            </View>
          </View>
        ))}

        <View style={[styles.divider, { backgroundColor: 'rgba(150, 150, 150, 0.12)' }]} />

        {/* Footer: Delivery address + Total */}
        <View style={styles.cardFooter}>
          {item.address ? (
            <View style={styles.deliveryContainer}>
              <Text style={[styles.deliveryTitle, { color: colors.subText }]}>Deliver to:</Text>
              <Text style={[styles.deliveryName, { color: colors.text }]} numberOfLines={1}>
                {item.address.fullName}
              </Text>
              <Text style={[styles.deliveryAddress, { color: colors.subText }]} numberOfLines={1}>
                {item.address.address}{item.address.city ? `, ${item.address.city}` : ''}
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <View style={styles.totalContainer}>
            <Text style={[styles.totalLabel, { color: colors.subText }]}>Total Paid</Text>
            <Text style={[styles.totalAmount, { color: colors.text }]}>₹{item.total}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /* ─── Main Render ─── */
  // While animation is running, show only a lightweight shell
  if (!isReady) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
            <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Orders</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accentOrange} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {/* Header Bar */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
          <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accentOrange} />
          <Text style={[styles.loadingText, { color: colors.subText }]}>Fetching your orders...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={{ fontSize: 44, marginBottom: 16 }}>⚠️</Text>
          <Text style={[styles.errorTitle, { color: colors.text }]}>Unable to load orders</Text>
          <Text style={[styles.errorSubtitle, { color: colors.subText }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.accentOrange }]} onPress={fetchOrders}>
            <Text style={[styles.retryText, { color: colors.buttonText }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : orders.length === 0 ? (
        <View style={[styles.centerContainer, { flex: 1 }]}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>🛍️</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Orders Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.subText }]}>
            When you purchase fitness diets or supplements, your order history will appear here.
          </Text>
          <TouchableOpacity style={[styles.startShoppingBtn, { backgroundColor: colors.accentOrange }]} onPress={onBack}>
            <Text style={[styles.startShoppingText, { color: colors.buttonText }]}>Explore Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrderCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accentOrange} />
          }
        />
      )}

      {/* Order Detail Modal with Timeline */}
      {renderOrderDetailModal()}
    </SafeAreaView>
  );
};

/* ─────────────────────── STYLES ─────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 56, borderBottomWidth: 1 },
  backButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 26, fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  centerContainer: { justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  errorTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  errorSubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 20 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { fontSize: 14, fontWeight: '800' },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 24 },
  startShoppingBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  startShoppingText: { fontSize: 15, fontWeight: '900' },
  listContent: { padding: 16, paddingBottom: 40 },

  /* Order card */
  orderCard: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderNumber: { fontSize: 14, fontWeight: '800' },
  orderDate: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  statusBadges: { flexDirection: 'row', gap: 6 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  divider: { height: 1, marginVertical: 14 },
  productRow: { flexDirection: 'row', marginBottom: 12 },
  productImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#333' },
  productDetails: { flex: 1, marginLeft: 14, justifyContent: 'space-between' },
  productName: { fontSize: 13, fontWeight: '700' },
  productVariant: { fontSize: 11, marginTop: 2 },
  priceQuantityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  productPrice: { fontSize: 14, fontWeight: '800' },
  productQty: { fontSize: 12, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deliveryContainer: { flex: 2, marginRight: 16 },
  deliveryTitle: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  deliveryName: { fontSize: 12, fontWeight: '700' },
  deliveryAddress: { fontSize: 11, marginTop: 1 },
  totalContainer: { alignItems: 'flex-end', flex: 1 },
  totalLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  totalAmount: { fontSize: 18, fontWeight: '900' },

  /* Modal / Bottom Sheet */
  modalOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.65)' },
  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, maxHeight: height * 0.92, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  handleBarContainer: { paddingTop: 12, paddingBottom: 4, alignItems: 'center' },
  handleBar: { width: 40, height: 4, borderRadius: 4 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  sheetOrderNum: { fontSize: 16, fontWeight: '900' },
  sheetOrderDate: { fontSize: 12, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  sheetScroll: { paddingHorizontal: 16, paddingTop: 16 },
  sheetBadgeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  sheetBadge: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },

  /* Section card */
  sectionCard: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 },

  /* Price rows */
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  priceRowTotal: { borderTopWidth: 1, paddingTop: 12, marginTop: 4, marginBottom: 0 },
  priceRowLabel: { fontSize: 13, fontWeight: '600' },
  priceRowVal: { fontSize: 13, fontWeight: '700' },

  /* Address */
  addressBlock: { flexDirection: 'row', alignItems: 'flex-start' },
  addressIcon: { fontSize: 18, marginRight: 10, marginTop: 1 },
  addressName: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  addressLine: { fontSize: 12, lineHeight: 18 },

  /* Timeline */
  timelineContainer: { paddingLeft: 4 },
  timelineStep: { flexDirection: 'row', minHeight: 72 },
  timelineDotCol: { width: 36, alignItems: 'center' },
  timelineDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  timelineDotActive: { shadowColor: '#FF7A00', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 6 },
  timelineDotInner: { width: 10, height: 10, borderRadius: 5 },
  timelineCheckmark: { color: '#fff', fontSize: 14, fontWeight: '900' },
  timelineCancelMark: { color: '#fff', fontSize: 12, fontWeight: '900' },
  timelineLine: { flex: 1, width: 2, marginVertical: 4 },
  timelineContent: { flex: 1, paddingLeft: 14, paddingBottom: 20 },
  timelineLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  timelineIcon: { fontSize: 16 },
  timelineLabel: { fontSize: 14, fontWeight: '800' },
  activePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  activePillText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  timelineDesc: { fontSize: 12, lineHeight: 16 },
  timelineDate: { fontSize: 11, marginTop: 4, fontStyle: 'italic' },
});

export default MyOrdersScreen;
