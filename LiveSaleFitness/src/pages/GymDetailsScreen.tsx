import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Linking,
  Animated,
} from 'react-native';
import { gymService, Gym } from '../services/Gym';

const { width } = Dimensions.get('window');

interface GymDetailsScreenProps {
  gymId: string;
  isDarkMode: boolean;
  onBack: () => void;
}

const amenityIconMap: Record<string, string> = {
  'cardio': '🏃',
  'weight': '🏋️',
  'strength': '💪',
  'trainer': '🎓',
  'changing': '🚿',
  'water': '🥛',
  'locker': '🔒',
  'wifi': '📶',
  'ac': '❄️',
  'parking': '🅿️',
  'steam': '🧖',
  'pool': '🏊',
};

const getAmenityIcon = (name: string) => {
  const normalized = name.toLowerCase();
  for (const [key, icon] of Object.entries(amenityIconMap)) {
    if (normalized.includes(key)) return icon;
  }
  return '⚡';
};

const GymDetailsScreen: React.FC<GymDetailsScreenProps> = ({ gymId, isDarkMode, onBack }) => {
  const [gym, setGym] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedTrainer, setSelectedTrainer] = useState<any | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const colors = {
    bg: isDarkMode ? '#0D0E12' : '#F8FAFC',
    card: isDarkMode ? '#161A22' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#0F172A',
    subText: isDarkMode ? '#94A3B8' : '#475569',
    border: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    accent: isDarkMode ? '#A3E635' : '#EAB308',
    accentLight: isDarkMode ? 'rgba(163, 230, 53, 0.12)' : 'rgba(234, 179, 8, 0.12)',
    buttonText: isDarkMode ? '#0D0E12' : '#FFFFFF',
    tagBg: isDarkMode ? '#1E293B' : '#F1F5F9',
  };

  useEffect(() => {
    const fetchGymDetails = async () => {
      try {
        setLoading(true);
        const res = await gymService.getGymById(gymId);
        setGym(res.data || res.gym || res);
      } catch (err) {
        console.warn('Error fetching gym details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGymDetails();
  }, [gymId]);

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.subText }]}>Loading Gym details...</Text>
      </View>
    );
  }

  if (!gym) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Gym not found</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.accent }]} onPress={onBack}>
          <Text style={{ color: colors.buttonText, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ratingVal = typeof gym.rating === 'number' ? gym.rating : (gym.rating as any)?.average || 4.5;
  const ratingCount = (gym.rating as any)?.count || 120;
  const imagesList: string[] = [];
  if (gym.heroImage) {
    imagesList.push(gym.heroImage);
  }
  if (Array.isArray(gym.images)) {
    gym.images.forEach(img => {
      if (img && !imagesList.includes(img)) imagesList.push(img);
    });
  }
  if (Array.isArray((gym as any).galleryImages)) {
    (gym as any).galleryImages.forEach((img: string) => {
      if (img && !imagesList.includes(img)) imagesList.push(img);
    });
  }
  if (imagesList.length === 0) {
    imagesList.push('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=600');
  }
  const locationText = gym.location ? `${gym.location.address}, ${gym.location.city}` : 'Pune, Maharashtra';

  const handleCall = () => {
    if (gym.phone) {
      Linking.openURL(`tel:${gym.phone}`);
    }
  };

  const handleScrollImage = (event: any) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / width);
    if (index !== activeImageIndex) {
      setActiveImageIndex(index);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Floating Back Action bar */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity style={[styles.backIconBtn, { backgroundColor: 'rgba(0,0,0,0.6)' }]} onPress={onBack}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Swipable Image Gallery */}
        <View style={styles.heroContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            nestedScrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            onScroll={handleScrollImage}
            scrollEventThrottle={16}
            style={styles.galleryScroll}
          >
            {imagesList.map((imgUrl, index) => (
              <Image key={index} source={{ uri: imgUrl }} style={styles.heroImage} />
            ))}
          </ScrollView>
          <View style={styles.overlay} pointerEvents="none" />
          
          {/* Gallery dots indicator */}
          {imagesList.length > 1 ? (
            <View style={styles.dotsContainer}>
              {imagesList.map((_, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.dot, 
                    activeImageIndex === index ? [styles.activeDot, { backgroundColor: colors.accent }] : undefined
                  ]} 
                />
              ))}
            </View>
          ) : null}
        </View>

        {/* Details Card */}
        <View style={[styles.detailsBlock, { backgroundColor: colors.card }]}>
          {/* Title and Verified */}
          <View style={styles.titleRow}>
            <Text style={[styles.gymName, { color: colors.text }]}>{gym.name}</Text>
            {!!gym.verified ? (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.accentLight }]}>
                <Text style={[styles.verifiedText, { color: colors.accent }]}>✓ VERIFIED</Text>
              </View>
            ) : null}
          </View>
          
          <Text style={[styles.gymLocationText, { color: colors.subText }]}>📍 {locationText}</Text>

          {/* Rating, Reviews Block */}
          <View style={[styles.ratingContainer, { borderColor: colors.border }]}>
            <View style={styles.ratingInfoCol}>
              <Text style={[styles.ratingNumber, { color: colors.text }]}>{ratingVal.toFixed(1)}</Text>
              <View style={styles.starsWrapper}>
                <Text style={styles.starText}>★</Text>
                <Text style={styles.starText}>★</Text>
                <Text style={styles.starText}>★</Text>
                <Text style={styles.starText}>★</Text>
                <Text style={styles.starText}>★</Text>
              </View>
              <Text style={[styles.ratingCountText, { color: colors.subText }]}>({ratingCount} Reviews)</Text>
            </View>
            <View style={[styles.dividerVertical, { backgroundColor: colors.border }]} />
            <View style={styles.ratingInfoCol}>
              <Text style={[styles.ratingNumber, { color: colors.text }]}>100%</Text>
              <Text style={[styles.ratingCountText, { color: colors.subText }]}>Safety Check</Text>
            </View>
          </View>

          {/* Free Trial Banner */}
          {gym.freeTrial && gym.freeTrial.available ? (
            <View style={[styles.freeTrialCard, { backgroundColor: isDarkMode ? '#1E293B' : '#F0FDF4', borderColor: '#22C55E' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, marginRight: 10 }}>🎁</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#22C55E', fontWeight: '900', fontSize: 14 }}>Free Trial Available!</Text>
                  <Text style={[styles.freeTrialDesc, { color: colors.text }]}>
                    {gym.freeTrial.days ? `${gym.freeTrial.days}-Day Pass: ` : ''}
                    {gym.freeTrial.description || 'Get free trial access to explore the gym equipment and group sessions.'}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* About description */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About Gym</Text>
          <Text style={[styles.aboutText, { color: colors.subText }]}>
            {gym.description || 'Welcome to ' + gym.name + '. We offer high-quality cardio machines, strength training equipment, and premium certified trainers to help you achieve your ultimate fitness goals.'}
          </Text>

          {/* Amenities Grid */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>Amenities</Text>
          <View style={styles.amenitiesContainer}>
            {(gym.amenities && gym.amenities.length > 0 ? gym.amenities : ['Cardio Area', 'Weight Section', 'Certified Trainers', 'Changing Rooms', 'Water Dispenser', 'Locker System']).map((amenity, idx) => (
              <View key={idx} style={[styles.amenityPill, { backgroundColor: colors.tagBg, borderColor: colors.border }]}>
                <Text style={[styles.amenityText, { color: colors.text }]}>
                  {getAmenityIcon(amenity)}  {amenity}
                </Text>
              </View>
            ))}
          </View>

          {/* Membership Plans */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 22 }]}>Membership Plans</Text>
          {(gym as any).membershipPlans && (gym as any).membershipPlans.length > 0 ? (
            (gym as any).membershipPlans.map((plan: any, idx: number) => {
              const isPopular = plan.isPopular || idx === 0;
              return (
                <View 
                  key={idx} 
                  style={[
                    styles.planCard, 
                    { 
                      backgroundColor: isDarkMode ? '#1E2433' : '#F8FAFC', 
                      borderColor: isPopular ? colors.accent : colors.border,
                      borderWidth: isPopular ? 1.5 : 1,
                    }
                  ]}
                >
                  {!!isPopular ? (
                    <View style={[styles.popularBadge, { backgroundColor: colors.accent }]}>
                      <Text style={[styles.popularBadgeText, { color: colors.buttonText }]}>POPULAR</Text>
                    </View>
                  ) : null}
                  <View style={styles.planInfo}>
                    <Text style={[styles.planTitle, { color: colors.text }]}>{plan.title}</Text>
                    <Text style={[styles.planDuration, { color: colors.subText }]}>{plan.duration} · Validity: {plan.validity || 'Standard'}</Text>
                  </View>
                  <View style={styles.planPriceCol}>
                    <Text style={[styles.planPrice, { color: colors.accent }]}>₹{plan.price}</Text>
                    {!!plan.saving ? <Text style={styles.planSaving}>Save ₹{plan.saving}</Text> : null}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={[styles.planCard, { backgroundColor: isDarkMode ? '#1E2433' : '#F8FAFC', borderColor: colors.accent, borderWidth: 1.5 }]}>
              <View style={[styles.popularBadge, { backgroundColor: colors.accent }]}>
                <Text style={[styles.popularBadgeText, { color: colors.buttonText }]}>BEST VALUE</Text>
              </View>
              <View style={styles.planInfo}>
                <Text style={[styles.planTitle, { color: colors.text }]}>Monthly Pass</Text>
                <Text style={[styles.planDuration, { color: colors.subText }]}>1 Month · Unlimited Access</Text>
              </View>
              <View style={styles.planPriceCol}>
                <Text style={[styles.planPrice, { color: colors.accent }]}>₹1,999</Text>
              </View>
            </View>
          )}
          {/* Offers List */}
          {gym.offers && gym.offers.length > 0 ? (
            <View style={{ marginTop: 22 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>🏷️ Exclusive Offers</Text>
              {gym.offers.map((offer: any, idx: number) => (
                <View key={idx} style={[styles.offerCard, { backgroundColor: colors.tagBg, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 20, marginRight: 10, marginTop: 2 }}>🏷️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.offerTitle, { color: colors.text }]}>{offer.title}</Text>
                      {offer.description ? <Text style={[styles.offerDesc, { color: colors.subText }]}>{offer.description}</Text> : null}
                      {offer.expiryDate ? <Text style={styles.offerExpiry}>Expires: {offer.expiryDate}</Text> : null}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* Trainers Carousel */}
          {gym.trainers && gym.trainers.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 22 }]}>Our Expert Trainers</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {gym.trainers.map((tr: any, idx: number) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.trainerItem, { backgroundColor: colors.tagBg, borderColor: colors.border }]}
                    onPress={() => setSelectedTrainer(tr)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: tr.photo || 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?q=80&w=150' }} style={styles.trainerPic} />
                    <Text style={[styles.trainerName, { color: colors.text }]} numberOfLines={1}>{tr.name}</Text>
                    <Text style={[styles.trainerSpec, { color: colors.subText }]} numberOfLines={1}>⏳ {tr.experience || '3+ Yrs Exp'}</Text>
                    {tr.trainingType ? (
                      <Text style={[styles.trainerSpec, { color: colors.accent, fontWeight: '800', marginTop: 2 }]} numberOfLines={1}>⚡ {tr.trainingType}</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : null}

          {/* Location & Timings Details Card */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Location & Timing</Text>
          <View style={[styles.contactCard, { backgroundColor: colors.tagBg, borderColor: colors.border }]}>
            <View style={styles.contactRow}>
              <Text style={styles.contactIcon}>🕛</Text>
              <View style={styles.contactTextCol}>
                <Text style={[styles.contactLabel, { color: colors.text }]}>Operating Hours</Text>
                <Text style={[styles.contactValue, { color: colors.subText }]}>Mon - Sat: 6:00 AM - 10:00 PM</Text>
                <Text style={[styles.contactValue, { color: colors.subText }]}>Sunday: 7:00 AM - 12:00 PM</Text>
              </View>
            </View>
            
            <View style={[styles.dividerHorizontal, { backgroundColor: colors.border }]} />
            
            <View style={styles.contactRow}>
              <Text style={styles.contactIcon}>📞</Text>
              <View style={styles.contactTextCol}>
                <Text style={[styles.contactLabel, { color: colors.text }]}>Call & Support</Text>
                <Text style={[styles.contactValue, { color: colors.subText }]}>{gym.phone || '+91 98765 43210'}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Footer */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }, cardShadow]}>
        <View style={styles.footerPriceCol}>
          <Text style={[styles.footerLabel, { color: colors.subText }]}>Starting from</Text>
          <Text style={[styles.footerPrice, { color: colors.text }]}>₹1,999<Text style={{ fontSize: 13, fontWeight: 'normal', color: colors.subText }}> /mo</Text></Text>
        </View>
        <TouchableOpacity style={[styles.footerBtn, { backgroundColor: colors.accent }]} onPress={handleCall} activeOpacity={0.88}>
          <Text style={[styles.footerBtnText, { color: colors.buttonText }]}>📞 Contact Gym</Text>
        </TouchableOpacity>
      </View>

      {/* Trainer Details Full Screen Overlay */}
      {selectedTrainer ? (
        <View style={[styles.fullScreenOverlay, { backgroundColor: colors.bg }]}>
          {/* Giant Trainer Photo (Half Screen Height) */}
          <View style={styles.trainerHeroContainer}>
            <Image 
              source={{ uri: selectedTrainer.photo || 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?q=80&w=400' }} 
              style={styles.trainerHeroImage} 
            />
            <View style={styles.trainerHeroOverlay} />

            {/* Back action button */}
            <TouchableOpacity 
              style={[styles.trainerHeroBackBtn, { backgroundColor: 'rgba(0,0,0,0.5)' }]} 
              onPress={() => setSelectedTrainer(null)}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' }}>←</Text>
            </TouchableOpacity>

            {/* Name and Specialization Overlay on bottom of image */}
            <View style={styles.trainerHeroTitleBlock}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.trainerHeroName} numberOfLines={1}>{selectedTrainer.name}</Text>
                {(() => {
                  const instaUrl = selectedTrainer.instagramLink || selectedTrainer.instagram || selectedTrainer.profileLink;
                  if (!instaUrl) return null;
                  return (
                    <TouchableOpacity 
                      style={styles.headerInstaIconBtn}
                      onPress={() => {
                        Linking.openURL(instaUrl.startsWith('http') ? instaUrl : `https://${instaUrl}`);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 16 }}>📸</Text>
                    </TouchableOpacity>
                  );
                })()}
              </View>
              {selectedTrainer.specialization ? (
                <Text style={[styles.trainerHeroSpec, { color: colors.accent }]}>
                  🏆 {selectedTrainer.specialization}
                </Text>
              ) : null}
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.trainerHeroScrollContent}>
            {/* Badges Row */}
            <View style={styles.fullBadgesRow}>
              {selectedTrainer.experience ? (
                <View style={[styles.fullBadge, { backgroundColor: colors.tagBg }]}>
                  <Text style={[styles.fullBadgeText, { color: colors.text }]}>⏳ Exp: {selectedTrainer.experience}</Text>
                </View>
              ) : null}
              {selectedTrainer.trainingType ? (
                <View style={[styles.fullBadge, { backgroundColor: colors.accentLight }]}>
                  <Text style={[styles.fullBadgeText, { color: colors.accent }]}>⚡ {selectedTrainer.trainingType}</Text>
                </View>
              ) : null}
            </View>

            {/* Biography */}
            {selectedTrainer.bio ? (
              <View style={[styles.fullSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.fullSectionTitle, { color: colors.text }]}>Biography</Text>
                <Text style={[styles.fullSectionContent, { color: colors.subText }]}>{selectedTrainer.bio}</Text>
              </View>
            ) : null}

            {/* Certification */}
            {selectedTrainer.certification ? (
              <View style={[styles.fullSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.fullSectionTitle, { color: colors.text }]}>Certification</Text>
                <Text style={[styles.fullSectionContent, { color: colors.subText }]}>📜 {selectedTrainer.certification}</Text>
              </View>
            ) : null}

            {/* Availability */}
            {selectedTrainer.availability ? (
              <View style={[styles.fullSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.fullSectionTitle, { color: colors.text }]}>Availability & Timings</Text>
                <Text style={[styles.fullSectionContent, { color: colors.subText }]}>🕒 {selectedTrainer.availability}</Text>
              </View>
            ) : null}

            {/* Skills & Tags */}
            {(() => {
              const skillsVal = selectedTrainer.skills;
              let skillsArr: string[] = [];
              if (Array.isArray(skillsVal)) {
                skillsArr = skillsVal;
              } else if (typeof skillsVal === 'string' && skillsVal.trim().length > 0) {
                skillsArr = skillsVal.split(',').map(s => s.trim()).filter(Boolean);
              }
              if (skillsArr.length === 0) return null;
              return (
                <View style={[styles.fullSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.fullSectionTitle, { color: colors.text }]}>Skills & Tags</Text>
                  <View style={styles.fullSkillsContainer}>
                    {skillsArr.map((skill: string, index: number) => (
                      <View key={index} style={[styles.fullSkillPill, { backgroundColor: colors.tagBg }]}>
                        <Text style={[styles.fullSkillText, { color: colors.text }]}>💪 {skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
};

const cardShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 10,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  floatingHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    right: 16,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: -2,
  },
  heroContainer: {
    height: 270,
    width: '100%',
    position: 'relative',
    backgroundColor: '#000000',
  },
  galleryScroll: {
    width: '100%',
    height: '100%',
  },
  heroImage: {
    width: width,
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  activeDot: {
    width: 16,
    height: 6,
    borderRadius: 3,
  },
  detailsBlock: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -24,
    padding: 20,
    paddingTop: 24,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  gymName: {
    fontSize: 24,
    fontWeight: '900',
    flex: 1,
    letterSpacing: -0.5,
  },
  verifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '900',
  },
  gymLocationText: {
    fontSize: 13,
    marginTop: 6,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    marginVertical: 18,
  },
  ratingInfoCol: {
    alignItems: 'center',
    flex: 1,
  },
  ratingNumber: {
    fontSize: 20,
    fontWeight: '900',
  },
  starsWrapper: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  starText: {
    color: '#EAB308',
    fontSize: 10,
    marginHorizontal: 0.5,
  },
  ratingCountText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dividerVertical: {
    width: 1,
    height: 40,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  aboutText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '400',
  },
  planCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: 16,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  popularBadgeText: {
    fontSize: 8,
    fontWeight: '900',
  },
  planInfo: {
    flex: 0.7,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  planDuration: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  planPriceCol: {
    alignItems: 'flex-end',
    flex: 0.3,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '900',
  },
  planSaving: {
    color: '#22C55E',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 10,
  },
  amenityPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  amenityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  trainerItem: {
    width: 140,
    borderRadius: 16,
    padding: 10,
    marginRight: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  trainerPic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  trainerName: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  trainerSpec: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '500',
  },
  contactCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  contactIcon: {
    fontSize: 18,
    marginRight: 12,
    marginTop: 2,
  },
  contactTextCol: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 12,
    marginBottom: 2,
    fontWeight: '500',
  },
  dividerHorizontal: {
    height: 1,
    marginVertical: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 15 : 0,
  },
  footerPriceCol: {
    justifyContent: 'center',
  },
  footerLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  footerPrice: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  footerBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  footerBtnText: {
    fontSize: 14,
    fontWeight: '900',
  },
  freeTrialCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginVertical: 12,
    borderStyle: 'dashed',
  },
  freeTrialDesc: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  offerCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  offerDesc: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  offerExpiry: {
    fontSize: 9,
    color: '#EF4444',
    fontWeight: '700',
    marginTop: 4,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    padding: 20,
  },
  fullScreenOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
  },
  fullHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  fullBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trainerHeroContainer: {
    height: 380,
    width: '100%',
    position: 'relative',
    backgroundColor: '#000000',
  },
  trainerHeroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  trainerHeroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  trainerHeroBackBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  trainerHeroTitleBlock: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    zIndex: 5,
  },
  trainerHeroName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  trainerHeroSpec: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  trainerHeroScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  fullBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  fullBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    marginHorizontal: 6,
  },
  fullBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  fullSection: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  fullSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  fullSectionContent: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  fullSkillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  fullSkillPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  fullSkillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  headerInstaIconBtn: {
    marginLeft: 8,
    backgroundColor: '#E1306C',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GymDetailsScreen;
