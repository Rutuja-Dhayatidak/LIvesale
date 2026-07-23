import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Platform } from 'react-native';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  productId?: string;
  variantIndex?: number;
  flavor?: string;
  size?: string;
  healthStore?: string;
}

interface CartScreenProps {
  isDarkMode: boolean;
  onBack?: () => void;
  cartItems: CartItem[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onCheckout: () => void;
}

const CartScreen: React.FC<CartScreenProps> = ({ isDarkMode, onBack, cartItems, setCartItems, onCheckout }) => {

  const updateQuantity = (id: string, delta: number) => {
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeItem = (id: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxes = subtotal * 0.1; // 10% tax for example
  const total = subtotal + taxes;

  const colors = {
    bg: isDarkMode ? '#0D0E12' : '#F1F2F4',
    text: isDarkMode ? '#FFFFFF' : '#0D0E12',
    textMuted: isDarkMode ? '#A0A0A0' : '#666666',
    cardBg: isDarkMode ? '#1E1F24' : '#FFFFFF',
    border: isDarkMode ? '#2A2B30' : '#E5E5E5',
    accent: '#00FF66', // Neon green accent
    remove: '#FF3366', // Red for remove action
  };

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={[styles.cartItem, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <Image source={{ uri: item.image }} style={styles.itemImage} />
      <View style={styles.itemDetails}>
        <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.itemPrice, { color: colors.accent }]}>₹{item.price.toFixed(2)}</Text>
        
        <View style={styles.actionRow}>
          <View style={[styles.quantityContainer, { backgroundColor: isDarkMode ? '#2A2B30' : '#F1F2F4' }]}>
            <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={styles.quantityBtn}>
              <Text style={[styles.quantityBtnText, { color: colors.text }]}>-</Text>
            </TouchableOpacity>
            <Text style={[styles.quantityText, { color: colors.text }]}>{item.quantity}</Text>
            <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={styles.quantityBtn}>
              <Text style={[styles.quantityBtnText, { color: colors.text }]}>+</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => removeItem(item.id)}>
            <Text style={[styles.removeText, { color: colors.remove }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backArrow}>
            <Text style={[styles.backArrowText, { color: colors.text }]}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: colors.text }]}>Your Cart</Text>
      </View>
      
      {cartItems.length > 0 ? (
        <FlatList
          data={cartItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Your cart is empty.</Text>
        </View>
      )}

      <View style={[styles.summaryContainer, { backgroundColor: colors.cardBg, borderTopColor: colors.border }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryText, { color: colors.textMuted }]}>Subtotal</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>₹{subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryText, { color: colors.textMuted }]}>Taxes</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>₹{taxes.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={[styles.totalText, { color: colors.text }]}>Total</Text>
          <Text style={[styles.totalValue, { color: colors.accent }]}>₹{total.toFixed(2)}</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.checkoutButton, { backgroundColor: cartItems.length === 0 ? colors.border : colors.accent }]}
          disabled={cartItems.length === 0}
          onPress={onCheckout}
        >
          <Text style={[styles.checkoutButtonText, { color: cartItems.length === 0 ? colors.textMuted : '#000000' }]}>
            Proceed to Checkout
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 10,
  },
  backArrow: {
    marginRight: 15,
    paddingVertical: 5,
  },
  backArrowText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cartItem: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  quantityBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  quantityBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  removeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  summaryContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  checkoutButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  checkoutButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CartScreen;
