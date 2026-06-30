import React, { useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Platform, Animated } from 'react-native';

interface BottomNavigationProps {
  isDarkMode: boolean;
  currentTab: 'home' | 'deals' | 'fitness' | 'cart' | 'profile';
  onTabPress: (tab: 'home' | 'deals' | 'fitness' | 'cart' | 'profile') => void;
}

const { width } = Dimensions.get('window');
const containerWidth = width - 32;
const navBarPadding = 8;
const tabWidth = (containerWidth - navBarPadding * 2) / 5;

const BottomNavigation: React.FC<BottomNavigationProps> = ({ isDarkMode, currentTab, onTabPress }) => {
  const colors = {
    bg: isDarkMode ? '#161A22' : '#FFFFFF',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    active: isDarkMode ? '#FF7A00' : '#EAB308',
    inactive: isDarkMode ? '#64748B' : '#6B7280',
    activeBg: isDarkMode ? 'rgba(255, 122, 0, 0.12)' : '#FEF9C3',
  };

  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'deals', label: 'Store', icon: '💊' },
    { id: 'fitness', label: 'Trainer', icon: '🎖️' },
    { id: 'cart', label: 'Gym', icon: '🏋️' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ] as const;

  const tabNames = ['home', 'deals', 'fitness', 'cart', 'profile'];
  const activeIndex = tabNames.indexOf(currentTab);
  const animationValue = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    Animated.spring(animationValue, {
      toValue: activeIndex,
      useNativeDriver: true,
      tension: 60,
      friction: 9,
    }).start();
  }, [activeIndex]);

  const translateX = animationValue.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [0, tabWidth, tabWidth * 2, tabWidth * 3, tabWidth * 4],
  });

  return (
    <View style={styles.container}>
      <View style={[styles.navBar, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        {/* Animated Sliding Background Capsule */}
        <Animated.View
          style={[
            styles.activeBgIndicator,
            {
              width: tabWidth - 4, // slight margin inside the tab cell
              transform: [{ translateX }],
              backgroundColor: colors.activeBg,
            },
          ]}
        />
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.navItem}
              activeOpacity={0.8}
              onPress={() => onTabPress(tab.id)}
            >
              <Text style={[styles.navIcon, { color: isActive ? colors.active : colors.inactive }]}>
                {tab.icon}
              </Text>
              <Text style={[
                styles.navText,
                { color: isActive ? colors.active : colors.inactive },
                isActive && styles.activeText
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: 16,
    right: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBar: {
    width: '100%',
    height: 72,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: navBarPadding,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    position: 'relative',
  },
  activeBgIndicator: {
    position: 'absolute',
    height: 48,
    borderRadius: 20,
    top: 11, // Center vertically (72 - 48)/2 = 12
    left: navBarPadding + 2, // Slight offset for margin
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    width: tabWidth,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  navText: {
    fontSize: 10,
    fontWeight: '600',
  },
  activeText: {
    fontWeight: '800',
  },
});

export default BottomNavigation;
