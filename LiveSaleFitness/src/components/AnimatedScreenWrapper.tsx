import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing } from 'react-native';

const { width } = Dimensions.get('window');

interface AnimatedScreenWrapperProps {
  children: React.ReactNode;
  screenKey: string;
  type?: 'slide-right' | 'slide-up' | 'fade';
}

export const AnimatedScreenWrapper: React.FC<AnimatedScreenWrapperProps> = ({ 
  children, 
  screenKey,
  type = 'slide-up'
}) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animValue.setValue(0);
    Animated.timing(animValue, {
      toValue: 1,
      duration: 350,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [screenKey]);

  const getStyle = () => {
    if (type === 'slide-right') {
      return {
        flex: 1,
        transform: [
          {
            translateX: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [width, 0], // Slide in from the very right edge of screen
            }),
          },
        ],
      };
    }

    if (type === 'slide-up') {
      return {
        flex: 1,
        opacity: animValue,
        transform: [
          {
            translateY: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0], // Slide up 30px from bottom
            }),
          },
        ],
      };
    }

    return {
      flex: 1,
      opacity: animValue,
    };
  };

  return (
    <Animated.View style={getStyle()}>
      {children}
    </Animated.View>
  );
};

export default AnimatedScreenWrapper;
