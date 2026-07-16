import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getEventPolicy, setEventPolicy, EventPolicy } from '../lib/eventPolicy';
import { listClubs } from '../services/clubsService';
import { Club } from '../types';
import { useAppTheme, LightThemeColors } from '../ThemeContext';
import { showAlert } from "../lib/alert";

interface EventCreationSettingsProps {
  onClose: () => void;
}

export const EventCreationSettings: React.FC<EventCreationSettingsProps> = ({ onClose }) => {
  const themeContext = useAppTheme();
  const colors = themeContext?.colors || LightThemeColors;
  const isDark = themeContext?.isDark || false;
  const [policy, setPolicy] = useState<EventPolicy | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [policyData, clubsData] = await Promise.all([
        getEventPolicy(),
        listClubs()
      ]);
      setPolicy(policyData);
      setClubs(clubsData || []);
    } catch (error) {
      console.error('Error loading settings data:', error);
      showAlert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const savePolicy = async (newPolicy: EventPolicy) => {
    try {
      await setEventPolicy(newPolicy);
      setPolicy(newPolicy);
    } catch (error) {
      console.error('Error saving policy:', error);
      showAlert('Error', 'Failed to save settings');
    }
  };

  const updateGlobalToggle = (enabled: boolean) => {
    if (!policy) return;
    const newPolicy = { ...policy, enabledGlobal: enabled };
    savePolicy(newPolicy);
  };

  const updateClubToggle = (clubId: string, enabled: boolean) => {
    if (!policy) return;
    const newPolicy = {
      ...policy,
      enabledByClub: {
        ...policy.enabledByClub,
        [clubId]: enabled,
      },
    };
    savePolicy(newPolicy);
  };

  const updateModerationMode = (mode: "off" | "clubModerator") => {
    if (!policy) return;
    const newPolicy = { ...policy, moderationMode: mode };
    savePolicy(newPolicy);
  };

  const updateLimit = (key: keyof EventPolicy['limits'], value: number | boolean) => {
    if (!policy) return;
    const newPolicy = {
      ...policy,
      limits: {
        ...policy.limits,
        [key]: value,
      },
    };
    savePolicy(newPolicy);
  };

  const filteredClubs = clubs.filter(club =>
    club.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || !policy) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Event Creation Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.subtitle} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.subtitle }]}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Event Creation Settings</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.subtitle} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Global Toggle */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Global Settings</Text>
          <View style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.toggleInfo}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Enable Event Creation</Text>
              <Text style={[styles.toggleDescription, { color: colors.subtitle }]}>
                Master toggle for all event creation
              </Text>
            </View>
            <Switch
              value={policy.enabledGlobal}
              onValueChange={updateGlobalToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Club-Specific Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Club-Specific Settings</Text>
          
          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Ionicons name="search" size={16} color={colors.subtitle} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search clubs..."
              placeholderTextColor={colors.placeholderText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Club List */}
          <View style={[styles.clubList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {filteredClubs.map((club) => (
              <View key={club.id} style={[styles.clubRow, { borderBottomColor: colors.border }]}>
                <View style={styles.clubInfo}>
                  <Text style={[styles.clubName, { color: colors.text }]}>{club.name}</Text>
                  <Text style={[styles.clubCategory, { color: colors.subtitle }]}>{club.category}</Text>
                </View>
                <Switch
                  value={policy.enabledByClub[club.id] ?? true}
                  onValueChange={(enabled) => updateClubToggle(club.id, enabled)}
                  trackColor={{ false: colors.border, true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            ))}
          </View>
        </View>

        {/* Moderation Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Moderation</Text>
          <View style={[styles.radioGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.radioOption, { borderBottomColor: colors.border }]}
              onPress={() => updateModerationMode('off')}
            >
              <View style={[styles.radioButton, { borderColor: colors.border }]}>
                {policy.moderationMode === 'off' && <View style={[styles.radioSelected, { backgroundColor: colors.primary }]} />}
              </View>
              <Text style={[styles.radioLabel, { color: colors.text }]}>No Moderation</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => updateModerationMode('clubModerator')}
            >
              <View style={[styles.radioButton, { borderColor: colors.border }]}>
                {policy.moderationMode === 'clubModerator' && <View style={[styles.radioSelected, { backgroundColor: colors.primary }]} />}
              </View>
              <Text style={[styles.radioLabel, { color: colors.text }]}>Club Moderator Review</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Limits */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Limits</Text>
          
          <View style={[styles.limitRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.limitLabel, { color: colors.text }]}>Max Events per Club per Day</Text>
            <TextInput
              style={[styles.numberInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              value={policy.limits.maxPerClubPerDay.toString()}
              onChangeText={(text) => updateLimit('maxPerClubPerDay', parseInt(text) || 0)}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.limitRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.limitLabel, { color: colors.text }]}>User Cooldown (minutes)</Text>
            <TextInput
              style={[styles.numberInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              value={policy.limits.userCooldownMinutes.toString()}
              onChangeText={(text) => updateLimit('userCooldownMinutes', parseInt(text) || 0)}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.limitRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.limitLabel, { color: colors.text }]}>Max Title Length</Text>
            <TextInput
              style={[styles.numberInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              value={policy.limits.maxTitleLen.toString()}
              onChangeText={(text) => updateLimit('maxTitleLen', parseInt(text) || 0)}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.limitRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.limitLabel, { color: colors.text }]}>Max Description Length</Text>
            <TextInput
              style={[styles.numberInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              value={policy.limits.maxDescLen.toString()}
              onChangeText={(text) => updateLimit('maxDescLen', parseInt(text) || 0)}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.limitRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.limitLabel, { color: colors.text }]}>Allow Images</Text>
            <Switch
              value={policy.limits.allowImages}
              onValueChange={(value) => updateLimit('allowImages', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {policy.limits.allowImages && (
            <View style={[styles.limitRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.limitLabel, { color: colors.text }]}>Max Image Size (MB)</Text>
              <TextInput
                style={[styles.numberInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                value={policy.limits.maxImageMB.toString()}
                onChangeText={(text) => updateLimit('maxImageMB', parseInt(text) || 0)}
                keyboardType="numeric"
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  clubList: {
    borderRadius: 8,
    borderWidth: 1,
  },
  clubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  clubInfo: {
    flex: 1,
  },
  clubName: {
    fontSize: 14,
    fontWeight: '500',
  },
  clubCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  radioGroup: {
    borderRadius: 8,
    borderWidth: 1,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioLabel: {
    fontSize: 16,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  limitLabel: {
    fontSize: 14,
    flex: 1,
  },
  numberInput: {
    width: 80,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 14,
  },
});
