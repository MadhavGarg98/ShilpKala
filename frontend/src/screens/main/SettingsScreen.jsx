import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import PrimaryButton from '../../components/PrimaryButton';
import SecondaryButton from '../../components/SecondaryButton';
import VoiceInputButton from '../../components/VoiceInputButton';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation, normalizeLanguageCode } from '../../i18n';
import { resolveImageSource } from '../../utils/imageUtils';

const SUPPORTED_LANGUAGES = [
  { code: 'hi', labelHindi: 'हिन्दी', labelEnglish: 'Hindi' },
  { code: 'en', labelHindi: 'English', labelEnglish: 'English' },
  { code: 'ta', labelHindi: 'தமிழ்', labelEnglish: 'Tamil' },
  { code: 'bn', labelHindi: 'বাংলা', labelEnglish: 'Bengali' },
  { code: 'te', labelHindi: 'తెలుగు', labelEnglish: 'Telugu' },
  { code: 'mr', labelHindi: 'मराठी', labelEnglish: 'Marathi' },
  { code: 'gu', labelHindi: 'ગુજરાતી', labelEnglish: 'Gujarati' },
  { code: 'kn', labelHindi: 'ಕನ್ನಡ', labelEnglish: 'Kannada' },
  { code: 'ml', labelHindi: 'മലയാളം', labelEnglish: 'Malayalam' },
];

