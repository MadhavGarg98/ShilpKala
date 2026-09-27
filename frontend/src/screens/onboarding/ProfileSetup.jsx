import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../../theme/colors';
import PrimaryButton from '../../components/PrimaryButton';
import BilingualText from '../../components/BilingualText';
import DotStepper from '../../components/DotStepper';
import VoiceInputButton from '../../components/VoiceInputButton';
import { updateProfile } from '../../services/profile';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n';
import { resolveImageSource } from '../../utils/imageUtils';

// Default quick-select hubs when search is empty
const INDIAN_CRAFT_CLUSTERS = [
  "Varanasi, Uttar Pradesh",
  "Jaipur, Rajasthan",
  "Kanchipuram, Tamil Nadu",
  "Moradabad, Uttar Pradesh",
  "Srinagar, Jammu & Kashmir",
  "Bhuj, Gujarat",
  "Channapatna, Karnataka",
  "Pochampally, Telangana",
  "Mysore, Karnataka",
  "Firozabad, Uttar Pradesh",
  "Saharanpur, Uttar Pradesh",
  "Kutch, Gujarat",
  "Kolkata, West Bengal",
  "Bhubaneswar, Odisha",
  "Madurai, Tamil Nadu",
  "Agra, Uttar Pradesh",
  "Surat, Gujarat",
  "Panipat, Haryana",
  "Lucknow, Uttar Pradesh"
];

