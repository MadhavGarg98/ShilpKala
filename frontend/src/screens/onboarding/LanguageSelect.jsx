import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import PrimaryButton from '../../components/PrimaryButton';
import BilingualText from '../../components/BilingualText';
import { useTranslation, normalizeLanguageCode } from '../../i18n';

const LANGUAGES = [
  { id: 'Hindi', code: 'hi', native: 'हिन्दी', english: 'Hindi' },
  { id: 'English', code: 'en', native: 'English', english: 'English' },
  { id: 'Tamil', code: 'ta', native: 'தமிழ்', english: 'Tamil' },
  { id: 'Bengali', code: 'bn', native: 'বাংলা', english: 'Bengali' },
  { id: 'Telugu', code: 'te', native: 'తెలుగు', english: 'Telugu' },
  { id: 'Marathi', code: 'mr', native: 'मराठी', english: 'Marathi' },
  { id: 'Gujarati', code: 'gu', native: 'ગુજરાતી', english: 'Gujarati' },
  { id: 'Kannada', code: 'kn', native: 'ಕನ್ನಡ', english: 'Kannada' },
  { id: 'Malayalam', code: 'ml', native: 'മലയാളം', english: 'Malayalam' },
];

export default function LanguageSelect({ navigation }) {
  const { t, currentLanguage, setLanguage } = useTranslation();

  const handleSelectLanguage = (langId) => {
    setLanguage(langId);
  };

  const handleContinue = () => {
    navigation.navigate('Login');
  };

  const btnTitle =
    currentLanguage === 'en'
      ? 'Continue'
      : `${t('continue')} / Continue`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.brandBadge}>
          <Text style={styles.brandBadgeText}>{t('brandBadge')} • SHILPKALA</Text>
        </View>
        <BilingualText
          txKey="selectLanguageTitle"
          size="headline"
          align="left"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollList}
        showsVerticalScrollIndicator={false}
      >
        {LANGUAGES.map((item) => {
          const isSelected = currentLanguage === item.code;
          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.7}
              onPress={() => handleSelectLanguage(item.id)}
              style={[
                styles.languageCard,
                isSelected && styles.languageCardSelected,
              ]}
            >
              <View style={styles.languageInfo}>
                <View style={styles.langNameRow}>
                  <Text
                    style={[
                      styles.nativeName,
                      isSelected && styles.nativeNameSelected,
                    ]}
                  >
                    {item.native}
                  </Text>
                  <Text style={styles.englishName}>({item.english})</Text>
                </View>
                {item.code === 'hi' && (
                  <Text style={styles.tagText}>{t('recommended')}</Text>
                )}
              </View>

              <View
                style={[
                  styles.radioOuter,
                  isSelected && styles.radioOuterSelected,
                ]}
              >
                {isSelected && (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={colors.surface.white}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Fixed bottom action */}
      <View style={styles.bottomBar}>
        <PrimaryButton
          title={btnTitle}
          arrow={true}
          onPress={handleContinue}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.cream,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE2',
  },
  brandBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3EDE2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  brandBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary.rust,
    letterSpacing: 1,
  },
  scrollList: {
    padding: 16,
    paddingBottom: 24,
    gap: 10,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8E3DA',
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  languageCardSelected: {
    borderColor: colors.primary.rust,
    backgroundColor: '#FFF8F4',
  },
  languageInfo: {
    flex: 1,
  },
  langNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nativeName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  nativeNameSelected: {
    color: colors.primary.rust,
  },
  englishName: {
    fontSize: 14,
    color: colors.text.muted,
  },
  tagText: {
    fontSize: 11,
    color: colors.status.green,
    fontWeight: '600',
    marginTop: 2,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  radioOuterSelected: {
    borderColor: colors.primary.rust,
    backgroundColor: colors.primary.rust,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface.white,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE2',
  },
});
