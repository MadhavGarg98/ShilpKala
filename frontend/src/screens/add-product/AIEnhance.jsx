import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  ScrollView,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import PrimaryButton from '../../components/PrimaryButton';
import StepFlowHeader from '../../components/StepFlowHeader';
import {
  enhanceImage,
  applyImagePreset,
  detectObjects,
  describeProductImage,
} from '../../services/ai';
import { useTranslation } from '../../i18n';
import { resolveImageSource } from '../../utils/imageUtils';

export default function AIEnhance({ route, navigation }) {
  const originalImageUri =
    route?.params?.imageUri ||
    require('../../../assets/images/products/banarasi-saree.jpg');

  const [enhancedImageUri, setEnhancedImageUri] = useState(null);
  const [previewMode, setPreviewMode] = useState('enhanced'); // 'original' | 'enhanced'
  const [variants, setVariants] = useState({});
  const [cutoutId, setCutoutId] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState('studio_white');
  const [isSwitchingPreset, setIsSwitchingPreset] = useState(false);

  // Multi-product detection states
  const [isDetectingObjects, setIsDetectingObjects] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [showObjectPicker, setShowObjectPicker] = useState(false);

  // AI Product Description states
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [hasGeneratedDesc, setHasGeneratedDesc] = useState(false);
  const [aiTitle, setAiTitle] = useState('');
  const [aiDescription, setAiDescription] = useState('');
  const [aiKeywords, setAiKeywords] = useState([]);
  const [descError, setDescError] = useState(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [percent, setPercent] = useState(0);
  const [statusKey, setStatusKey] = useState('enhancingImage');
  const [isDone, setIsDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const { t, currentLanguage } = useTranslation();

  // Step 1: Detect objects first. If multiple objects found, show picker. Otherwise enhance directly.
  useEffect(() => {
    let isMounted = true;

    async function initialScan() {
      setErrorMessage(null);
      setIsDone(false);
      setShowObjectPicker(false);
      setIsDetectingObjects(true);
      setPercent(5);
      progressAnim.setValue(0.05);

      try {
        console.log('[AIEnhance] Scanning for distinct products using YOLOv8n...');
        const detectRes = await detectObjects(originalImageUri);

        if (!isMounted) return;

        if (detectRes && detectRes.hasMultiple && detectRes.objects && detectRes.objects.length > 1) {
          console.log(`[AIEnhance] Multiple products detected (${detectRes.count}). Prompting user selection.`);
          setDetectedObjects(detectRes.objects);
          setSelectedObject(detectRes.objects[0]);
          setShowObjectPicker(true);
          setIsDetectingObjects(false);
          return;
        }
      } catch (e) {
        console.warn('[AIEnhance] Object detection non-fatal warning, proceeding with full frame:', e);
      }

      if (isMounted) {
        setIsDetectingObjects(false);
        runEnhancement(null);
      }
    }

    initialScan();

    return () => {
      isMounted = false;
    };
  }, [originalImageUri, retryCount]);

  async function runEnhancement(cropBox = null) {
    setErrorMessage(null);
    setIsDone(false);
    setShowObjectPicker(false);
    setPercent(15);
    progressAnim.setValue(0.15);

    try {
      console.log('[AIEnhance] Starting 1-tap automated e-commerce enhancement. CropBox:', cropBox);
      const result = await enhanceImage(
        originalImageUri,
        (step, pct, key) => {
          setCurrentStep(step);
          setPercent(pct);
          setStatusKey(key);

          Animated.timing(progressAnim, {
            toValue: pct / 100,
            duration: 350,
            useNativeDriver: false,
          }).start();
        },
        cropBox
      );

      if (result?.enhancedUri) {
        setEnhancedImageUri(result.enhancedUri);
        setPreviewMode('enhanced');
      }
      if (result?.variants) {
        setVariants(result.variants);
      }
      if (result?.cutoutId) {
        setCutoutId(result.cutoutId);
      }
      if (result?.activePreset) {
        setSelectedPreset(result.activePreset);
      }
      setIsDone(true);
      setStatusKey('aiEnhanceComplete');
      console.log('[AIEnhance] E-commerce enhancement successfully loaded:', result?.enhancedUri);

      // Auto-trigger AI description generation
      generateDescription(result?.cutoutId);
    } catch (err) {
      console.error('[AIEnhance] Enhancement error:', err);
      setErrorMessage(err?.message || 'Server connection or image enhancement failed');
    }
  }

  const generateDescription = async (activeCutoutId = null) => {
    if (isGeneratingDesc) return;
    setIsGeneratingDesc(true);
    setDescError(null);

    try {
      console.log('[AIEnhance] Generating AI product description from enhanced image...');
      const descResult = await describeProductImage({
        imageUri: originalImageUri,
        cutoutId: activeCutoutId || cutoutId,
        languageCode: currentLanguage === 'hi' ? 'hi-IN' : 'en',
      });

      if (descResult) {
        const title = currentLanguage === 'hi'
          ? (descResult.title || descResult.titleEn || '')
          : (descResult.titleEn || descResult.title || '');
        const body = currentLanguage === 'hi'
          ? (descResult.description || descResult.descriptionEn || descResult.caption || '')
          : (descResult.descriptionEn || descResult.description || descResult.caption || '');

        setAiTitle(title);
        setAiDescription(body);
        setAiKeywords(descResult.keywords || []);
        setHasGeneratedDesc(true);
        console.log('[AIEnhance] AI description generated successfully:', { title, body });
      }
    } catch (err) {
      console.warn('[AIEnhance] Description generation warning:', err);
      setDescError(err.message || 'Could not auto-generate description');
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleSelectPreset = async (presetKey) => {
    if (presetKey === selectedPreset) return;
    setSelectedPreset(presetKey);

    // Fast-path: preset is already rendered in variants
    if (variants && variants[presetKey]) {
      setEnhancedImageUri(variants[presetKey]);
      return;
    }

    // Dynamic-path: fetch from preset API using cached cutout
    if (cutoutId) {
      try {
        setIsSwitchingPreset(true);
        const res = await applyImagePreset(cutoutId, presetKey);
        if (res?.enhancedUri) {
          setEnhancedImageUri(res.enhancedUri);
          setVariants((prev) => ({ ...prev, [presetKey]: res.enhancedUri }));
        }
      } catch (err) {
        console.warn('[AIEnhance] Could not switch preset dynamically:', err);
      } finally {
        setIsSwitchingPreset(false);
      }
    }
  };

  const displayedImageUri =
    isDone && enhancedImageUri && previewMode === 'enhanced'
      ? enhancedImageUri
      : originalImageUri;

  const handleNext = () => {
    navigation.navigate('VoiceDescribe', {
      imageUri: enhancedImageUri || originalImageUri,
      isEnhanced: Boolean(isDone && enhancedImageUri),
      selectedPreset: selectedPreset,
      initialDescription: aiDescription || aiTitle || '',
      descriptionData: {
        title: aiTitle,
        description: aiDescription,
        keywords: aiKeywords,
      },
    });
  };

  const handleRetry = () => {
    setErrorMessage(null);
    setRetryCount((prev) => prev + 1);
  };

  const handleUseOriginal = () => {
    setPreviewMode('original');
    setIsDone(true);
    setErrorMessage(null);
  };

  const steps = [
    { id: 1, key: 'processingStep1', label: t('processingStep1') },
    { id: 2, key: 'processingStep2', label: t('processingStep2') },
    { id: 3, key: 'processingStep3', label: t('processingStep3') },
  ];

  const buttonTitle = t('continueToVoice');

  // Conditionally render Multi-Product Detection Bounding Box Picker
  if (showObjectPicker) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StepFlowHeader
          step={2}
          total={3}
          title={t('selectCraftItem')}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Instruction banner */}
          <View style={styles.pickerBanner}>
            <Ionicons name="scan-outline" size={22} color={colors.primary.rust} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pickerBannerTitle}>
                {t('multipleItemsDetected')}
              </Text>
              <Text style={styles.pickerBannerSub}>
                {t('tapItemToEnhance')}
              </Text>
            </View>
          </View>

          {/* Interactive Photo Frame with Bounding Box Overlays */}
          <View style={styles.pickerImageCard}>
            <Image
              source={resolveImageSource(originalImageUri)}
              style={styles.pickerImage}
              resizeMode="contain"
            />
            {detectedObjects.map((obj) => {
              const isSelected = selectedObject?.id === obj.id;
              return (
                <TouchableOpacity
                  key={obj.id}
                  activeOpacity={0.7}
                  onPress={() => setSelectedObject(obj)}
                  style={[
                    styles.boundingBoxOverlay,
                    {
                      left: `${obj.box_pct.x}%`,
                      top: `${obj.box_pct.y}%`,
                      width: `${obj.box_pct.width}%`,
                      height: `${obj.box_pct.height}%`,
                    },
                    isSelected ? styles.boxSelected : styles.boxUnselected,
                  ]}
                >
                  <View style={[styles.boxBadge, isSelected ? styles.boxBadgeSelected : styles.boxBadgeUnselected]}>
                    <Text style={[styles.boxBadgeText, isSelected && styles.boxBadgeTextSelected]}>
                      {isSelected ? '✓ ' : ''}{obj.label || `Item ${obj.id + 1}`}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Horizontal list of detected items */}
          <Text style={styles.detectedItemsTitle}>
            {t('detectedObjects')}
          </Text>
          <View style={styles.detectedChipsGrid}>
            {detectedObjects.map((obj) => {
              const isSelected = selectedObject?.id === obj.id;
              return (
                <TouchableOpacity
                  key={obj.id}
                  onPress={() => setSelectedObject(obj)}
                  style={[
                    styles.objectSelectorChip,
                    isSelected && styles.objectSelectorChipActive,
                  ]}
                >
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'cube-outline'}
                    size={15}
                    color={isSelected ? colors.surface.white : colors.navy.deep}
                  />
                  <Text
                    style={[
                      styles.objectSelectorText,
                      isSelected && styles.objectSelectorTextActive,
                    ]}
                  >
                    {obj.label || `Item ${obj.id + 1}`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action buttons */}
          <View style={{ marginTop: 20, gap: 12 }}>
            <PrimaryButton
              title={
                selectedObject
                  ? `${t('isolateItem')} '${selectedObject.label}'`
                  : t('isolateItem')
              }
              arrow={true}
              onPress={() => runEnhancement(selectedObject?.box_pixels || null)}
            />

            <TouchableOpacity
              onPress={() => runEnhancement(null)}
              style={styles.enhanceEntireBtn}
            >
              <Text style={styles.enhanceEntireText}>
                {t('enhanceEntirePhoto')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StepFlowHeader
        step={2}
        total={3}
        title={`${t('aiStudioTitle')}`}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Image Preview Card with Badge */}
        <View style={styles.imageCard}>
          <Image
            source={resolveImageSource(displayedImageUri)}
            style={styles.imagePreview}
            resizeMode="contain"
          />
          <View style={styles.badgeWrap}>
            <View
              style={[
                styles.liveTag,
                isDone && previewMode === 'enhanced'
                  ? styles.tagSuccess
                  : (errorMessage ? styles.tagError : (previewMode === 'original' ? styles.tagOriginal : styles.tagProcessing)),
              ]}
            >
              <Ionicons
                name={
                  isDone && previewMode === 'enhanced'
                    ? 'sparkles'
                    : (errorMessage ? 'alert-circle' : (previewMode === 'original' ? 'image' : 'sync'))
                }
                size={13}
                color={colors.surface.white}
              />
              <Text style={styles.liveTagText}>
                {isDone
                  ? (previewMode === 'enhanced' ? '✨ Marketplace Ready' : 'Original Photo')
                  : (errorMessage ? 'Enhancement Failed' : `${percent}%`)}
              </Text>
            </View>
          </View>
        </View>

        {/* Before / After Toggle (Available as soon as enhanced photo is ready) */}
        {isDone && enhancedImageUri && (
          <View style={styles.toggleContainer}>
            <View style={styles.toggleTrack}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  previewMode === 'original' && styles.toggleBtnActive,
                ]}
                onPress={() => setPreviewMode('original')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="image-outline"
                  size={15}
                  color={previewMode === 'original' ? colors.surface.white : colors.navy.deep}
                  style={styles.toggleIcon}
                />
                <Text
                  style={[
                    styles.toggleBtnText,
                    previewMode === 'original' && styles.toggleBtnTextActive,
                  ]}
                >
                  {t('originalBefore')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  previewMode === 'enhanced' && styles.toggleBtnActive,
                ]}
                onPress={() => setPreviewMode('enhanced')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="sparkles"
                  size={15}
                  color={previewMode === 'enhanced' ? colors.surface.white : colors.navy.deep}
                  style={styles.toggleIcon}
                />
                <Text
                  style={[
                    styles.toggleBtnText,
                    previewMode === 'enhanced' && styles.toggleBtnTextActive,
                  ]}
                >
                  {t('enhancedAfter')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Studio Background Presets (Available when viewing Enhanced result) */}
        {isDone && previewMode === 'enhanced' && (
          <View style={styles.presetSection}>
            <View style={styles.presetHeaderRow}>
              <Ionicons name="color-palette-outline" size={15} color={colors.navy.deep} />
              <Text style={styles.presetHeaderTitle}>
                {t('chooseStudioBackdrop')}
              </Text>
              {isSwitchingPreset && <ActivityIndicator size="small" color={colors.primary.rust} />}
            </View>

            <View style={styles.presetsRow}>
              {/* Preset 1: Studio White */}
              <TouchableOpacity
                style={[
                  styles.presetCard,
                  selectedPreset === 'studio_white' && styles.presetCardActive,
                ]}
                onPress={() => handleSelectPreset('studio_white')}
                activeOpacity={0.8}
              >
                <View style={[styles.swatchCircle, styles.swatchStudioWhite]}>
                  {selectedPreset === 'studio_white' && (
                    <Ionicons name="checkmark-sharp" size={13} color="#1E293B" />
                  )}
                </View>
                <Text
                  style={[
                    styles.presetCardLabel,
                    selectedPreset === 'studio_white' && styles.presetCardLabelActive,
                  ]}
                >
                  Studio White
                </Text>
                <Text style={styles.presetCardSub}>Marketplace</Text>
              </TouchableOpacity>

              {/* Preset 2: Warm Neutral */}
              <TouchableOpacity
                style={[
                  styles.presetCard,
                  selectedPreset === 'warm_neutral' && styles.presetCardActive,
                ]}
                onPress={() => handleSelectPreset('warm_neutral')}
                activeOpacity={0.8}
              >
                <View style={[styles.swatchCircle, styles.swatchWarmNeutral]}>
                  {selectedPreset === 'warm_neutral' && (
                    <Ionicons name="checkmark-sharp" size={13} color="#8D5B2C" />
                  )}
                </View>
                <Text
                  style={[
                    styles.presetCardLabel,
                    selectedPreset === 'warm_neutral' && styles.presetCardLabelActive,
                  ]}
                >
                  Warm Neutral
                </Text>
                <Text style={styles.presetCardSub}>Craft & Clay</Text>
              </TouchableOpacity>

              {/* Preset 3: Cool Gray */}
              <TouchableOpacity
                style={[
                  styles.presetCard,
                  selectedPreset === 'cool_gray' && styles.presetCardActive,
                ]}
                onPress={() => handleSelectPreset('cool_gray')}
                activeOpacity={0.8}
              >
                <View style={[styles.swatchCircle, styles.swatchCoolGray]}>
                  {selectedPreset === 'cool_gray' && (
                    <Ionicons name="checkmark-sharp" size={13} color="#334155" />
                  )}
                </View>
                <Text
                  style={[
                    styles.presetCardLabel,
                    selectedPreset === 'cool_gray' && styles.presetCardLabelActive,
                  ]}
                >
                  Cool Gray
                </Text>
                <Text style={styles.presetCardSub}>Metal & Brass</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* AI Product Description Section (Generated from image via BLIP Vision + LLM) */}
        {isDone && previewMode === 'enhanced' && (
          <View style={styles.aiDescSection}>
            <View style={styles.aiDescHeaderRow}>
              <View style={styles.aiDescIconWrap}>
                <Ionicons name="sparkles" size={16} color={colors.primary.rust} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiDescTitle}>
                  {t('aiDescription')}
                </Text>
                <Text style={styles.aiDescSub}>
                  {t('aiDescriptionSub')}
                </Text>
              </View>

              {isGeneratingDesc && (
                <ActivityIndicator size="small" color={colors.primary.rust} />
              )}
            </View>

            {descError && (
              <View style={styles.descErrorRow}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.status.amber} />
                <Text style={styles.descErrorText}>{descError}</Text>
              </View>
            )}

            {!hasGeneratedDesc && !isGeneratingDesc ? (
              <TouchableOpacity
                style={styles.generateDescBtn}
                onPress={() => generateDescription()}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles" size={16} color={colors.surface.white} />
                <Text style={styles.generateDescBtnText}>
                  {t('generateDescription')}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.descFieldsContainer}>
                {/* Editable Title */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>
                      {t('marketplaceTitle')}
                    </Text>
                    <Ionicons name="pencil" size={12} color={colors.text.muted} />
                  </View>
                  <TextInput
                    style={styles.titleInput}
                    value={aiTitle}
                    onChangeText={setAiTitle}
                    placeholder="Enter product title..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Editable Description */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>
                      {t('productStory')}
                    </Text>
                    <Ionicons name="pencil" size={12} color={colors.text.muted} />
                  </View>
                  <TextInput
                    style={styles.descBodyInput}
                    value={aiDescription}
                    onChangeText={setAiDescription}
                    multiline
                    numberOfLines={4}
                    placeholder="Craft description, materials, and heritage..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Tags / Keywords */}
                {aiKeywords && aiKeywords.length > 0 && (
                  <View style={styles.keywordsWrap}>
                    {aiKeywords.map((kw, idx) => (
                      <View key={idx} style={styles.kwBadge}>
                        <Text style={styles.kwBadgeText}>#{kw}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Re-generate action */}
                <TouchableOpacity
                  style={styles.regenLink}
                  onPress={() => generateDescription()}
                  disabled={isGeneratingDesc}
                >
                  <Ionicons name="refresh" size={13} color={colors.primary.rust} />
                  <Text style={styles.regenLinkText}>
                    {t('regenerateDescription')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Error Banner with Retry & Bypass Options */}
        {errorMessage ? (
          <View style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <Ionicons name="warning" size={20} color={colors.status.amber} />
              <Text style={styles.errorTitle}>
                {t('enhancementIssue')}
              </Text>
            </View>
            <Text style={styles.errorDescription}>
              {errorMessage}. {t('enhancementIssueSub')}
            </Text>
            <View style={styles.errorActionsRow}>
              <TouchableOpacity onPress={handleRetry} style={styles.retryBtn}>
                <Ionicons name="reload" size={14} color={colors.surface.white} />
                <Text style={styles.retryBtnText}>{t('retryBtn')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUseOriginal} style={styles.bypassBtn}>
                <Text style={styles.bypassBtnText}>{t('keepOriginalBtn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : !isDone ? (
          /* Progress Bar & Status Text while processing */
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.statusTextPrimary}>{t(statusKey)}</Text>
              <Text style={styles.percentText}>{percent}%</Text>
            </View>

            <View style={styles.progressBarTrack}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        ) : null}

        {/* 3 Sequential Step Chips */}
        <View style={styles.chipsSection}>
          {steps.map((s) => {
            const stepDone = isDone || currentStep > s.id;
            const stepActive = !isDone && !errorMessage && currentStep === s.id;

            return (
              <View
                key={s.id}
                style={[
                  styles.stepChip,
                  stepDone && styles.chipDone,
                  stepActive && styles.chipActive,
                ]}
              >
                <View style={styles.chipIconSlot}>
                  {stepDone ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.status.green}
                    />
                  ) : stepActive ? (
                    <ActivityIndicator size="small" color={colors.primary.rust} />
                  ) : (
                    <View style={styles.pendingDot} />
                  )}
                </View>
                <Text
                  style={[
                    styles.chipText,
                    stepDone && styles.chipTextDone,
                    stepActive && styles.chipTextActive,
                  ]}
                >
                  {s.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Artisan Tip Banner */}
        <View style={styles.tipBanner}>
          <Ionicons name="bulb" size={18} color={colors.status.gold} />
          <Text style={styles.tipBannerText}>{t('tipBanner')}</Text>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <PrimaryButton
          title={buttonTitle}
          arrow={true}
          disabled={!isDone && !errorMessage}
          onPress={handleNext}
        />
        {!isDone && !errorMessage && (
          <TouchableOpacity onPress={handleUseOriginal} style={styles.skipLink}>
            <Text style={styles.skipLinkText}>{t('skipAndUseOriginal')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.cream,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  imageCard: {
    width: '100%',
    height: 320,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#EFEAE2',
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  badgeWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tagProcessing: {
    backgroundColor: colors.navy.deep,
  },
  tagSuccess: {
    backgroundColor: colors.status.green,
  },
  tagOriginal: {
    backgroundColor: '#64748B',
  },
  tagError: {
    backgroundColor: colors.status.amber,
  },
  liveTagText: {
    color: colors.surface.white,
    fontSize: 11,
    fontWeight: '700',
  },
  toggleContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  toggleTrack: {
    flexDirection: 'row',
    backgroundColor: '#EBE6DE',
    borderRadius: 24,
    padding: 4,
    width: '100%',
    maxWidth: 380,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 20,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary.rust,
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleIcon: {
    marginRight: 6,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy.deep,
  },
  toggleBtnTextActive: {
    color: colors.surface.white,
    fontWeight: '700',
  },
  presetSection: {
    backgroundColor: colors.surface.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    marginBottom: 16,
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  presetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  presetHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy.deep,
    flex: 1,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  presetCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: '#F8F6F2',
    borderWidth: 1.5,
    borderColor: '#E7E1D7',
  },
  presetCardActive: {
    borderColor: colors.primary.rust,
    backgroundColor: '#FFF8F4',
    shadowColor: colors.primary.rust,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  swatchCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  swatchStudioWhite: {
    backgroundColor: '#F8FAFC',
  },
  swatchWarmNeutral: {
    backgroundColor: '#F3EDE2',
  },
  swatchCoolGray: {
    backgroundColor: '#E2E8F0',
  },
  presetCardLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.navy.deep,
    textAlign: 'center',
    marginBottom: 2,
  },
  presetCardLabelActive: {
    color: colors.primary.rust,
  },
  presetCardSub: {
    fontSize: 9.5,
    color: colors.text.muted,
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: '#FFF8F4',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#F8D7C8',
    marginBottom: 16,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  errorDescription: {
    fontSize: 12,
    color: colors.text.muted,
    lineHeight: 17,
    marginBottom: 12,
  },
  errorActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary.rust,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: colors.surface.white,
    fontSize: 12,
    fontWeight: '700',
  },
  bypassBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F0EDE8',
  },
  bypassBtnText: {
    color: colors.navy.deep,
    fontSize: 12,
    fontWeight: '600',
  },
  progressSection: {
    backgroundColor: colors.surface.white,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusTextPrimary: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  percentText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary.rust,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F0EDE8',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary.rust,
    borderRadius: 4,
  },
  chipsSection: {
    gap: 10,
    marginBottom: 16,
  },
  stepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  chipActive: {
    borderColor: colors.primary.rust,
    backgroundColor: '#FFF8F4',
  },
  chipDone: {
    borderColor: '#C8E6D3',
    backgroundColor: '#F3FAF5',
  },
  chipIconSlot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pendingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D1D5DB',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.muted,
  },
  chipTextActive: {
    color: colors.primary.rust,
    fontWeight: '700',
  },
  chipTextDone: {
    color: colors.navy.deep,
    fontWeight: '700',
  },
  tipBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFDF9',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFE1CE',
  },
  tipBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#6A5638',
    lineHeight: 17,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface.white,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE2',
  },
  skipLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  skipLinkText: {
    fontSize: 12,
    color: colors.text.muted,
    textDecorationLine: 'underline',
  },
  /* Multi-Product Picker Styles */
  pickerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF8F4',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#F8D7C8',
    marginBottom: 16,
  },
  pickerBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy.deep,
    marginBottom: 2,
  },
  pickerBannerSub: {
    fontSize: 12,
    color: colors.text.muted,
    lineHeight: 16,
  },
  pickerImageCard: {
    width: '100%',
    height: 320,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#EFEAE2',
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  pickerImage: {
    width: '100%',
    height: '100%',
  },
  boundingBoxOverlay: {
    position: 'absolute',
    borderRadius: 8,
  },
  boxSelected: {
    borderWidth: 2.5,
    borderColor: colors.primary.rust,
    backgroundColor: 'rgba(217, 83, 79, 0.22)',
    shadowColor: colors.primary.rust,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  boxUnselected: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  boxBadge: {
    position: 'absolute',
    top: -12,
    left: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  boxBadgeSelected: {
    backgroundColor: colors.primary.rust,
  },
  boxBadgeUnselected: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
  },
  boxBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  boxBadgeTextSelected: {
    color: colors.surface.white,
  },
  detectedItemsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy.deep,
    marginBottom: 8,
  },
  detectedChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  objectSelectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.surface.white,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  objectSelectorChipActive: {
    backgroundColor: colors.primary.rust,
    borderColor: colors.primary.rust,
  },
  objectSelectorText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.navy.deep,
  },
  objectSelectorTextActive: {
    color: colors.surface.white,
    fontWeight: '700',
  },
  enhanceEntireBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F0EDE8',
  },
  enhanceEntireText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy.deep,
  },

  /* AI Product Description Styles */
  aiDescSection: {
    backgroundColor: colors.surface.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEAE2',
    marginBottom: 16,
    shadowColor: colors.navy.deep,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  aiDescHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  aiDescIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF8F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F8D7C8',
  },
  aiDescTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.navy.deep,
  },
  aiDescSub: {
    fontSize: 10.5,
    color: colors.text.muted,
  },
  descErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF8F4',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  descErrorText: {
    fontSize: 11,
    color: colors.status.amber,
  },
  generateDescBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary.rust,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  generateDescBtnText: {
    color: colors.surface.white,
    fontSize: 13,
    fontWeight: '700',
  },
  descFieldsContainer: {
    gap: 12,
  },
  inputGroup: {
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy.deep,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  titleInput: {
    backgroundColor: '#F8F6F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E7E1D7',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy.deep,
  },
  descBodyInput: {
    backgroundColor: '#F8F6F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E7E1D7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12.5,
    color: colors.navy.deep,
    minHeight: 80,
    textAlignVertical: 'top',
    lineHeight: 18,
  },
  keywordsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  kwBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  kwBadgeText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
  },
  regenLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 6,
  },
  regenLinkText: {
    fontSize: 11.5,
    color: colors.primary.rust,
    fontWeight: '600',
  },
});
