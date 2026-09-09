import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import PrimaryButton from '../../components/PrimaryButton';
import StepFlowHeader from '../../components/StepFlowHeader';
import { playTextToSpeech, stopTextToSpeech } from '../../services/audio';
import { useTranslation } from '../../i18n';

export default function ReviewPublish({ route, navigation }) {
  const { imageUri, transcript, productData } = route?.params || {};
  const { t, currentLanguage } = useTranslation();

  // Editable fields — seeded from AI-generated data
  const [editingField, setEditingField] = useState(null); // 'title' | 'description' | 'price' | null
  const [title, setTitle] = useState(
    currentLanguage === 'en'
      ? productData?.titleEnglish || 'Handwoven Banarasi Silk Saree'
      : productData?.titleHindi || 'हाथ से बुनी बनारसी रेशम साड़ी'
  );
  const [description, setDescription] = useState(
    currentLanguage === 'en'
      ? productData?.descriptionEnglish || 'Pure katan silk saree with gold zari motifs.'
      : productData?.descriptionHindi || 'शुद्ध कातून रेशम साड़ी, सोने की ज़री बूटे।'
  );
  const [price, setPrice] = useState(String(productData?.price || 6400));

  const [isPlaying, setIsPlaying] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    return () => {
      stopTextToSpeech();
    };
  }, []);

  const handleToggleAudio = () => {
    if (isPlaying) {
      stopTextToSpeech();
      setIsPlaying(false);
    } else {
      const fullText = `${title}. ${t('smartPricingTitle')}: ${price} rupees. ${description}`;
      playTextToSpeech(fullText, currentLanguage === 'en' ? 'en-US' : 'hi-IN');
      setIsPlaying(true);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    stopTextToSpeech();

    // Simulate publish delay
    await new Promise((res) => setTimeout(res, 1800));

    setPublishing(false);
    navigation.navigate('PublishSuccess', {
      imageUri,
      productData: {
        ...productData,
        title,
        description,
        price: parseInt(price, 10) || 6400,
      },
    });
  };

  const toggleEditField = (field) => {
    if (editingField === field) {
      setEditingField(null);
    } else {
      setEditingField(field);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StepFlowHeader step={3} total={3} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Title */}
        <View style={styles.headerTitleWrap}>
          <Text style={styles.screenHeadingPrimary}>
            {t('reviewPublishTitle')}
          </Text>
          <Text style={styles.screenHeadingSecondary}>
            {t('reviewPublishSubtitle')}
          </Text>
        </View>

        {/* Editable Fields Indicator */}
        <View style={styles.editableNote}>
          <Ionicons name="create-outline" size={16} color={colors.primary.rust} />
          <Text style={styles.editableNoteText}>
            {t('editableFieldsNote')}
          </Text>
        </View>

        {/* 1. Product Image Card (Editable) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>PHOTO</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                Alert.alert(
                  'Edit Photo',
                  'Photo editing will be available in a future update.',
                  [{ text: 'OK' }]
                );
              }}
              style={styles.editPencil}
            >
              <Ionicons name="pencil" size={14} color={colors.primary.rust} />
            </TouchableOpacity>
          </View>
          <View style={styles.imageWrapper}>
            <Image
              source={{
                uri:
                  imageUri ||
                  'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
              }}
              style={styles.productImage}
            />
            <View style={styles.enhancedChip}>
              <Ionicons name="sparkles" size={10} color={colors.surface.white} />
              <Text style={styles.enhancedChipText}>{t('enhancedBadge')}</Text>
            </View>
            {productData?.isGiMatch && (
              <View style={styles.giBadge}>
                <Ionicons name="ribbon" size={10} color={colors.surface.white} />
                <Text style={styles.giBadgeText}>GI</Text>
              </View>
            )}
          </View>
        </View>

        {/* 2. Title Card (Editable) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>{t('generatedTitle').toUpperCase()}</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleEditField('title')}
              style={[styles.editPencil, editingField === 'title' && styles.editPencilActive]}
            >
              <Ionicons
                name={editingField === 'title' ? 'checkmark' : 'pencil'}
                size={14}
                color={editingField === 'title' ? colors.surface.white : colors.primary.rust}
              />
            </TouchableOpacity>
          </View>
          {editingField === 'title' ? (
            <TextInput
              style={styles.editableInput}
              value={title}
              onChangeText={setTitle}
              multiline
              autoFocus
            />
          ) : (
            <Text style={styles.titleDisplay}>{title}</Text>
          )}
        </View>

        {/* 3. Description Card (Editable) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>{t('generatedDescription').toUpperCase()}</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleEditField('description')}
              style={[styles.editPencil, editingField === 'description' && styles.editPencilActive]}
            >
              <Ionicons
                name={editingField === 'description' ? 'checkmark' : 'pencil'}
                size={14}
                color={editingField === 'description' ? colors.surface.white : colors.primary.rust}
              />
            </TouchableOpacity>
          </View>
          {editingField === 'description' ? (
            <TextInput
              style={[styles.editableInput, { minHeight: 80 }]}
              value={description}
              onChangeText={setDescription}
              multiline
              autoFocus
            />
          ) : (
            <Text style={styles.descDisplay}>{description}</Text>
          )}
        </View>

        {/* 4. Price Card (Editable) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>PRICE</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleEditField('price')}
              style={[styles.editPencil, editingField === 'price' && styles.editPencilActive]}
            >
              <Ionicons
                name={editingField === 'price' ? 'checkmark' : 'pencil'}
                size={14}
                color={editingField === 'price' ? colors.surface.white : colors.primary.rust}
              />
            </TouchableOpacity>
          </View>
          {editingField === 'price' ? (
            <View style={styles.priceEditRow}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.priceEditInput}
                value={price}
                onChangeText={(txt) => setPrice(txt.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                autoFocus
              />
            </View>
          ) : (
            <View style={styles.priceDisplayRow}>
              <Text style={styles.priceDisplayCurrency}>₹</Text>
              <Text style={styles.priceDisplayValue}>
                {parseInt(price, 10).toLocaleString('en-IN')}
              </Text>
              {productData?.isGiMatch && (
                <View style={styles.giPriceBadge}>
                  <Text style={styles.giPriceBadgeText}>GI Premium</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Keywords Tag Cloud */}
        {productData?.keywords?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t('keywords').toUpperCase()}</Text>
            <View style={styles.keywordsRow}>
              {productData.keywords.map((tag, idx) => (
                <View key={`kw-${idx}`} style={styles.keywordPill}>
                  <Text style={styles.keywordText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Listen to Full Listing Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleToggleAudio}
          style={[styles.listenBtn, isPlaying && styles.listenBtnPlaying]}
        >
          <Ionicons
            name={isPlaying ? 'stop-circle' : 'volume-high'}
            size={20}
            color={isPlaying ? colors.primary.rust : colors.surface.white}
          />
          <Text style={[styles.listenBtnText, isPlaying && styles.listenBtnTextPlaying]}>
            {t('listenFullListing')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Publish CTA */}
      <View style={styles.bottomBar}>
        <PrimaryButton
          title={t('publishListingBtn')}
          loading={publishing}
          arrow={!publishing}
          onPress={handlePublish}
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
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  headerTitleWrap: {
    marginBottom: 12,
  },
  screenHeadingPrimary: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
  },
  screenHeadingSecondary: {
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
    lineHeight: 18,
  },
  editableNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF8F4',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F8D7C8',
    marginBottom: 14,
  },
  editableNoteText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#8A320A',
  },
  card: {
    backgroundColor: colors.surface.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFEAE2',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editPencil: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF2EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F8D7C8',
  },
  editPencilActive: {
    backgroundColor: colors.status.green,
    borderColor: colors.status.green,
  },
  imageWrapper: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F0EDE8',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  enhancedChip: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: colors.status.green,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  enhancedChipText: {
    color: colors.surface.white,
    fontSize: 10,
    fontWeight: '700',
  },
  giBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: colors.status.gold,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  giBadgeText: {
    color: colors.surface.white,
    fontSize: 10,
    fontWeight: '800',
  },
  editableInput: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy.deep,
    backgroundColor: colors.background.cream,
    borderWidth: 1.5,
    borderColor: colors.primary.rust,
    borderRadius: 10,
    padding: 12,
    minHeight: 44,
  },
  titleDisplay: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy.deep,
    fontFamily: typography.fontFamilies?.body,
    lineHeight: 24,
  },
  descDisplay: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.navy.deep,
    fontWeight: '600',
  },
  priceEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.cream,
    borderWidth: 1.5,
    borderColor: colors.primary.rust,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary.rust,
    marginRight: 4,
  },
  priceEditInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: colors.navy.deep,
    minHeight: 40,
  },
  priceDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  priceDisplayCurrency: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary.rust,
  },
  priceDisplayValue: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.navy.deep,
  },
  giPriceBadge: {
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#F3E1B9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  giPriceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#87600C',
  },
  keywordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  keywordPill: {
    backgroundColor: '#F3EDE2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  keywordText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary.rust,
  },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.navy.deep,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  listenBtnPlaying: {
    backgroundColor: '#FBECE5',
    borderWidth: 1.5,
    borderColor: colors.primary.rust,
  },
  listenBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.surface.white,
  },
  listenBtnTextPlaying: {
    color: colors.primary.rust,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface.white,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE2',
  },
});
