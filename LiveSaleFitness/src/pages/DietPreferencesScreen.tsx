import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { profileService } from '../services/profile';
import { FoodPreference, DietGoal } from '../types/diet';

interface DietPreferencesScreenProps {
  isDarkMode: boolean;
  onBack: () => void;
}

const DietPreferencesScreen: React.FC<DietPreferencesScreenProps> = ({ isDarkMode, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // States
  const [foodPreference, setFoodPreference] = useState<FoodPreference>('veg');
  const [dietGoal, setDietGoal] = useState<DietGoal>('build_muscle');
  const [allergiesText, setAllergiesText] = useState('');
  const [specialRemark, setSpecialRemark] = useState('');

  const colors = {
    bg: isDarkMode ? '#0D0E12' : '#F8F9FA',
    text: isDarkMode ? '#FFFFFF' : '#1A1D20',
    subText: isDarkMode ? '#94A3B8' : '#6B7280',
    cardBg: isDarkMode ? '#1E2433' : '#FFFFFF',
    border: isDarkMode ? '#2A354D' : '#E5E7EB',
    accent: '#0A8443', // Premium green
    buttonText: '#FFFFFF',
    inputBg: isDarkMode ? '#161A22' : '#F1F5F9',
  };

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        const res = await profileService.getProfile();
        const data = res.data || res;
        if (data) {
          if (data.foodPreference) setFoodPreference(data.foodPreference);
          if (data.dietGoal) setDietGoal(data.dietGoal);
          if (data.allergies) setAllergiesText(data.allergies.join(', '));
          if (data.specialRemark) setSpecialRemark(data.specialRemark);
        }
      } catch (err) {
        console.warn('Failed to load profile for diet preferences:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPreferences();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const parsedAllergies = allergiesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        foodPreference,
        dietGoal,
        allergies: parsedAllergies,
        specialRemark,
      };

      const res = await profileService.updateProfile(payload);
      if (res.success) {
        Alert.alert('Success', 'Diet preferences updated successfully!');
        onBack();
      } else {
        Alert.alert('Error', res.message || 'Failed to update preferences');
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const foodPrefsList: { key: FoodPreference; label: string; icon: string }[] = [
    { key: 'veg', label: 'Vegetarian', icon: '🟢' },
    { key: 'nonveg', label: 'Non-Vegetarian', icon: '🔴' },
    { key: 'eggetarian', label: 'Eggetarian', icon: '🟡' },
    { key: 'vegan', label: 'Vegan', icon: '🌱' },
  ];

  const dietGoalsList: { key: DietGoal; label: string; description: string }[] = [
    { key: 'build_muscle', label: 'Build Muscle', description: 'High protein focus' },
    { key: 'weight_loss', label: 'Weight Loss', description: 'Low calorie focus' },
    { key: 'fat_loss', label: 'Fat Loss', description: 'Low calorie + High protein' },
    { key: 'maintenance', label: 'Maintenance', description: 'Balanced macros' },
  ];

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.subText }]}>Loading preferences...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: colors.text }]}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Diet Preferences</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Food Preference */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Food Preference</Text>
          <View style={styles.gridContainer}>
            {foodPrefsList.map((item) => {
              const isSelected = foodPreference === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.prefCard,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: isSelected ? colors.accent : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => setFoodPreference(item.key)}
                >
                  <Text style={styles.prefIcon}>{item.icon}</Text>
                  <Text style={[styles.prefLabel, { color: colors.text }]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Diet Goal */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Dietary Goal</Text>
          <View style={styles.listContainer}>
            {dietGoalsList.map((item) => {
              const isSelected = dietGoal === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.goalCard,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: isSelected ? colors.accent : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => setDietGoal(item.key)}
                >
                  <View style={styles.goalInfo}>
                    <Text style={[styles.goalLabel, { color: colors.text }]}>{item.label}</Text>
                    <Text style={[styles.goalDesc, { color: colors.subText }]}>{item.description}</Text>
                  </View>
                  {isSelected && <Text style={[styles.checkMark, { color: colors.accent }]}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Allergies */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Allergies</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.subText }]}>
            Enter ingredients you are allergic to (comma-separated, e.g. peanuts, dairy, gluten)
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.inputBg,
              },
            ]}
            placeholder="e.g. peanuts, soy, dairy"
            placeholderTextColor={colors.subText}
            value={allergiesText}
            onChangeText={setAllergiesText}
          />

          {/* Special Remarks */}
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>Special Remarks</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.subText }]}>
            Any special instructions for the store when purchasing diet plans
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.inputBg,
                height: 100,
                textAlignVertical: 'top',
              },
            ]}
            placeholder="e.g. Please deliver fresh, do not add artificial sweeteners..."
            placeholderTextColor={colors.subText}
            multiline={true}
            value={specialRemark}
            onChangeText={setSpecialRemark}
          />

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.accent }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.buttonText} />
            ) : (
              <Text style={[styles.saveButtonText, { color: colors.buttonText }]}>Save Preferences</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  prefCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  prefIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  prefLabel: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  listContainer: {
    gap: 8,
  },
  goalCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalInfo: {
    flex: 1,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  goalDesc: {
    fontSize: 11,
  },
  checkMark: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 4,
  },
  textInput: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 4,
  },
  saveButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DietPreferencesScreen;
