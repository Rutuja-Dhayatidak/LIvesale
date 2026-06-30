import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { authService } from '../services/authService';
import { launchImageLibrary } from 'react-native-image-picker';

const { width } = Dimensions.get('window');

interface RegisterScreenProps {
  isDarkMode: boolean;
  onBackToSignIn: () => void;
  onRegisterSuccess: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ isDarkMode, onBackToSignIn, onRegisterSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  // Step 1 States
  const [email, setEmail] = useState('');
  const [phoneCode, setPhoneCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  // Step 2 States
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 3 States
  const [profilePhoto, setProfilePhoto] = useState('https://cdn-icons-png.flaticon.com/512/149/149071.png');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  // Step 4 States
  const [fitnessGoal, setFitnessGoal] = useState<'Weight Loss' | 'Build Muscle' | 'General Fitness' | 'Flexibility' | ''>('');

  // Step 5 States
  const [stateName, setStateName] = useState('Maharashtra');
  const [cityName, setCityName] = useState('Pune');

  // Step 6 States
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleSelectImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: false,
      },
      (response) => {
        if (response.didCancel) {
          console.log('User cancelled image picker');
        } else if (response.errorMessage) {
          console.log('ImagePicker Error: ', response.errorMessage);
          Alert.alert('Error', 'Failed to pick image.');
        } else if (response.assets && response.assets.length > 0) {
          const source = response.assets[0].uri;
          if (source) {
            setProfilePhoto(source);
          }
        }
      }
    );
  };

  // Timer for OTP
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Passwords validations
  const passMinChar = password.length >= 8;
  const passHasLetters = /[a-zA-Z]/.test(password);
  const passHasNumbers = /\d/.test(password);

  const handleSendOtp = async () => {
    if (otpLoading || timer > 0) return; // Prevent double submission
    if (!email.trim() || !email.includes('@')) {
      return Alert.alert('Invalid Email', 'Please enter a valid email address first.');
    }
    try {
      setOtpLoading(true);
      await authService.sendOtp(email);
      setOtpSent(true);
      setTimer(60);
      Alert.alert('OTP Sent', 'An OTP has been sent to your email.');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) {
      return Alert.alert('Invalid OTP', 'Please enter a valid OTP code.');
    }
    try {
      setOtpLoading(true);
      await authService.verifyOtp(email, otp);
      setOtpVerified(true);
      Alert.alert('Verified', 'Email verified successfully!');
      // Auto move to step 2 after verification
      setCurrentStep(2);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Verification Failed', err.response?.data?.message || 'Incorrect OTP code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!otpVerified) {
        // Fallback for development if they want to bypass verification
        Alert.alert(
          'Verification Required',
          'Please verify your email with OTP first. Proceed anyway for testing?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Bypass', onPress: () => { setOtpVerified(true); setCurrentStep(2); } }
          ]
        );
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!passMinChar || !passHasLetters || !passHasNumbers) {
        return Alert.alert('Weak Password', 'Please fulfill all password requirements.');
      }
      if (password !== confirmPassword) {
        return Alert.alert('Mismatch', 'Passwords do not match.');
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!name.trim()) return Alert.alert('Name Required', 'Please enter your Full Name.');
      if (!age.trim()) return Alert.alert('Age Required', 'Please enter your age.');
      if (!gender) return Alert.alert('Gender Required', 'Please select your gender.');
      if (!height.trim()) return Alert.alert('Height Required', 'Please enter your height.');
      if (!weight.trim()) return Alert.alert('Weight Required', 'Please enter your weight.');
      setCurrentStep(4);
    } else if (currentStep === 4) {
      if (!fitnessGoal) return Alert.alert('Goal Required', 'Please select a fitness goal.');
      setCurrentStep(5);
    } else if (currentStep === 5) {
      if (!stateName.trim() || !cityName.trim()) {
        return Alert.alert('Location Required', 'Please enter state and city.');
      }
      setCurrentStep(6);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onBackToSignIn();
    }
  };

  const handleCreateAccount = async () => {
    if (!agreeTerms) {
      return Alert.alert('Agreement Required', 'You must agree to the Terms of Service and Privacy Policy.');
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('fullName', name);
      formData.append('email', email.toLowerCase());
      formData.append('password', password);
      if (phone) {
        formData.append('phone', `${phoneCode}${phone}`);
      }
      formData.append('age', age);
      formData.append('gender', gender);
      formData.append('height', height);
      formData.append('weight', weight);
      formData.append('fitnessGoal', fitnessGoal.toLowerCase().replace(' ', '_'));
      formData.append('location', stateName);
      formData.append('city', cityName);

      // Check if profilePhoto is a local URI picked from image library
      if (profilePhoto && profilePhoto.startsWith('file://')) {
        const uriParts = profilePhoto.split('/');
        const fileName = uriParts[uriParts.length - 1] || 'photo.jpg';
        const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
        
        formData.append('profilePhoto', {
          uri: Platform.OS === 'android' ? profilePhoto : profilePhoto.replace('file://', ''),
          name: fileName,
          type: fileType,
        } as any);
      }

      // Register the user
      await authService.register(formData);

      // Programmatically login the user so they have a valid token
      try {
        await authService.login(email.toLowerCase(), password);
      } catch (loginErr) {
        console.error("Auto login after registration failed:", loginErr);
      }

      Alert.alert('Congratulations!', 'Account created successfully!', [
        { text: 'Let’s Start', onPress: onRegisterSuccess }
      ]);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Registration Failed', err.response?.data?.message || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1000' }}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Step Indicator Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.indicatorHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.backArrow}>
            <Text style={styles.backArrowText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.stepText}>Step {currentStep} of {totalSteps}</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.progressBar}>
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.progressSegment,
                { backgroundColor: idx + 1 <= currentStep ? '#FF7A00' : '#232530' }
              ]}
            />
          ))}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.title}>Create <Text style={{ color: '#FF7A00' }}>Account</Text></Text>

          {/* STEP 1: Email/Phone Credentials */}
          {currentStep === 1 && (
            <View style={styles.stepWrapper}>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter email address"
                  placeholderTextColor="#64748B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {/* Phone Input with Code */}
              <View style={styles.row}>
                <View style={[styles.inputContainer, { width: 80, marginRight: 8, justifyContent: 'center' }]}>
                  <TextInput
                    style={[styles.textInput, { textAlign: 'center', paddingLeft: 0 }]}
                    value={phoneCode}
                    onChangeText={setPhoneCode}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputIcon}>📞</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="8767605792"
                    placeholderTextColor="#64748B"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
              </View>

              {/* OTP Field if Sent */}
              <View style={[styles.inputContainer, { marginTop: 12 }]}>
                <Text style={styles.inputIcon}>🔑</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter OTP verification code"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={otp}
                  onChangeText={setOtp}
                />
                {email.trim() && !otpSent && (
                  <TouchableOpacity 
                    onPress={handleSendOtp} 
                    style={[styles.inlineButton, (otpLoading || timer > 0) && { opacity: 0.6 }]}
                    disabled={otpLoading || timer > 0}
                  >
                    {otpLoading ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.inlineButtonText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {otpSent && (
                <View style={styles.otpActionRow}>
                  <Text style={styles.timerText}>
                    {timer > 0 ? `Resend in ${timer}s` : 'Resend OTP?'}
                  </Text>
                  {timer === 0 && (
                    <TouchableOpacity onPress={handleSendOtp}>
                      <Text style={[styles.resendLink, { color: '#FF7A00' }]}> Resend</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {otpSent && !otpVerified && (
                <TouchableOpacity 
                  onPress={handleVerifyOtp} 
                  style={[styles.verifyBtn, { backgroundColor: '#FF7A00' }]}
                >
                  {otpLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.verifyBtnText}>Verify OTP</Text>}
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.mainBtn} onPress={handleNextStep}>
                <Text style={styles.mainBtnText}>Next Step →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: Password Setting */}
          {currentStep === 2 && (
            <View style={styles.stepWrapper}>
              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Create password"
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

              {/* Confirm Password Input */}
              <View style={[styles.inputContainer, { marginTop: 12 }]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Confirm password"
                  placeholderTextColor="#64748B"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                  <Text style={{ fontSize: 16 }}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>

              {/* Password requirements */}
              <View style={styles.requirementsBox}>
                <View style={styles.reqRow}>
                  <Text style={[styles.reqCheck, { color: passMinChar ? '#00FF66' : '#64748B' }]}>
                    {passMinChar ? '✓' : '✗'}
                  </Text>
                  <Text style={[styles.reqText, { color: passMinChar ? '#FFF' : '#64748B' }]}>Min 8 characters</Text>
                </View>
                <View style={styles.reqRow}>
                  <Text style={[styles.reqCheck, { color: passHasLetters ? '#00FF66' : '#64748B' }]}>
                    {passHasLetters ? '✓' : '✗'}
                  </Text>
                  <Text style={[styles.reqText, { color: passHasLetters ? '#FFF' : '#64748B' }]}>Contains letters</Text>
                </View>
                <View style={styles.reqRow}>
                  <Text style={[styles.reqCheck, { color: passHasNumbers ? '#00FF66' : '#64748B' }]}>
                    {passHasNumbers ? '✓' : '✗'}
                  </Text>
                  <Text style={[styles.reqText, { color: passHasNumbers ? '#FFF' : '#64748B' }]}>Contains numbers</Text>
                </View>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextBtn} onPress={handleNextStep}>
                  <Text style={styles.nextBtnText}>Next Step →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 3: Personal Information & Profile Photo */}
          {currentStep === 3 && (
            <View style={styles.stepWrapper}>
              
              {/* Profile Photo Circular Container */}
              <TouchableOpacity activeOpacity={0.85} onPress={handleSelectImage} style={styles.photoContainer}>
                <Image source={{ uri: profilePhoto }} style={styles.avatar} />
                <View style={styles.cameraBadge}>
                  <Text style={styles.cameraIcon}>📷</Text>
                </View>
              </TouchableOpacity>

              {/* Full Name Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Rutuja Dhayatidak"
                  placeholderTextColor="#64748B"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Age & Gender Selector Row */}
              <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputIcon}>📅</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="22"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={age}
                    onChangeText={setAge}
                  />
                </View>
                <View style={[styles.inputContainer, { flex: 1.2, marginLeft: 8 }]}>
                  <Text style={styles.inputIcon}>🚻</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Female (e.g. female)"
                    placeholderTextColor="#64748B"
                    value={gender}
                    onChangeText={(val) => setGender(val.toLowerCase() as any)}
                  />
                </View>
              </View>

              {/* Height & Weight Inputs */}
              <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputIcon}>📏</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="149 cm"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={height}
                    onChangeText={setHeight}
                  />
                </View>
                <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputIcon}>⚖️</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="48 kg"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={weight}
                    onChangeText={setWeight}
                  />
                </View>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextBtn} onPress={handleNextStep}>
                  <Text style={styles.nextBtnText}>Next Step →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 4: Fitness Goals Selectors */}
          {currentStep === 4 && (
            <View style={styles.stepWrapper}>
              <Text style={styles.sectionSubtitle}>Select your primary fitness goal:</Text>

              {/* Goal Option Cards */}
              {[
                { key: 'Weight Loss', label: 'Weight Loss', desc: 'Burn fat & lose weight', icon: '🔥' },
                { key: 'Build Muscle', label: 'Build Muscle', desc: 'Gain strength & muscle', icon: '💪' },
                { key: 'General Fitness', label: 'General Fitness', desc: 'Stay healthy & active', icon: '❤️' },
                { key: 'Flexibility', label: 'Flexibility', desc: 'Yoga & wellness', icon: '🧘' }
              ].map((item) => {
                const isSelected = fitnessGoal === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    activeOpacity={0.8}
                    onPress={() => setFitnessGoal(item.key as any)}
                    style={[
                      styles.goalCard,
                      { borderColor: isSelected ? '#FF7A00' : '#232530' }
                    ]}
                  >
                    <View style={styles.goalCardLeft}>
                      <View style={[styles.radioButton, { borderColor: isSelected ? '#FF7A00' : '#64748B' }]}>
                        {isSelected && <View style={styles.radioButtonActive} />}
                      </View>
                      <Text style={styles.goalIcon}>{item.icon}</Text>
                      <View>
                        <Text style={styles.goalLabel}>{item.label}</Text>
                        <Text style={styles.goalDesc}>{item.desc}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextBtn} onPress={handleNextStep}>
                  <Text style={styles.nextBtnText}>Next Step →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 5: State & City Dropdowns */}
          {currentStep === 5 && (
            <View style={styles.stepWrapper}>
              {/* State Dropdown */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>📍</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="State (e.g. Maharashtra)"
                  placeholderTextColor="#64748B"
                  value={stateName}
                  onChangeText={setStateName}
                />
              </View>

              {/* City Dropdown */}
              <View style={[styles.inputContainer, { marginTop: 16 }]}>
                <Text style={styles.inputIcon}>📍</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="City (e.g. Pune)"
                  placeholderTextColor="#64748B"
                  value={cityName}
                  onChangeText={setCityName}
                />
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextBtn} onPress={handleNextStep}>
                  <Text style={styles.nextBtnText}>Next Step →</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* STEP 6: Terms and Conditions Agreement */}
          {currentStep === 6 && (
            <View style={styles.stepWrapper}>
              
              {/* Checkbox Card */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setAgreeTerms(!agreeTerms)}
                style={[
                  styles.agreementCard,
                  { borderColor: agreeTerms ? '#FF7A00' : '#232530' }
                ]}
              >
                <View style={[styles.checkbox, { borderColor: agreeTerms ? '#FF7A00' : '#64748B', backgroundColor: agreeTerms ? '#FF7A00' : 'transparent' }]}>
                  {agreeTerms && <Text style={styles.checkIcon}>✓</Text>}
                </View>
                <Text style={styles.agreementText}>
                  I agree to the <Text style={{ color: '#FF7A00', fontWeight: 'bold' }}>Terms of Service</Text> and{' '}
                  <Text style={{ color: '#FF7A00', fontWeight: 'bold' }}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.createAccountBtn, { backgroundColor: '#FF7A00' }]} 
                  onPress={handleCreateAccount}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.createAccountBtnText}>Create Account</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Already have an account? Login footer links */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={onBackToSignIn}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </View>
</ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.60)',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  indicatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backArrow: {
    padding: 4,
  },
  backArrowText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  stepText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  progressBar: {
    flexDirection: 'row',
    height: 4,
    gap: 6,
    width: '100%',
  },
  progressSegment: {
    flex: 1,
    height: '100%',
    borderRadius: 2,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 160,
  },
  stepWrapper: {
    width: '100%',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16181C',
    borderWidth: 1,
    borderColor: '#232530',
    height: 52,
    borderRadius: 12,
  },
  googleIcon: {
    width: 18,
    height: 18,
    marginRight: 10,
  },
  googleText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#1E2026',
  },
  separatorText: {
    color: '#64748B',
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121318',
    borderWidth: 1.5,
    borderColor: '#232530',
    height: 54,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    marginTop: 12,
  },
  inlineButton: {
    backgroundColor: '#FF7A00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  inlineButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  otpActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  timerText: {
    color: '#64748B',
    fontSize: 12,
  },
  resendLink: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  verifyBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  verifyBtnText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 14,
  },
  mainBtn: {
    backgroundColor: '#FF7A00',
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  mainBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '900',
  },
  eyeBtn: {
    padding: 4,
  },
  requirementsBox: {
    backgroundColor: '#121318',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#232530',
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reqCheck: {
    fontSize: 16,
    marginRight: 8,
    fontWeight: 'bold',
  },
  reqText: {
    fontSize: 13,
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    marginTop: 28,
    gap: 12,
  },
  backBtn: {
    flex: 1,
    height: 54,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#232530',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  nextBtn: {
    flex: 1.5,
    backgroundColor: '#FF7A00',
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '800',
  },
  photoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: 90,
    height: 90,
    borderRadius: 45,
    position: 'relative',
    marginBottom: 24,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF7A00',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0B0C0E',
  },
  cameraIcon: {
    fontSize: 12,
  },
  sectionSubtitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121318',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  goalCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioButtonActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF7A00',
  },
  goalIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  goalLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  goalDesc: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  agreementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121318',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkIcon: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  agreementText: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  createAccountBtn: {
    flex: 1.5,
    height: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createAccountBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '900',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
  },
  loginLink: {
    color: '#FF7A00',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default RegisterScreen;
