import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
  PanResponder,
  ImageBackground,
} from 'react-native';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
  onGetStarted: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onGetStarted }) => {
  // Animation values
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(40)).current;

  const featuresOpacity = useRef(new Animated.Value(0)).current;
  const featuresTranslateY = useRef(new Animated.Value(30)).current;

  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(40)).current;

  // Slide to unlock values
  const panX = useRef(new Animated.Value(0)).current;
  const isTriggered = useRef(false);

  const handleSize = 50;
  const padding = 5;
  // Calculate width statically: screen width - horizontal container padding (24 * 2)
  const sliderWidth = width - 48;
  const maxDrag = sliderWidth - handleSize - padding * 2;

  const panResponder = React.useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { },
      onPanResponderMove: (evt, gestureState) => {
        if (isTriggered.current) return;
        let newX = gestureState.dx;
        if (newX < 0) newX = 0;
        if (newX > maxDrag) newX = maxDrag;
        panX.setValue(newX);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (isTriggered.current) return;

        // If slid more than 80% of the slider track
        if (gestureState.dx >= maxDrag * 0.8) {
          isTriggered.current = true;
          Animated.timing(panX, {
            toValue: maxDrag,
            duration: 150,
            useNativeDriver: false,
          }).start(() => {
            console.log('Action Triggered!');
            onGetStarted();
          });
        } else {
          // Snap back to start
          Animated.spring(panX, {
            toValue: 0,
            tension: 40,
            friction: 7,
            useNativeDriver: false,
          }).start();
        }
      },
    });
  }, [maxDrag, onGetStarted]);

  // Fade out text as the user slides
  const textOpacityInterpolation = panX.interpolate({
    inputRange: [0, maxDrag > 0 ? maxDrag * 0.4 : 1],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    // Run stagger animations for smooth entrance sequence
    Animated.stagger(180, [
      // 1. Logo spring zoom and fade in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 20,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      // 2. Headings and welcome text fade and slide up
      Animated.parallel([
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // 3. Feature cards slide up and fade
      Animated.parallel([
        Animated.timing(featuresTranslateY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(featuresOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // 4. Get Started CTA button animation
      Animated.parallel([
        Animated.timing(buttonTranslateY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [
    logoScale,
    logoOpacity,
    textTranslateY,
    textOpacity,
    featuresTranslateY,
    featuresOpacity,
    buttonTranslateY,
    buttonOpacity,
  ]);

  // Button scale animation on press
  const buttonScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 4,
      tension: 50,
      useNativeDriver: true,
    }).start();
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1000&auto=format&fit=crop' }}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="light-content" backgroundColor="#0D0E12" />
          <View style={styles.container}>
            {/* Top Decorative Lights / Glow Effect */}
            <View style={styles.glowTop} />

            {/* Header Section */}
            <View style={styles.header}>
              <Text style={styles.appName}>
                LiveSale<Text style={styles.accentText}>.Fitness</Text>
              </Text>
            </View>

            {/* Middle Section to center both graphic and text content */}
            <View style={styles.middleSection}>
              {/* Visual Graphic Section with Spring Scale Animation */}
              <Animated.View
                style={[
                  styles.graphicContainer,
                  {
                    opacity: logoOpacity,
                    transform: [{ scale: logoScale }],
                  },
                ]}
              >
                <View style={styles.outerRing}>
                  <View style={styles.middleRing}>
                    <View style={styles.innerRing}>
                      <Text style={styles.graphicIcon}>⚡</Text>
                    </View>
                  </View>
                </View>
                {/* Subtle glowing lines below the ring */}
                <View style={styles.glowPill} />
              </Animated.View>

              {/* Text content Section with Slide-up & Fade Animation */}
              <Animated.View
                style={[
                  styles.contentContainer,
                  {
                    opacity: textOpacity,
                    transform: [{ translateY: textTranslateY }],
                  },
                ]}
              >
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>GET READY TO TRANSFORM</Text>
                </View>

                <Text style={styles.title}>LiveSale.Fitness</Text>
                <Text style={styles.subtitle}>Your fitness journey starts here</Text>

                <Text style={styles.welcomeText}>
                  Experience the next generation of home workouts. Stream live sessions with world-class coaches, chat in real-time, and get premium gear delivered directly to your door.
                </Text>
              </Animated.View>
            </View>

            {/* Bottom Button Section with Slide-up & Fade Animation */}
            <Animated.View
              style={[
                styles.footer,
                {
                  opacity: buttonOpacity,
                  transform: [
                    { translateY: buttonTranslateY },
                    { scale: buttonScale }
                  ],
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={onGetStarted}
                style={styles.primaryButton}
              >
                <Text style={styles.buttonText}>Get Started</Text>
                <Text style={styles.buttonArrow}>→</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 14, 18, 0.82)', // Dark premium overlay for content contrast
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  glowTop: {
    position: 'absolute',
    top: -100,
    width: width * 1.2,
    height: 300,
    borderRadius: width * 0.6,
    backgroundColor: 'rgba(255, 122, 0, 0.08)',
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  appName: {

    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
    marginTop: 15,
  },
  accentText: {
    color: '#FF7A00', // Premium fitness orange
  },
  graphicContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  outerRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(255, 122, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF7A00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  middleRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: 'rgba(255, 122, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#161A22',
    borderWidth: 1,
    borderColor: '#FF7A00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphicIcon: {
    fontSize: 38,
  },
  glowPill: {
    marginTop: 15,
    width: 60,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF7A00',
    shadowColor: '#FF7A00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },
  contentContainer: {
    alignItems: 'center',
    width: '100%',
  },
  badge: {
    backgroundColor: 'rgba(255, 122, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 0, 0.2)',
  },
  badgeText: {
    color: '#FF7A00',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94A3B8', // Slate color
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 14,
    color: '#64748B', // Muted text
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 15,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161A22',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242C3D',
  },
  featureEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  featureText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 50,
  },
  primaryButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF7A00', // Premium Fitness Orange
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF7A00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    color: '#0D0E12',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  buttonArrow: {
    color: '#0D0E12',
    fontSize: 20,
    fontWeight: '800',
    marginLeft: 8,
  },
});

export default OnboardingScreen;

