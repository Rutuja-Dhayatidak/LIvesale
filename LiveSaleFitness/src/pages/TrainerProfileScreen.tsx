import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { trainerService } from '../services/trainer';

const { width } = Dimensions.get('window');

interface TrainerProfileScreenProps {
  isDarkMode: boolean;
  trainerId: string;
  onBack: () => void;
}

const TrainerProfileScreen: React.FC<TrainerProfileScreenProps> = ({ isDarkMode, trainerId, onBack }) => {
  const colors = {
    bg: isDarkMode ? '#0D0E12' : '#F1F2F4',
    card: isDarkMode ? 'rgba(22, 26, 34, 0.75)' : 'rgba(255, 255, 255, 0.8)',
    text: isDarkMode ? '#FFFFFF' : '#111827',
    subText: isDarkMode ? '#94A3B8' : '#6B7280',
    border: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    accent: isDarkMode ? '#FF7A00' : '#EAB308',
    accentLight: isDarkMode ? '#A3E635' : '#FACC15',
    buttonBg: isDarkMode ? '#A3E635' : '#2F3338',
    buttonText: isDarkMode ? '#0D0E12' : '#FFFFFF',
  };

  const [trainer, setTrainer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrainer = async () => {
      try {
        setLoading(true);
        const data = await trainerService.getTrainerById(trainerId);
        // Backend returns { success: true, trainer: {...} }
        const trainerData = data?.trainer || data;
        setTrainer(trainerData);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load trainer profile');
        console.error('Trainer profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrainer();
  }, [trainerId]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accentLight} />
        <Text style={{ color: colors.subText, marginTop: 12 }}>Loading trainer profile...</Text>
      </View>
    );
  }

  if (error || !trainer) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <TouchableOpacity style={styles.backButtonAlt} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>Profile Not Found</Text>
        <Text style={{ color: colors.subText, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 }}>
          {error || 'Unable to load trainer profile.'}
        </Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.accentLight }]}
          onPress={onBack}
        >
          <Text style={[styles.bookBtnText, { color: colors.buttonText }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Derived values from real DB data
  const profileImage = trainer.profilePhoto || trainer.photo || trainer.profileImage;
  const specializations = trainer.specializations || trainer.specialization || [];
  const trainingTypes = trainer.trainingTypes || [];
  const ratingAvg = trainer.rating?.average ?? trainer.rating ?? 0;
  const ratingCount = trainer.rating?.count ?? 0;
  const experienceYears = trainer.experience ? `${trainer.experience} Yrs` : 'N/A';
  const clientCount = trainer.clients || trainer.totalBookings || '0';
  const pricePerSession = trainer.pricePerSession;
  const pricePerMonth = trainer.pricePerMonth;

  // Build packages from real pricing data
  const packages = [];
  if (trainer.trialSession && trainer.trialPrice) {
    packages.push({ id: 'trial', name: 'Trial', desc: '1 Trial Session', price: `₹${trainer.trialPrice}` });
  }
  if (pricePerSession) {
    packages.push({ id: 'session', name: '1 Session', desc: 'Per Session', price: `₹${pricePerSession}` });
  }
  if (pricePerMonth) {
    packages.push({ id: 'month', name: '1 Month', desc: 'Monthly Plan', price: `₹${pricePerMonth}` });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Cover Photo */}
        <View style={styles.coverContainer}>
          <Image
            source={{
              uri: profileImage || 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?q=80&w=600',
            }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          <View style={styles.overlay} />

          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          {/* Status Badge */}
          {trainer.status && (
            <View style={[styles.statusBadge, { backgroundColor: trainer.status === 'active' ? '#22C55E' : '#EAB308' }]}>
              <Text style={styles.statusBadgeText}>{trainer.status.toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Floating Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.trainerName, { color: colors.text }]}>{trainer.name}</Text>
            {ratingAvg > 0 && (
              <View style={[styles.ratingBadge, { backgroundColor: colors.accentLight }]}>
                <Text style={[styles.starIcon, { color: colors.buttonText }]}>★</Text>
                <Text style={[styles.ratingText, { color: colors.buttonText }]}>{ratingAvg.toFixed(1)}</Text>
              </View>
            )}
          </View>

          {/* Specializations */}
          {specializations.length > 0 && (
            <Text style={[styles.trainerType, { color: colors.subText }]}>
              {specializations.join(' · ')}
            </Text>
          )}

          {/* City */}
          {trainer.city && (
            <Text style={[styles.cityText, { color: colors.accent }]}>📍 {trainer.city}</Text>
          )}

          {/* Reviews count */}
          {ratingCount > 0 && (
            <Text style={[styles.reviewText, { color: colors.subText }]}>{ratingCount} Reviews</Text>
          )}

          {/* Languages */}
          {trainer.languages?.length > 0 && (
            <Text style={[styles.langText, { color: colors.subText }]}>
              🗣️ {trainer.languages.join(', ')}
            </Text>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{experienceYears}</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Experience</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: colors.text }]}>{clientCount}</Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Clients</Text>
          </View>
          {pricePerSession && (
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.text }]}>₹{pricePerSession}</Text>
              <Text style={[styles.statLabel, { color: colors.subText }]}>Per Session</Text>
            </View>
          )}
        </View>

        {/* Training Types */}
        {trainingTypes.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Training Types</Text>
            <View style={styles.tagsRow}>
              {trainingTypes.map((type: string, i: number) => (
                <View key={i} style={[styles.tag, { backgroundColor: colors.card, borderColor: colors.accentLight }]}>
                  <Text style={[styles.tagText, { color: colors.text }]}>{type}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Specializations Tags */}
        {specializations.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Specializations</Text>
            <View style={styles.tagsRow}>
              {specializations.map((spec: string, i: number) => (
                <View key={i} style={[styles.tag, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.tagText, { color: colors.subText }]}>{spec}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* About Section */}
        {trainer.bio && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
            <Text style={[styles.aboutText, { color: colors.subText }]}>{trainer.bio}</Text>
          </View>
        )}

        {/* Certifications */}
        {trainer.certifications?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Certifications</Text>
            {trainer.certifications.map((cert: string, i: number) => (
              <View key={i} style={styles.certRow}>
                <Text style={{ color: colors.accentLight, marginRight: 8 }}>✓</Text>
                <Text style={[styles.aboutText, { color: colors.subText }]}>{cert}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Packages Section */}
        {packages.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Packages</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.packagesScroll}>
              {packages.map((pkg) => (
                <View key={pkg.id} style={[styles.packageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.packageName, { color: colors.text }]}>{pkg.name}</Text>
                  <Text style={[styles.packageDesc, { color: colors.subText }]}>{pkg.desc}</Text>
                  <Text style={[styles.packagePrice, { color: colors.accentLight }]}>{pkg.price}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

      </ScrollView>

      {/* Sticky Bottom CTA */}
      <View style={[styles.bottomCTA, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.bookBtn, { backgroundColor: colors.accentLight }]}>
          <Text style={[styles.bookBtnText, { color: colors.buttonText }]}>
            Book a Session{pricePerSession ? `  ·  ₹${pricePerSession}` : ''}
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
  scrollContent: {
    paddingBottom: 100,
  },
  coverContainer: {
    height: 380,
    position: 'relative',
    overflow: 'hidden',
  },
  coverImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 500,
    width: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonAlt: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  statusBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: -50,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  trainerName: {
    fontSize: 22,
    fontWeight: '900',
    flex: 1,
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  starIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '800',
  },
  trainerType: {
    fontSize: 14,
    marginBottom: 4,
  },
  cityText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 12,
    marginBottom: 2,
  },
  langText: {
    fontSize: 12,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 22,
  },
  certRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  packagesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  packageCard: {
    width: 150,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 12,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  packageDesc: {
    fontSize: 12,
    marginBottom: 12,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '900',
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  bottomCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
  },
  bookBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookBtnText: {
    fontSize: 16,
    fontWeight: '800',
  },
});

export default TrainerProfileScreen;
