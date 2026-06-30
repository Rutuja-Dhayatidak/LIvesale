import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ImageBackground,
  Dimensions,
  Image,
  Animated,
  Easing,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { authService } from '../services/authService';

const { width } = Dimensions.get('window');

interface SignInScreenProps {
  onBackToOnboarding?: () => void;
  onNavigateToRegister?: () => void;
  onLoginSuccess?: () => void;
}

const SignInScreen: React.FC<SignInScreenProps> = ({ 
  onBackToOnboarding, 
  onNavigateToRegister,
  onLoginSuccess 
}) => {
  // Navigation internal mode
  const [showLoginForm, setShowLoginForm] = useState(false);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animation values
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-30)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(40)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reset animations and play them
    bgOpacity.setValue(0);
    headerOpacity.setValue(0);
    headerTranslateY.setValue(-30);
    contentOpacity.setValue(0);
    contentTranslateY.setValue(40);
    footerOpacity.setValue(0);

    Animated.sequence([
      Animated.timing(bgOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(footerOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [showLoginForm]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      return Alert.alert('Error', 'Please fill all required fields');
    }
    try {
      setLoading(true);
      const res = await authService.login(email.toLowerCase(), password);
      Alert.alert('Success', 'Login successful!', [
        { 
          text: 'OK', 
          onPress: () => {
            if (onLoginSuccess) onLoginSuccess();
          } 
        }
      ]);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Login Failed', err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Background Image with Fitness Theme */}
      <ImageBackground
        source={{ 
          uri: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1000' 
        }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Dark overlay with fade in animation */}
        <Animated.View style={[styles.overlay, { opacity: bgOpacity }]}>
          <SafeAreaView style={styles.safeArea}>
            
            {/* Header Section */}
            <Animated.View 
              style={[
                styles.header, 
                { 
                  opacity: headerOpacity,
                  transform: [{ translateY: headerTranslateY }] 
                }
              ]}
            >
              {showLoginForm ? (
                <View style={styles.loginHeader}>
                  <TouchableOpacity 
                    onPress={() => setShowLoginForm(false)} 
                    style={styles.backButton}
                  >
                    <Text style={styles.backArrowText}>←</Text>
                  </TouchableOpacity>
                  <Text style={styles.welcomeText}>Welcome back</Text>
                  <Text style={styles.welcomeSubtext}>Sign in to your account</Text>
                </View>
              ) : (
                <Text style={styles.mainTitle}>FITNESS <Text style={styles.subTitleLight}>ONLINE</Text></Text>
              )}
            </Animated.View>

            {/* Content Section */}
            <Animated.View 
              style={[
                styles.contentContainer, 
                { 
                  opacity: contentOpacity,
                  transform: [{ translateY: contentTranslateY }] 
                },
                showLoginForm && { marginBottom: 240 }
              ]}
            >
              {showLoginForm ? (
                /* RENDER LOGIN FORM MOCKUP */
                <View style={styles.formContainer}>
                  
                  {/* Email Field */}
                  <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputIcon}>✉️</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="name@example.com"
                      placeholderTextColor="#64748B"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>

                  {/* Password Field */}
                  <Text style={[styles.inputLabel, { marginTop: 16 }]}>PASSWORD</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="••••••••"
                      placeholderTextColor="#64748B"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      value={password}
                      onChangeText={setPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                      <Text style={{ fontSize: 16 }}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Remember me & Forgot Password */}
                  <View style={styles.formControlRow}>
                    <TouchableOpacity 
                      activeOpacity={0.8}
                      onPress={() => setRememberMe(!rememberMe)}
                      style={styles.checkboxRow}
                    >
                      <View style={[styles.checkbox, { backgroundColor: rememberMe ? '#FF7A00' : 'transparent', borderColor: rememberMe ? '#FF7A00' : '#E2E8F0' }]}>
                        {rememberMe && <Text style={styles.checkMark}>✓</Text>}
                      </View>
                      <Text style={styles.checkboxLabel}>Remember me</Text>
                    </TouchableOpacity>

                    <TouchableOpacity>
                      <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Sign In Orange Button */}
                  <TouchableOpacity 
                    style={[styles.signInOrangeBtn, { backgroundColor: '#FF7A00' }]} 
                    activeOpacity={0.85}
                    onPress={handleLogin}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.signInOrangeText}>Sign In  →</Text>
                    )}
                  </TouchableOpacity>

                  {/* Don't have an account? Register link */}
                  <View style={styles.registerRow}>
                    <Text style={styles.dontHaveText}>Don't have an account? </Text>
                    <TouchableOpacity onPress={onNavigateToRegister}>
                      <Text style={styles.registerLinkText}>Register here</Text>
                    </TouchableOpacity>
                  </View>

                </View>
              ) : (
                /* RENDER INTRO/PORTAL OPTIONS */
                <>
                  {/* Email Sign In Link */}
                  <TouchableOpacity 
                    activeOpacity={0.7} 
                    onPress={() => setShowLoginForm(true)}
                    style={styles.linkContainer}
                  >
                    <Text style={styles.emailLinkText}>Sign in/Sign up with email</Text>
                  </TouchableOpacity>

                  {/* SKIP Button */}
                  <TouchableOpacity 
                    style={styles.skipButton} 
                    activeOpacity={0.8}
                    onPress={onBackToOnboarding}
                  >
                    <Text style={styles.skipButtonText}>SKIP</Text>
                  </TouchableOpacity>

                  {/* Google Sign In Button */}
                  <TouchableOpacity 
                    style={styles.googleButton} 
                    activeOpacity={0.85}
                    onPress={onBackToOnboarding}
                  >
                    <Image 
                      source={{ uri: 'https://developers.google.com/static/identity/images/g-logo.png' }} 
                      style={styles.googleLogo}
                      resizeMode="contain"
                    />
                    <Text style={styles.googleButtonText}>Sign in with Google</Text>
                  </TouchableOpacity>

                  {/* Coach Link */}
                  <TouchableOpacity 
                    activeOpacity={0.7} 
                    onPress={() => console.log('Coach Sign In')}
                    style={styles.linkContainer}
                  >
                    <Text style={styles.coachLinkText}>Are you a coach? Tap here</Text>
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>

            {/* Disclaimer Footer Section */}
            {!showLoginForm && (
              <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
                <Text style={styles.disclaimerText}>
                  By carrying on using Fitness Online, you agree to accept{' '}
                  <Text style={styles.disclaimerLink} onPress={() => console.log('User agreement')}>User agreement</Text>
                  {' '}and{' '}
                  <Text style={styles.disclaimerLink} onPress={() => console.log('Privacy policy')}>Privacy policy</Text>
                </Text>
              </Animated.View>
            )}

          </SafeAreaView>
        </Animated.View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)', // Slightly darker overlay for form legibility
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    width: '100%',
    marginTop: 50,
  },
  mainTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 10,
  },
  subTitleLight: {
    fontWeight: '300',
    color: '#E2E8F0',
  },
  loginHeader: {
    alignItems: 'flex-start',
    width: '100%',
    paddingHorizontal: 4,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
    marginBottom: 16,
  },
  backArrowText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '500',
  },
  contentContainer: {
    alignItems: 'center',
    width: '100%',
    paddingBottom: 20,
  },
  formContainer: {
    width: '100%',
    marginTop: 10,
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 27, 35, 0.95)',
    borderWidth: 1.5,
    borderColor: '#232530',
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  eyeBtn: {
    padding: 4,
  },
  formControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkMark: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
  },
  checkboxLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  forgotPasswordText: {
    color: '#FF7A00',
    fontSize: 13,
    fontWeight: '700',
  },
  signInOrangeBtn: {
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF7A00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  signInOrangeText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  dontHaveText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
  },
  registerLinkText: {
    color: '#FF7A00',
    fontSize: 13,
    fontWeight: '700',
  },
  linkContainer: {
    paddingVertical: 10,
    marginBottom: 10,
  },
  emailLinkText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  skipButton: {
    width: '100%',
    height: 52,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    height: 54,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  googleLogo: {
    width: 18,
    height: 18,
    marginRight: 10,
  },
  googleButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  coachLinkText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 10,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
  disclaimerLink: {
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
});

export default SignInScreen;
