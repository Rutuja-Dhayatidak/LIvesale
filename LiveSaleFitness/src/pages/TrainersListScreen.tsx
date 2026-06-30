import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { trainerService, Trainer } from '../services/trainer';

interface TrainersListScreenProps {
  isDarkMode: boolean;
  onTrainerSelect: (trainerId: string) => void;
}

const TrainersListScreen: React.FC<TrainersListScreenProps> = ({ isDarkMode, onTrainerSelect }) => {
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
    inputBg: isDarkMode ? '#161A22' : '#FFFFFF',
  };

  const cardShadow = !isDarkMode ? {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  } : {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  };

  const categories = ['All', 'Yoga', 'HIIT', 'Bodybuilding', 'CrossFit', 'Pilates'];

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrainers = async () => {
      try {
        setLoading(true);
        const data = await trainerService.getAllTrainers();
        // Handle common backend response formats (array, {data: []}, {trainers: []})
        const trainerData = Array.isArray(data) ? data : (data.data || data.trainers || []);
        setTrainers(trainerData);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch trainers');
        console.error("Trainer fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrainers();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Find a Trainer</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            placeholder="Search by name or specialty..."
            placeholderTextColor={colors.subText}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
      </View>

      {/* Categories */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map((cat, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.categoryChip,
                { backgroundColor: index === 0 ? colors.accentLight : colors.card, borderColor: colors.border }
              ]}
            >
              <Text style={[
                styles.categoryText,
                { color: index === 0 ? colors.buttonText : colors.text, fontWeight: index === 0 ? '700' : '500' }
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Trainers List Grid */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {loading ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : error ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: 'red' }}>{error}</Text>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {trainers.map((trainer) => (
              <TouchableOpacity
                key={trainer._id}
                style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }, cardShadow]}
                activeOpacity={0.8}
                onPress={() => onTrainerSelect(trainer._id)}
              >
                <View style={styles.gridImageContainer}>
                  <Image 
                    source={{ uri: trainer.photo || trainer.profileImage || 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?q=80&w=400' }} 
                    style={styles.gridImage} 
                    resizeMode="cover"
                  />
                </View>
                <View style={styles.gridInfo}>
                  <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={1}>{trainer.name}</Text>
                  <Text style={[styles.gridType, { color: colors.subText }]} numberOfLines={1}>
                    {(trainer.specializations || trainer.specialization)?.join(', ') || 'Fitness Trainer'}
                  </Text>
                  {trainer.city ? (
                    <Text style={[styles.gridType, { color: colors.subText, fontSize: 10 }]} numberOfLines={1}>
                      📍 {trainer.city}
                    </Text>
                  ) : null}

                  <View style={styles.gridRatingRow}>
                    <Text style={styles.starIcon}>★</Text>
                    <Text style={[styles.gridRating, { color: colors.text }]}>{trainer.rating || '4.5'}</Text>
                  </View>

                  <View style={styles.gridFooter}>
                    <Text style={[styles.gridPrice, { color: colors.text }]}>₹{trainer.pricePerSession || 1000}</Text>
                    <TouchableOpacity style={[styles.gridBookBtn, { backgroundColor: colors.accentLight }]}>
                      <Text style={[styles.gridBookBtnText, { color: colors.buttonText }]}>Book</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {trainers.length === 0 && !loading && (
              <View style={{ width: '100%', padding: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🏋️</Text>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>No Trainers Found</Text>
                <Text style={{ color: colors.subText, fontSize: 13, textAlign: 'center' }}>No active trainers available right now. Check back later!</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  gridImageContainer: {
    width: '100%',
    height: 140,
    overflow: 'hidden',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  gridImage: {
    width: '100%',
    height: 200,
    position: 'absolute',
    top: 0,
  },
  gridInfo: {
    padding: 12,
  },
  gridName: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },
  gridType: {
    fontSize: 11,
    marginBottom: 6,
  },
  gridRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  starIcon: {
    color: '#EAB308',
    fontSize: 12,
    marginRight: 4,
  },
  gridRating: {
    fontSize: 12,
    fontWeight: '800',
  },
  gridFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridPrice: {
    fontSize: 14,
    fontWeight: '900',
  },
  gridBookBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  gridBookBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
});

export default TrainersListScreen;