export default function SettingsScreen({ navigation }) {
  const artisanProfile = useAppStore((state) => state.artisanProfile);
  const updateArtisanProfile = useAppStore((state) => state.updateArtisanProfile);
  const resetOnboarding = useAppStore((state) => state.resetOnboarding);
  const selectedLanguage = useAppStore((state) => state.selectedLanguage);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const { t, currentLanguage } = useTranslation();

  // Language modal state
  const [langModalVisible, setLangModalVisible] = useState(false);

  // Edit profile modal state
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [name, setName] = useState(artisanProfile?.name || t('defaultArtisanName'));
  const [craftType, setCraftType] = useState(artisanProfile?.craftType || t('defaultCraftType'));
  const [location, setLocation] = useState(artisanProfile?.location || t('defaultArtisanLocation'));

  const handleSelectLanguage = (langCode) => {
    setLanguage(langCode);
    setLangModalVisible(false);
  };

  const handleSaveProfile = () => {
    updateArtisanProfile({
      name,
      craftType,
      location,
    });
    setProfileModalVisible(false);
    Alert.alert(
      t('profileUpdatedTitle'),
      t('profileUpdatedMsg'),
      [{ text: 'OK' }]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t('logOutTitle'),
      t('logOutConfirmMsg'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('logOutBtn'),
          style: 'destructive',
          onPress: () => {
            resetOnboarding();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Onboarding' }],
            });
          },
        },
      ]
    );
  };

  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === normalizeLanguageCode(selectedLanguage)) ||
    SUPPORTED_LANGUAGES[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Simple Header with back chevron + title */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.navy.deep} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('settingsHeader')}
        </Text>
        <View style={styles.headerRightSlot} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Summary */}
        <View style={styles.profileSummaryCard}>
          <Image
            source={resolveImageSource(artisanProfile?.profileImageUrl || artisanProfile?.image)}
            style={styles.avatar}
          />
          <View style={styles.profileMeta}>
            <Text style={styles.artisanName}>
              {currentLanguage === 'en'
                ? (artisanProfile?.nameEnglish || artisanProfile?.name)
                : (artisanProfile?.nameHindi || artisanProfile?.name)}
            </Text>
            <Text style={styles.artisanCraft}>{artisanProfile?.craftType}</Text>
            <Text style={styles.artisanLocation}>📍 {artisanProfile?.location}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setProfileModalVisible(true)}
            style={styles.editBtnMini}
          >
            <Ionicons name="pencil" size={14} color={colors.primary.rust} />
          </TouchableOpacity>
        </View>

        {/* Section 1: Preferences */}
        <Text style={styles.sectionHeader}>
          {t('sectionPreferences')}
        </Text>

        {/* Row: Change Language */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setLangModalVisible(true)}
          style={styles.settingRow}
        >
          <View style={[styles.iconBox, { backgroundColor: '#F0F4FF' }]}>
            <Ionicons name="language" size={20} color={colors.navy.deep} />
          </View>
          <View style={styles.rowTextCol}>
            <Text style={styles.rowTitlePrimary}>
              {t('appLanguageLabel')}
            </Text>
            <Text style={styles.rowTitleSecondary}>
              {currentLanguage === 'en' ? currentLangObj.labelEnglish : `${currentLangObj.labelHindi} (${currentLangObj.labelEnglish})`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
        </TouchableOpacity>

        {/* Section 2: Account & Verification */}
        <Text style={styles.sectionHeader}>
          {t('sectionVerification')}
        </Text>

        {/* Row: Government Artisan ID */}
        <View style={styles.settingRow}>
          <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="shield-checkmark" size={20} color={colors.status.green} />
          </View>
          <View style={styles.rowTextCol}>
            <Text style={styles.rowTitlePrimary}>
              {t('govtArtisanId')}
            </Text>
            <Text style={styles.rowTitleSecondary}>
              Govt of India Ministry of Textiles • Verified #ART-9924
            </Text>
          </View>
          <View style={styles.verifiedTag}>
            <Ionicons name="checkmark-circle" size={12} color={colors.surface.white} />
            <Text style={styles.verifiedTagText}>VERIFIED</Text>
          </View>
        </View>

        {/* Row: Edit Profile Details */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => setProfileModalVisible(true)}
          style={styles.settingRow}
        >
          <View style={[styles.iconBox, { backgroundColor: '#FFF2EB' }]}>
            <Ionicons name="person-circle-outline" size={20} color={colors.primary.rust} />
          </View>
          <View style={styles.rowTextCol}>
            <Text style={styles.rowTitlePrimary}>
              {t('editArtisanProfile')}
            </Text>
            <Text style={styles.rowTitleSecondary}>
              {t('profileSubFields')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
        </TouchableOpacity>

        {/* Section 3: App Info */}
        <Text style={styles.sectionHeader}>
          {t('sectionAbout')}
        </Text>

        <View style={styles.settingRow}>
          <View style={[styles.iconBox, { backgroundColor: '#F5F2EB' }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.navy.deep} />
          </View>
          <View style={styles.rowTextCol}>
            <Text style={styles.rowTitlePrimary}>ShilpKala Version</Text>
            <Text style={styles.rowTitleSecondary}>v1.0.0 (Expo v57 • React Native)</Text>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutWrapper}>
          <SecondaryButton
            title={t('logOutBtn')}
            leadingIcon="log-out-outline"
            onPress={handleLogout}
            style={styles.logoutBtn}
          />
        </View>
      </ScrollView>

      {/* 1. Language Selection Modal */}
      <Modal
        visible={langModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('selectLanguageModal')}
              </Text>
              <TouchableOpacity
                onPress={() => setLangModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color={colors.navy.deep} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected =
                  normalizeLanguageCode(selectedLanguage) === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    activeOpacity={0.7}
                    onPress={() => handleSelectLanguage(lang.code)}
                    style={[
                      styles.langOption,
                      isSelected && styles.langOptionSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.langTextPrimary,
                        isSelected && styles.langTextSelected,
                      ]}
                    >
                      {currentLanguage === 'en' ? lang.labelEnglish : lang.labelHindi}
                    </Text>
                    {currentLanguage !== 'en' && (
                      <Text
                        style={[
                          styles.langTextSecondary,
                          isSelected && styles.langTextSelected,
                        ]}
                      >
                        {lang.labelEnglish}
                      </Text>
                    )}
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={colors.primary.rust}
                        style={{ marginLeft: 'auto' }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 2. Edit Profile Modal */}
      <Modal
        visible={profileModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('editProfileModal')}
              </Text>
              <TouchableOpacity
                onPress={() => setProfileModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color={colors.navy.deep} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              {/* Name */}
              <Text style={styles.inputLabel}>
                {t('artisanNameInputLabel')}
              </Text>
              <View style={styles.inputWithVoice}>
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={setName}
                />
                <VoiceInputButton
                  size={38}
                  mockText={t('voiceNameMockText')}
                  onTranscribed={setName}
                />
              </View>

              {/* Craft Type */}
              <Text style={styles.inputLabel}>
                {t('craftTypeInputLabel')}
              </Text>
              <TextInput
                style={styles.textInput}
                value={craftType}
                onChangeText={setCraftType}
              />

              {/* Location */}
              <Text style={styles.inputLabel}>
                {t('locationInputLabel')}
              </Text>
              <TextInput
                style={styles.textInput}
                value={location}
                onChangeText={setLocation}
              />

              <View style={{ marginTop: 20 }}>
                <PrimaryButton
                  title={t('saveChangesBtn')}
                  onPress={handleSaveProfile}
                />
              </View>
            </ScrollView>
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
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE2',
    backgroundColor: colors.surface.white,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  headerRightSlot: {
    width: 36,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    gap: 12,
    marginBottom: 20,
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EAE6DF',
  },
  profileMeta: {
    flex: 1,
  },
  artisanName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  artisanCraft: {
    fontSize: 12,
    color: colors.primary.rust,
    fontWeight: '600',
    marginTop: 1,
  },
  artisanLocation: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  editBtnMini: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF4EF',
    borderWidth: 1,
    borderColor: '#F8D8C8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text.muted,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextCol: {
    flex: 1,
  },
  rowTitlePrimary: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  rowTitleSecondary: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 2,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.green,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.surface.white,
  },
  logoutWrapper: {
    marginTop: 24,
  },
  logoutBtn: {
    borderColor: '#E53E3E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE2',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy.deep,
  },
  closeBtn: {
    padding: 4,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#FAF8F5',
    gap: 12,
  },
  langOptionSelected: {
    backgroundColor: '#FFF2EB',
    borderWidth: 1,
    borderColor: '#F8D7C8',
  },
  langTextPrimary: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  langTextSecondary: {
    fontSize: 13,
    color: colors.text.muted,
  },
  langTextSelected: {
    color: colors.primary.rust,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy.deep,
    marginTop: 12,
    marginBottom: 6,
  },
  inputWithVoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E2DBD0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.navy.deep,
  },
});