export default function ProfileSetup({ navigation }) {
  const completeOnboarding = useAppStore(
    (state) => state.completeOnboarding
  );

  const {
    categories: craftTypes,
    selectedCategoryId,
    setSelectedCategory,
    isInferringCategory,
    inferCategoryFromVoice,
  } = useAppStore();

  const { t, currentLanguage } = useTranslation();

  const [name, setName] = useState(t('settings.voiceMockName'));
  const [hasGovtId, setHasGovtId] = useState(true);
  const [loading, setLoading] = useState(false);

  // --- Voice Assistant Modal State ---
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [voiceStep, setVoiceStep] = useState('IDLE'); 
  const [craftAnalysis, setCraftAnalysis] = useState(null);
  const [heritageAnswer, setHeritageAnswer] = useState('');
  const [toolsAnswer, setToolsAnswer] = useState('');

  // --- Location State ---
  const [location, setLocation] = useState(t('home.location'));
  const [isLocationModalVisible, setLocationModalVisible] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [filteredLocations, setFilteredLocations] = useState(INDIAN_CRAFT_CLUSTERS);
  const [isGettingGps, setIsGettingGps] = useState(false);

  const handleVoiceTranscribeName = (transcribedName) => {
    setName(transcribedName || t('settings.voiceMockName'));
  };

const handleVoiceTranscribeCraft = async (transcript) => {
    if (!transcript) return;
    
    // 1. Open the multi-step modal in loading state
    setVoiceModalVisible(true);
    setVoiceStep('ANALYZING');

    try {
      // 2. Map current language code ('hi', 'ta', etc.) to full name for the backend LLM
      const langMap = {
        en: 'English',
        hi: 'Hindi',
        ta: 'Tamil',
        bn: 'Bengali',
        te: 'Telugu',
        mr: 'Marathi',
        gu: 'Gujarati',
        kn: 'Kannada',
        ml: 'Malayalam',
      };
      const targetLanguage = langMap[currentLanguage] || 'Hindi';

      // 3. Call your FastAPI endpoint (adjust IP/port if your backend runs on another address)
      const response = await fetch('http://192.168.31.27:8000/api/categories/parse-craft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcript,
          language_name: targetLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      const data = await response.json();
      
      // 4. Auto-select the corresponding category card in the background grid
      if (data.matched_category_id) {
        setSelectedCategory(data.matched_category_id);
      }
      
      // 5. Populate the modal with the extracted, localized craft details
      setCraftAnalysis({
        transcript: data.transcript,
        craft_name: data.craft_name,
        raw_materials: data.raw_materials,
        core_technique: data.core_technique,
        gi_cluster: data.gi_cluster,
      });
      
      // 6. Transition from loader to confirmation step
      setVoiceStep('CONFIRM_CRAFT');
      
    } catch (err) {
      console.error('Craft intelligence failed:', err);
      setVoiceModalVisible(false);
    }
  };

  // --- Dynamic Location Search & GPS Logic ---
  const handleLocationSearch = async (text) => {
    setLocationQuery(text);
    
    if (text.trim().length < 2) {
      setFilteredLocations(INDIAN_CRAFT_CLUSTERS);
      return;
    } 
    
    try {
      const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=8`);
      
      if (!response.ok) {
        throw new Error(`API rate limit or error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || !data.features) {
        setFilteredLocations([text]);
        return;
      }
      
      const suggestions = data.features
        .filter(f => f.properties.country === "India")
        .map(f => {
          const { city, state, name, district, village } = f.properties;
          const mainName = village || city || name || district;
          return mainName && state ? `${mainName}, ${state}` : null;
        })
        .filter(Boolean);

      const uniqueSuggestions = [...new Set(suggestions)];
      setFilteredLocations(uniqueSuggestions.length === 0 ? [text] : uniqueSuggestions);
      
    } catch (error) {
      setFilteredLocations([text]); 
    }
  };

  const handleVoiceLocation = (transcript) => {
    if (transcript) handleLocationSearch(transcript);
  };

  const selectLocation = (loc) => {
    setLocation(loc);
    setLocationModalVisible(false);
  };

  const useDeviceLocation = async () => {
    setIsGettingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        setIsGettingGps(false);
        return;
      }
      
      const loc = await Location.getCurrentPositionAsync({});
      const geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (geocode.length > 0) {
        const place = geocode[0];
        const formatted = `${place.city || place.subregion || place.district}, ${place.region}`;
        selectLocation(formatted);
      } else {
        alert('Could not resolve address from coordinates.');
      }
    } catch (error) {
      console.error("GPS Error:", error);
      alert('Error fetching location. Make sure GPS is enabled.');
    } finally {
      setIsGettingGps(false);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);

      const selectedCraft = craftTypes.find(
        (c) => c.id === selectedCategoryId
      );

      const craftType = selectedCraft
        ? selectedCraft.labelKey
          ? (
              t(selectedCraft.labelKey) ||
              `${selectedCraft.labelHindi || ''}${
                selectedCraft.labelHindi && selectedCraft.labelEnglish
                  ? ` (${selectedCraft.labelEnglish})`
                  : selectedCraft.labelEnglish || ''
              }`
            )
          : selectedCraft.name
        : t('ps.craftFallback');

      await updateProfile({
        name,
        craftType,
        location,
        artisanIdStatus: hasGovtId ? 'Verified' : 'Pending',
        isProfileComplete: true,
      });

      completeOnboarding();

      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    } catch (err) {
      console.error('Failed to complete profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const buttonTitle = t('ps.completeBtn');
  const nameLabelText = t('ps.artisanNameLabel');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={colors.navy.deep}
          />
        </TouchableOpacity>

        <View style={styles.stepperContainer}>
          <DotStepper totalSteps={3} currentStep={3} />
        </View>

        <View style={styles.headerRightSlot} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headlineContainer}>
          <BilingualText
            txKey="profileTitle"
            size="headline"
          />

          <Text style={styles.helperText}>
            {t('profileSubtitle')}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>
            {nameLabelText}
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder={t('artisanNamePlaceholder')}
              placeholderTextColor={colors.text.muted}
            />

            <VoiceInputButton
              size={42}
              mockText={t('settings.voiceMockName')}
              onTranscribed={handleVoiceTranscribeName}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionLabel}>
              {t('craftTypeLabel')}
            </Text>

            <Text style={styles.singleSelectHint}>
              {t('chooseOne')}
            </Text>
          </View>

          <View style={styles.aiHelperBox}>
            <View style={styles.aiHelperTextContainer}>
              <Text style={styles.aiHelperTitle}>
                {t('ps.aiHelperTitle')}
              </Text>
              <Text style={styles.aiHelperSubtitle}>
                {t('ps.aiHelperSubtitle')}
              </Text>
            </View>

            <View style={styles.micWrapper}>
              <VoiceInputButton
                size={46}
                onTranscribed={handleVoiceTranscribeCraft}
                disabled={isInferringCategory}
              />
            </View>
          </View>

          {isInferringCategory && (
            <View style={styles.inferringState}>
              <ActivityIndicator
                size="small"
                color={colors.primary.rust}
              />

              <Text style={styles.inferringText}>
                Finding your craft...
              </Text>
            </View>
          )}

          <View style={styles.gridContainer}>
            {craftTypes.map((craft) => {
              const isSelected =
                selectedCategoryId === craft.id;

              const isGiCertified =
                craft.giCertified ?? craft.hasGIMatch;

              const imageSource =
                craft.imageUrl || craft.image;

              const craftDisplayName = craft.labelKey
                ? (
                    t(craft.labelKey) ||
                    (
                      currentLanguage === 'en'
                        ? craft.labelEnglish
                        : craft.labelHindi
                    )
                  )
                : craft.name;

              return (
                <TouchableOpacity
                  key={craft.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedCategory(craft.id)}
                  style={[
                    styles.craftCard,
                    isSelected && styles.craftCardSelected,
                  ]}
                >
                  <View style={styles.craftCardHeader}>
                    {isGiCertified ? (
                      <View style={styles.giBadge}>
                        <Text style={styles.giBadgeText}>
                          {t('giCertified')}
                        </Text>
                      </View>
                    ) : (
                      <View style={{ height: 16 }} />
                    )}

                    {isSelected ? (
                      <View style={styles.checkCircle}>
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={colors.surface.white}
                        />
                      </View>
                    ) : (
                      <View style={styles.emptyCircle} />
                    )}
                  </View>

                  {imageSource ? (
                    <Image
                      source={resolveImageSource(imageSource)}
                      style={styles.craftImageThumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.craftImageThumb,
                        styles.placeholderImage,
                      ]}
                    >
                      <Ionicons
                        name="color-palette-outline"
                        size={28}
                        color={colors.primary.rust}
                      />
                    </View>
                  )}

                  <Text
                    style={[
                      styles.craftHindi,
                      isSelected && styles.craftHindiSelected,
                    ]}
                    numberOfLines={2}
                  >
                    {craftDisplayName}
                  </Text>

                  {currentLanguage !== 'en' &&
                    craft.labelEnglish && (
                      <Text
                        style={styles.craftEnglish}
                        numberOfLines={1}
                      >
                        {craft.labelEnglish}
                      </Text>
                    )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. Interactive Workshop Location Preview */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>
            {t('workshopLocation')}
          </Text>

          <TouchableOpacity 
            style={styles.locationBox}
            activeOpacity={0.7}
            onPress={() => setLocationModalVisible(true)}
          >
            <View style={styles.locationIconWrap}>
              <Ionicons
                name="location-sharp"
                size={20}
                color={colors.primary.rust}
              />
            </View>

            <View style={styles.locationTextCol}>
              <Text style={styles.locationPrimary}>
                {location}
              </Text>

              <Text style={styles.locationSecondary}>
                {t('giCluster')}
              </Text>
            </View>

            <View style={styles.changeBtn}>
              <Text style={styles.changeText}>
                {t('change')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.govtIdRow}>
            <View style={styles.govtIdIconWrap}>
              <Ionicons
                name="card-outline"
                size={22}
                color={colors.status.green}
              />
            </View>

            <View style={styles.govtIdTextCol}>
              <Text style={styles.govtIdHindi}>
                {t('govtIdLabel')}
              </Text>

              <Text style={styles.govtIdEnglish}>
                {t('govtIdDesc')}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setHasGovtId(!hasGovtId)}
              style={[
                styles.govtBadge,
                hasGovtId
                  ? styles.govtBadgeActive
                  : styles.govtBadgePending,
              ]}
            >
              <Ionicons
                name={
                  hasGovtId
                    ? 'checkmark-circle'
                    : 'add-circle-outline'
                }
                size={14}
                color={
                  hasGovtId
                    ? colors.status.green
                    : colors.text.muted
                }
              />

              <Text
                style={[
                  styles.govtBadgeText,
                  hasGovtId
                    ? styles.govtTextActive
                    : styles.govtTextPending,
                ]}
              >
                {hasGovtId
                  ? t('verified')
                  : t('add')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <PrimaryButton
          title={buttonTitle}
          arrow={true}
          loading={loading}
          onPress={handleComplete}
        />
      </View>

      {/* --- CRAFT INTELLIGENCE VOICE MODAL --- */}
      <Modal
        visible={voiceModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '75%' }]}>
            
            {/* Header */}
{/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {voiceStep === 'ANALYZING' && t('ps.modalTitleAnalyzing')}
                {voiceStep === 'CONFIRM_CRAFT' && t('ps.modalTitleConfirm')}
                {voiceStep === 'FOLLOW_UP_1' && t('ps.modalTitleHeritage')}
                {voiceStep === 'FOLLOW_UP_2' && t('ps.modalTitleScale')}
                {voiceStep === 'SUMMARY' && t('ps.modalTitleSuccess')}
              </Text>
              <TouchableOpacity onPress={() => {
                setVoiceModalVisible(false);
                setVoiceStep('IDLE');
              }}>
                <Ionicons name="close-circle" size={28} color={colors.text.muted} />
              </TouchableOpacity>
            </View>

            {/* Step 1: Loading */}
            {voiceStep === 'ANALYZING' && (
              <View style={styles.voiceStepContainer}>
                <ActivityIndicator size="large" color={colors.primary.rust} />
                <Text style={styles.analyzingText}>{t('ps.analyzingText')}</Text>
              </View>
            )}

            {/* Step 2: Confirm Craft */}
            {voiceStep === 'CONFIRM_CRAFT' && craftAnalysis && (
              <View style={styles.voiceStepContainer}>
                <View style={styles.transcriptBox}>
                  <Ionicons name="mic-outline" size={16} color={colors.text.muted} />
                  <Text style={styles.transcriptText}>"{craftAnalysis.transcript}"</Text>
                </View>

                <View style={styles.analysisCard}>
                  <Text style={styles.analysisHeading}>{t('ps.detectedHeading')}</Text>
                  <Text style={styles.detectedCraftName}>{craftAnalysis.craft_name}</Text>
                  
                  <View style={styles.chipRow}>
                    {craftAnalysis.raw_materials.map((mat, i) => (
                      <View key={i} style={styles.infoChip}><Text style={styles.infoChipText}>{mat}</Text></View>
                    ))}
                    <View style={[styles.infoChip, styles.giChip]}>
                      <Text style={styles.giChipText}>{craftAnalysis.gi_cluster}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.voiceActionRow}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => setVoiceModalVisible(false)}>
                    <Text style={styles.secondaryBtnText}>{t('ps.retryVoice')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => setVoiceStep('FOLLOW_UP_1')}>
                    <Text style={styles.primaryBtnText}>{t('ps.looksRight')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Step 3: Follow Up 1 (Heritage) */}
            {voiceStep === 'FOLLOW_UP_1' && (
              <View style={styles.voiceStepContainer}>
                <View style={styles.aiQuestionBubble}>
                  <Ionicons name="sparkles" size={18} color={colors.status.gold} />
                  <Text style={styles.aiQuestionText}>{t('ps.q1Heritage')}</Text>
                </View>

                <View style={styles.bigMicContainer}>
                  <VoiceInputButton 
                    size={72} 
                    mockText="Family tradition for 3 generations"
                    onTranscribed={(txt) => {
                      setHeritageAnswer(txt);
                      setVoiceStep('FOLLOW_UP_2');
                    }} 
                  />
                  <Text style={styles.tapToAnswerText}>{t('ps.tapToAnswer')}</Text>
                </View>

                <TouchableOpacity style={styles.skipBtn} onPress={() => setVoiceStep('FOLLOW_UP_2')}>
                  <Text style={styles.skipBtnText}>{t('ps.skipQuestion')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 4: Follow Up 2 (Tools) */}
            {voiceStep === 'FOLLOW_UP_2' && (
              <View style={styles.voiceStepContainer}>
                <View style={styles.aiQuestionBubble}>
                  <Ionicons name="sparkles" size={18} color={colors.status.gold} />
                  <Text style={styles.aiQuestionText}>{t('ps.q2Scale')}</Text>
                </View>

                <View style={styles.bigMicContainer}>
                  <VoiceInputButton 
                    size={72} 
                    mockText="Part of local women's SHG"
                    onTranscribed={(txt) => {
                      setToolsAnswer(txt);
                      setVoiceStep('SUMMARY');
                    }} 
                  />
                  <Text style={styles.tapToAnswerText}>{t('ps.tapToAnswer')}</Text>
                </View>

                <TouchableOpacity style={styles.skipBtn} onPress={() => setVoiceStep('SUMMARY')}>
                  <Text style={styles.skipBtnText}>{t('ps.skipQuestion')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 5: Final Summary */}
            {voiceStep === 'SUMMARY' && (
              <View style={styles.voiceStepContainer}>
                <View style={styles.successCircle}>
                  <Ionicons name="checkmark-sharp" size={32} color={colors.surface.white} />
                </View>
                <Text style={styles.summaryTitle}>{t('ps.summaryTitle')}</Text>
                <Text style={styles.summaryDesc}>{t('ps.summaryDesc')}</Text>
                
                <TouchableOpacity 
                  style={[styles.primaryBtn, { width: '100%', marginTop: 24 }]} 
                  onPress={() => setVoiceModalVisible(false)}
                >
                  <Text style={styles.primaryBtnText}>{t('ps.saveProfile')}</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </Modal>

      {/* --- LOCATION PICKER MODAL --- */}
      <Modal
        visible={isLocationModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Workshop Location</Text>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color={colors.text.muted} />
              </TouchableOpacity>
            </View>

            {/* GPS Button */}
            <TouchableOpacity 
              style={styles.gpsButton} 
              onPress={useDeviceLocation}
              disabled={isGettingGps}
            >
              {isGettingGps ? (
                <ActivityIndicator color={colors.surface.white} />
              ) : (
                <Ionicons name="locate" size={20} color={colors.surface.white} />
              )}
              <Text style={styles.gpsButtonText}>
                {isGettingGps ? "Locating..." : "Use My Current Location"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.orDivider}>- OR -</Text>

            {/* Search Bar with Embedded Voice Mic */}
            <View style={styles.locationSearchRow}>
              <Ionicons name="search" size={20} color={colors.text.muted} style={styles.searchIcon} />
              <TextInput
                style={styles.locationInput}
                placeholder="Type a city (e.g. Jaipur)..."
                placeholderTextColor={colors.text.muted}
                value={locationQuery}
                onChangeText={handleLocationSearch}
              />
              <VoiceInputButton 
                size={34} 
                mockText="Surat, Gujarat"
                onTranscribed={handleVoiceLocation} 
              />
            </View>

            {/* Suggestions List */}
            <FlatList
              data={filteredLocations}
              keyExtractor={(item, index) => index.toString()}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled" 
              keyboardDismissMode="on-drag"
              renderItem={({item}) => (
                <TouchableOpacity 
                  style={styles.suggestionItem}
                  onPress={() => selectLocation(item)}
                >
                  <Ionicons name="location-outline" size={20} color={colors.primary.rust} />
                  <Text style={styles.suggestionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.cream,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.background.cream,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE2',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E3DA',
  },
  stepperContainer: {
    flex: 1,
    maxWidth: 200,
  },
  headerRightSlot: {
    width: 38,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  headlineContainer: {
    marginBottom: 18,
  },
  helperText: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 4,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: colors.surface.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy.deep,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  singleSelectHint: {
    fontSize: 11,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2DBD0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: colors.background.cream,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy.deep,
    minHeight: 44,
  },
  aiHelperBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF4E5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  aiHelperTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  aiHelperTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary.rust,
    marginBottom: 4,
  },
  aiHelperSubtitle: {
    fontSize: 12,
    color: colors.navy.deep,
    lineHeight: 18,
  },
  micWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  inferringState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  inferringText: {
    fontSize: 13,
    color: colors.primary.rust,
    fontWeight: '600',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  craftCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E3DA',
    backgroundColor: colors.background.cream,
  },
  craftCardSelected: {
    borderColor: colors.primary.rust,
    backgroundColor: '#FFF8F4',
  },
  craftCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  craftImageThumb: {
    width: '100%',
    height: 68,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#EAE6DF',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFE0B2',
  },
  giBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  giBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.status.green,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary.rust,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  craftHindi: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  craftHindiSelected: {
    color: colors.primary.rust,
  },
  craftEnglish: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.cream,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  locationIconWrap: {
    marginRight: 10,
  },
  locationTextCol: {
    flex: 1,
  },
  locationPrimary: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  locationSecondary: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  changeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary.rust,
  },
  govtIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  govtIdIconWrap: {
    marginRight: 10,
  },
  govtIdTextCol: {
    flex: 1,
  },
  govtIdHindi: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  govtIdEnglish: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  govtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  govtBadgeActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6D3',
  },
  govtBadgePending: {
    backgroundColor: colors.background.cream,
    borderColor: '#E8E3DA',
  },
  govtBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  govtTextActive: {
    color: colors.status.green,
  },
  govtTextPending: {
    color: colors.text.muted,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface.white,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE2',
  },

  /* --- MODAL STYLES --- */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    height: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  gpsButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary.rust,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  gpsButtonText: {
    color: colors.surface.white,
    fontWeight: '700',
    fontSize: 15,
  },
  orDivider: {
    textAlign: 'center',
    color: colors.text.muted,
    marginVertical: 18,
    fontSize: 12,
    fontWeight: '700',
  },
  locationSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2DBD0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
    backgroundColor: colors.background.cream,
  },
  searchIcon: {
    marginRight: 8,
  },
  locationInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: colors.navy.deep,
    fontWeight: '500',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  suggestionText: {
    fontSize: 15,
    color: colors.navy.deep,
    fontWeight: '500',
  },

  /* --- Voice Modal Styles --- */
  voiceStepContainer: { flex: 1, alignItems: 'center', paddingTop: 20 },
  analyzingText: { marginTop: 16, fontSize: 14, color: colors.text.muted, textAlign: 'center', paddingHorizontal: 20 },
  transcriptBox: { flexDirection: 'row', backgroundColor: '#F8F9FA', padding: 12, borderRadius: 10, width: '100%', marginBottom: 16, alignItems: 'flex-start', gap: 8 },
  transcriptText: { fontSize: 14, fontStyle: 'italic', color: colors.navy.deep, flex: 1, lineHeight: 20 },
  analysisCard: { width: '100%', backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#EFE1CE', borderRadius: 12, padding: 16, marginBottom: 24 },
  analysisHeading: { fontSize: 12, color: colors.text.muted, fontWeight: '700', marginBottom: 4 },
  detectedCraftName: { fontSize: 18, color: colors.primary.rust, fontWeight: '800', marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoChip: { backgroundColor: '#F0EDE8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  infoChipText: { fontSize: 11, color: colors.navy.deep, fontWeight: '600' },
  giChip: { backgroundColor: '#E8F5E9' },
  giChipText: { fontSize: 11, color: colors.status.green, fontWeight: '700' },
  voiceActionRow: { flexDirection: 'row', width: '100%', gap: 12, marginTop: 'auto', marginBottom: 20 },
  secondaryBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary.rust, alignItems: 'center' },
  secondaryBtnText: { color: colors.primary.rust, fontWeight: '700', fontSize: 15 },
  primaryBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary.rust, alignItems: 'center' },
  primaryBtnText: { color: colors.surface.white, fontWeight: '700', fontSize: 15 },
  aiQuestionBubble: { flexDirection: 'row', backgroundColor: '#FFF4E5', padding: 16, borderRadius: 16, borderBottomLeftRadius: 4, width: '100%', gap: 10, marginBottom: 40 },
  aiQuestionText: { flex: 1, fontSize: 16, color: colors.navy.deep, fontWeight: '600', lineHeight: 22 },
  bigMicContainer: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  tapToAnswerText: { marginTop: 16, fontSize: 13, color: colors.text.muted, fontWeight: '600' },
  skipBtn: { padding: 16, marginTop: 'auto', marginBottom: 10 },
  skipBtnText: { color: colors.text.muted, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
  successCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.status.green, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  summaryTitle: { fontSize: 22, fontWeight: '800', color: colors.navy.deep, marginBottom: 8 },
  summaryDesc: { fontSize: 14, color: colors.text.muted, textAlign: 'center', paddingHorizontal: 20 },
});