import React, { useState, useEffect } from 'react';
import { StatusBar, View, StyleSheet, BackHandler } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import OnboardingScreen from './src/pages/OnboardingScreen';
import SignInScreen from './src/pages/SignInScreen';
import Home from './src/components/Home';
import Profile from './src/components/Profile';
import BottomNavigation from './src/components/BottomNavigation';
import TrainersListScreen from './src/pages/TrainersListScreen';
import TrainerProfileScreen from './src/pages/TrainerProfileScreen';
import CartScreen from './src/pages/CartScreen';
import GymScreen from './src/pages/GymScreen';
import HealthStoreScreen from './src/pages/HealthStoreScreen';
import ProductDetailScreen from './src/pages/ProductDetailScreen';
import AnimatedScreenWrapper from './src/components/AnimatedScreenWrapper';
import RegisterScreen from './src/pages/RegisterScreen';
import PaymentSuccessScreen from './src/pages/PaymentSuccessScreen';
import CheckoutScreen from './src/pages/CheckoutScreen';
import MyOrdersScreen from './src/pages/MyOrdersScreen';
import GymDetailsScreen from './src/pages/GymDetailsScreen';

function App() {
  const [currentScreen, setCurrentScreen] = useState<'onboarding' | 'signin' | 'register' | 'home'>('onboarding');
  const [currentTab, setCurrentTab] = useState<'home' | 'deals' | 'fitness' | 'cart' | 'profile'>('home');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    orderId: string;
    paymentId: string;
    amount: number;
    productName: string;
  } | null>(null);
  const [checkoutData, setCheckoutData] = useState<{
    productId: string;
    selectedVariantIndex: number;
  } | null>(null);
  const [showMyOrders, setShowMyOrders] = useState(false);
  const [healthStoreTab, setHealthStoreTab] = useState<'diet' | 'supplement'>('diet');

  useEffect(() => {
    const backAction = () => {
      if (paymentSuccessData) {
        setPaymentSuccessData(null);
        return true;
      } else if (checkoutData) {
        setCheckoutData(null);
        return true;
      } else if (showMyOrders) {
        setShowMyOrders(false);
        return true;
      } else if (selectedTrainerId) {
        // If viewing a trainer profile, go back to trainer list
        setSelectedTrainerId(null);
        return true; // Prevent default behavior (exit)
      } else if (selectedGymId) {
        setSelectedGymId(null);
        return true;
      } else if (selectedProductId) {
        // If viewing a product detail, go back to store
        setSelectedProductId(null);
        return true;
      } else if (currentScreen === 'home' && currentTab !== 'home') {
        // If on a tab other than home, go back to home tab
        setCurrentTab('home');
        return true;
      } else if (currentScreen === 'signin') {
        // If on sign in, go back to onboarding
        setCurrentScreen('onboarding');
        return true;
      } else if (currentScreen === 'register') {
        // If on register, go back to sign in
        setCurrentScreen('signin');
        return true;
      }
      // Let default behavior happen (exit app)
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [selectedTrainerId, selectedProductId, currentTab, currentScreen, paymentSuccessData, checkoutData, showMyOrders]);

  const colors = {
    bg: isDarkMode ? '#0D0E12' : '#F1F2F4',
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
      {paymentSuccessData ? (
        <AnimatedScreenWrapper screenKey="payment-success" type="slide-up">
          <PaymentSuccessScreen
            isDarkMode={isDarkMode}
            orderId={paymentSuccessData.orderId}
            paymentId={paymentSuccessData.paymentId}
            amount={paymentSuccessData.amount}
            productName={paymentSuccessData.productName}
            onClose={() => {
              setPaymentSuccessData(null);
              setSelectedProductId(null);
              setCurrentTab('deals');
            }}
          />
        </AnimatedScreenWrapper>
      ) : checkoutData ? (
        <AnimatedScreenWrapper screenKey="checkout" type="slide-right">
          <CheckoutScreen
            isDarkMode={isDarkMode}
            productId={checkoutData.productId}
            selectedVariantIndex={checkoutData.selectedVariantIndex}
            onBack={() => setCheckoutData(null)}
            onPaymentSuccess={(details) => {
              setCheckoutData(null);
              setPaymentSuccessData(details);
            }}
          />
        </AnimatedScreenWrapper>
      ) : showMyOrders ? (
        <AnimatedScreenWrapper screenKey="myorders" type="slide-right">
          <MyOrdersScreen
            isDarkMode={isDarkMode}
            onBack={() => setShowMyOrders(false)}
          />
        </AnimatedScreenWrapper>
      ) : currentScreen === 'onboarding' ? (
        <AnimatedScreenWrapper screenKey="onboarding" type="fade">
          <StatusBar barStyle="light-content" backgroundColor="#0D0E12" />
          <OnboardingScreen onGetStarted={() => setCurrentScreen('signin')} />
        </AnimatedScreenWrapper>
      ) : currentScreen === 'signin' ? (
        <AnimatedScreenWrapper screenKey="signin" type="slide-right">
          <SignInScreen 
            onBackToOnboarding={() => setCurrentScreen('home')} 
            onNavigateToRegister={() => setCurrentScreen('register')} 
            onLoginSuccess={() => setCurrentScreen('home')}
          />
        </AnimatedScreenWrapper>
      ) : currentScreen === 'register' ? (
        <AnimatedScreenWrapper screenKey="register" type="slide-right">
          <RegisterScreen 
            isDarkMode={isDarkMode} 
            onBackToSignIn={() => setCurrentScreen('signin')} 
            onRegisterSuccess={() => setCurrentScreen('home')} 
          />
        </AnimatedScreenWrapper>
      ) : (
        <SafeAreaView style={[styles.dashboardContainer, { backgroundColor: colors.bg }]} edges={['top']}>
          <StatusBar 
            barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
            backgroundColor={colors.bg} 
          />
          <View style={{ flex: 1 }}>
            {selectedTrainerId ? (
              <AnimatedScreenWrapper screenKey={`trainer-${selectedTrainerId}`} type="slide-right">
                <TrainerProfileScreen 
                  isDarkMode={isDarkMode} 
                  trainerId={selectedTrainerId} 
                  onBack={() => setSelectedTrainerId(null)} 
                />
              </AnimatedScreenWrapper>
            ) : selectedGymId ? (
              <AnimatedScreenWrapper screenKey={`gym-${selectedGymId}`} type="slide-right">
                <GymDetailsScreen
                  isDarkMode={isDarkMode}
                  gymId={selectedGymId}
                  onBack={() => setSelectedGymId(null)}
                />
              </AnimatedScreenWrapper>
            ) : selectedProductId ? (
              <AnimatedScreenWrapper screenKey={`product-${selectedProductId}`} type="slide-right">
                <ProductDetailScreen 
                  isDarkMode={isDarkMode} 
                  productId={selectedProductId} 
                  onBack={() => setSelectedProductId(null)} 
                  onBuyNow={(prodId: string, varIndex: number) => setCheckoutData({ productId: prodId, selectedVariantIndex: varIndex })}
                />
              </AnimatedScreenWrapper>
            ) : currentTab === 'profile' ? (
              <AnimatedScreenWrapper screenKey="profile" type="slide-up">
                <Profile 
                  isDarkMode={isDarkMode} 
                  onToggleTheme={() => setIsDarkMode(!isDarkMode)} 
                  onLogout={() => {
                    setCurrentScreen('signin');
                    setCurrentTab('home');
                  }}
                  onMyOrdersPress={() => setShowMyOrders(true)}
                />
              </AnimatedScreenWrapper>
            ) : currentTab === 'deals' ? (
              <AnimatedScreenWrapper screenKey={`deals-${healthStoreTab}`} type="slide-up">
                <HealthStoreScreen
                  isDarkMode={isDarkMode}
                  onProductSelect={(id) => setSelectedProductId(id)}
                  initialTab={healthStoreTab}
                />
              </AnimatedScreenWrapper>
            ) : currentTab === 'cart' ? (
              <AnimatedScreenWrapper screenKey="cart" type="slide-up">
                <GymScreen isDarkMode={isDarkMode} onGymSelect={(id) => setSelectedGymId(id)} />
              </AnimatedScreenWrapper>
            ) : currentTab === 'fitness' ? (
              <AnimatedScreenWrapper screenKey="fitness" type="slide-up">
                <TrainersListScreen 
                  isDarkMode={isDarkMode} 
                  onTrainerSelect={(id) => setSelectedTrainerId(id)} 
                />
              </AnimatedScreenWrapper>
            ) : (
              <AnimatedScreenWrapper screenKey="home" type="slide-up">
                <Home
                  isDarkMode={isDarkMode}
                  onToggleTheme={() => setIsDarkMode(!isDarkMode)}
                  onNavigateToTrainers={() => setCurrentTab('fitness')}
                  onNavigateToDiet={() => { setHealthStoreTab('diet'); setCurrentTab('deals'); }}
                  onNavigateToSupplements={() => { setHealthStoreTab('supplement'); setCurrentTab('deals'); }}
                  onTrainerSelect={(id) => setSelectedTrainerId(id)}
                  onNavigateToCart={() => setCurrentTab('cart')}
                  onNavigateToGyms={() => setCurrentTab('cart')}
                  onGymSelect={(id) => setSelectedGymId(id)}
                />
              </AnimatedScreenWrapper>
            )}
          </View>
          {!selectedTrainerId && !selectedGymId && !selectedProductId && (
            <BottomNavigation 
              isDarkMode={isDarkMode} 
              currentTab={currentTab} 
              onTabPress={(tab) => {
                setCurrentTab(tab);
                setSelectedTrainerId(null);
                setSelectedGymId(null);
                setSelectedProductId(null);
              }} 
            />
          )}
        </SafeAreaView>
      )}
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  dashboardContainer: {
    flex: 1,
  },
});

export default App;

