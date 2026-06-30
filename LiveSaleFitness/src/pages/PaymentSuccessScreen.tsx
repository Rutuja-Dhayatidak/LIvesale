import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');

interface PaymentSuccessScreenProps {
  isDarkMode: boolean;
  orderId: string;
  paymentId: string;
  amount: number;
  productName: string;
  onClose: () => void;
}

const PaymentSuccessScreen: React.FC<PaymentSuccessScreenProps> = ({
  isDarkMode,
  orderId,
  paymentId,
  amount,
  productName,
  onClose,
}) => {
  const colors = {
    bg: isDarkMode ? '#0D0E12' : '#F1F2F4',
    card: isDarkMode ? '#1E1F24' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#111827',
    subText: isDarkMode ? '#94A3B8' : '#6B7280',
    accent: '#00FF66',
    border: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    cardShadow: isDarkMode ? 'rgba(0, 255, 102, 0.15)' : 'rgba(0, 0, 0, 0.05)',
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      
      <View style={styles.content}>
        {/* Animated Lottie Success Animation */}
        <View style={styles.iconContainer}>
          <LottieView
            source={{ uri: 'https://lottie.host/cce983d8-6579-4125-bf2b-263af30918de/Zfae9KVFPD.lottie' }}
            autoPlay
            loop
            speed={1}
            style={styles.lottieAnimation}
          />
        </View>

        {/* Success Header */}
        <Text style={[styles.successTitle, { color: colors.text }]}>Payment Successful!</Text>
        <Text style={[styles.successSubtitle, { color: colors.subText }]}>
          Your order has been placed successfully and is being processed.
        </Text>

        {/* Transaction Summary Card */}
        <View style={[styles.receiptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardHeader, { color: colors.text }]}>Order Details</Text>
          
          <View style={styles.separator} />

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.subText }]}>Product</Text>
            <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
              {productName}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.subText }]}>Amount Paid</Text>
            <Text style={[styles.detailValue, { color: colors.accent, fontWeight: 'bold' }]}>
              ₹{(amount / 100).toFixed(2)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.subText }]}>Order ID</Text>
            <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
              {orderId}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.subText }]}>Payment ID</Text>
            <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
              {paymentId}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.subText }]}>Date & Time</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formattedDate}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.accent }]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Continue Shopping</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',

  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    
  },
  iconContainer: {
    marginTop: -100,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottieAnimation: {
    width: 360,
    height: 360,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  successSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  receiptCard: {
    width: width - 48,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '65%',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    marginBottom: 60
  },
  primaryButton: {
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00FF66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 0

  },
  primaryButtonText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: 'bold',
  },
});

export default PaymentSuccessScreen;
