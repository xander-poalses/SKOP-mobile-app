import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/components/skop/Brand';
import { SkopButton } from '@/components/skop/SkopButton';
import { SkopColors, SkopFonts, skopShadow } from '@/constants/skop-theme';
import { type ProductType, useSkopSession } from '@/context/skop-session';

const products: { label: string; value: ProductType }[] = [
  { label: 'CIGARETTES', value: 'cigarettes' },
  { label: 'VAPING', value: 'vaping' },
  { label: 'BOTH', value: 'both' },
];

export default function ProfileMigrationScreen() {
  const { migrateProfile } = useSkopSession();
  const [productType, setProductType] = useState<ProductType>('vaping');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    if (!ageConfirmed) return;
    setSaving(true);
    await migrateProfile(productType, new Date().toISOString());
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.page}>
        <Brand compact />
        <View style={styles.content}>
          <Text style={styles.title}>ONE QUICK UPDATE</Text>
          <Text style={styles.body}>
            Your streak, spending details and SKOP sessions will stay as they are.
          </Text>
          <Text style={styles.label}>WHAT DID YOU QUIT?</Text>
          <View style={styles.productRow}>
            {products.map((product) => (
              <Pressable
                key={product.value}
                onPress={() => setProductType(product.value)}
                style={[
                  styles.productButton,
                  productType === product.value && styles.productButtonSelected,
                ]}>
                <Text adjustsFontSizeToFit numberOfLines={1} style={styles.productText}>
                  {product.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: ageConfirmed }}
            onPress={() => setAgeConfirmed((current) => !current)}
            style={styles.ageRow}>
            <View style={[styles.checkbox, ageConfirmed && styles.checkboxChecked]}>
              {ageConfirmed && <Ionicons name="checkmark" size={18} color={SkopColors.surface} />}
            </View>
            <Text style={styles.ageText}>I confirm that I am 18 or older</Text>
          </Pressable>
        </View>
        <View style={styles.continueButton}>
          <SkopButton
            disabled={!ageConfirmed || saving}
            label={saving ? 'SAVING...' : 'CONTINUE'}
            onPress={finish}
            variant="green"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SkopColors.background },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: 24,
    justifyContent: 'space-between',
    gap: 28,
  },
  content: { gap: 22 },
  title: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 30, textAlign: 'center' },
  body: { color: SkopColors.ink, fontFamily: SkopFonts.body, fontSize: 16, textAlign: 'center' },
  label: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 16 },
  productRow: { flexDirection: 'row', gap: 10 },
  productButton: {
    flex: 1,
    minWidth: 0,
    height: 58,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    ...skopShadow,
  },
  productButtonSelected: { backgroundColor: SkopColors.yellow },
  productText: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 14 },
  ageRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.surface,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 4,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: SkopColors.green },
  ageText: { flex: 1, color: SkopColors.ink, fontFamily: SkopFonts.medium, fontSize: 15 },
  continueButton: { width: '100%', height: 82 },
});
