import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import PrimaryButton from '../../components/PrimaryButton';
import BilingualText from '../../components/BilingualText';
import DotStepper from '../../components/DotStepper';
import VoiceInputButton from '../../components/VoiceInputButton';
import { getCraftTypes, updateProfile } from '../../services/profile';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../i18n';
import { resolveImageSource } from '../../utils/imageUtils';

export default function ProfileSetup({ navigation }) {
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const currentArtisan = useAppStore((state) => state.artisanProfile);
  const { t, currentLanguage } = useTranslation();

  const [name, setName] = useState(
    currentArtisan?.name && currentArtisan.name !== 'Ram Niwas' && currentArtisan.name !== 'राम निवास'
      ? currentArtisan.name
      : ''
  );
  const [craftTypes, setCraftTypes] = useState([]);
  const [selectedCraftId, setSelectedCraftId] = useState('1');
  const [location, setLocation] = useState(t('defaultArtisanLocation'));
  const [hasGovtId, setHasGovtId] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetchingCrafts, setFetchingCrafts] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const types = await getCraftTypes();
        setCraftTypes(types);
      } catch (err) {
        console.error('Failed to load craft types', err);
      } finally {
        setFetchingCrafts(false);
      }
    }
    loadData();
  }, []);

  const handleVoiceTranscribeName = (transcribedName) => {
    setName(transcribedName || '');
  };

  const handleComplete = async () => {
    setLoading(true);
    const selectedCraft = craftTypes.find((c) => c.id === selectedCraftId);
    const finalName = (name && name.trim().length > 0)
      ? name.trim()
      : (currentArtisan?.name && currentArtisan.name !== 'Ram Niwas' && currentArtisan.name !== 'राम निवास'
          ? currentArtisan.name
          : t('defaultArtisanName'));

    await updateProfile({
      name: finalName,
      craftType: selectedCraft
        ? (t(selectedCraft.labelKey) || `${selectedCraft.labelHindi} (${selectedCraft.labelEnglish})`)
        : t('defaultCraftType'),
      location,
      artisanIdStatus: hasGovtId ? 'Verified' : 'Pending',
      isProfileComplete: true,
    });

    completeOnboarding();
    setLoading(false);

    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  const buttonTitle =
    currentLanguage === 'en'
      ? 'Complete Profile & Enter Storefront'
      : `${t('completeProfileBtn')} / Complete Profile`;

  const nameLabelText =
    currentLanguage === 'en'
      ? 'Artisan Name'
      : `${t('artisanNameLabel')} / Artisan Name`;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header with Stepper */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={colors.navy.deep} />
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
        {/* Title */}
        <View style={styles.headlineContainer}>
          <BilingualText txKey="profileTitle" size="headline" />
          <Text style={styles.helperText}>{t('profileSubtitle')}</Text>
        </View>

        {/* 1. Name Input with Voice */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>{nameLabelText}</Text>
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
              mockText={t('voiceNameMockText')}
              onTranscribed={handleVoiceTranscribeName}
            />
          </View>
        </View>

        {/* 2. Craft Type 2-Column Grid */}
        <View style={styles.sectionCard}>
          <View style={styles.labelRow}>
            <Text style={styles.sectionLabel}>{t('craftTypeLabel')}</Text>
            <Text style={styles.singleSelectHint}>{t('chooseOne')}</Text>
          </View>

          {fetchingCrafts ? (
            <ActivityIndicator color={colors.primary.rust} style={{ padding: 20 }} />
          ) : (
            <View style={styles.gridContainer}>
              {craftTypes.map((craft) => {
                const isSelected = selectedCraftId === craft.id;
                return (
                  <TouchableOpacity
                    key={craft.id}
                    activeOpacity={0.8}
                    onPress={() => setSelectedCraftId(craft.id)}
                    style={[
                      styles.craftCard,
                      isSelected && styles.craftCardSelected,
                    ]}
                  >
                    <View style={styles.craftCardHeader}>
                      {craft.hasGIMatch ? (
                        <View style={styles.giBadge}>
                          <Text style={styles.giBadgeText}>{t('giCertified')}</Text>
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

                    {(craft.imageUrl || craft.image) && (
                      <Image
                        source={resolveImageSource(craft.imageUrl || craft.image)}
                        style={styles.craftImageThumb}
                        resizeMode="cover"
                      />
                    )}

                    <Text
                      style={[
                        styles.craftHindi,
                        isSelected && styles.craftHindiSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {t(craft.labelKey) || (currentLanguage === 'en' ? craft.labelEnglish : craft.labelHindi)}
                    </Text>
                    {currentLanguage !== 'en' && (
                      <Text style={styles.craftEnglish} numberOfLines={1}>
                        {craft.labelEnglish}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* 3. Workshop Location Preview */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>{t('workshopLocation')}</Text>
          <View style={styles.locationBox}>
            <View style={styles.locationIconWrap}>
              <Ionicons
                name="location-sharp"
                size={20}
                color={colors.primary.rust}
              />
            </View>
            <View style={styles.locationTextCol}>
              <Text style={styles.locationPrimary}>{location}</Text>
              <Text style={styles.locationSecondary}>{t('giCluster')}</Text>
            </View>
            <TouchableOpacity style={styles.changeBtn}>
              <Text style={styles.changeText}>{t('change')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Optional Govt ID Row */}
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
              <Text style={styles.govtIdHindi}>{t('govtIdLabel')}</Text>
              <Text style={styles.govtIdEnglish}>{t('govtIdDesc')}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setHasGovtId(!hasGovtId)}
              style={[
                styles.govtBadge,
                hasGovtId ? styles.govtBadgeActive : styles.govtBadgePending,
              ]}
            >
              <Ionicons
                name={hasGovtId ? 'checkmark-circle' : 'add-circle-outline'}
                size={14}
                color={hasGovtId ? colors.status.green : colors.text.muted}
              />
              <Text
                style={[
                  styles.govtBadgeText,
                  hasGovtId ? styles.govtTextActive : styles.govtTextPending,
                ]}
              >
                {hasGovtId ? t('verified') : t('add')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <PrimaryButton
          title={buttonTitle}
          arrow={true}
          loading={loading}
          onPress={handleComplete}
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
});
