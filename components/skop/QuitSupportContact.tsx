import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { SkopColors, SkopFonts } from '@/constants/skop-theme';

export function QuitSupportContact() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.block}>
      {/* this keeps the support details out of the way until they are needed */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={`${isOpen ? 'Hide' : 'Show'} quit support contacts`}
        onPress={() => setIsOpen((current) => !current)}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}>
        <View style={styles.triggerCopy}>
          <Text style={styles.title}>QUIT SUPPORT</Text>
          <Text style={styles.triggerHint}>Contact a quit-support service</Text>
        </View>
        <View style={styles.iconBox}>
          <Ionicons color={SkopColors.ink} name={isOpen ? 'chevron-up' : 'chevron-down'} size={22} />
        </View>
      </Pressable>

      {isOpen ? (
        <View style={styles.content}>
          <Text style={styles.body}>
            If you do not feel ready to speak to a parent or guardian, you can contact a quit-support
            service directly.
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL('tel:0117203145')}
            style={({ pressed }) => [styles.contact, pressed && styles.pressed]}>
            <Ionicons color={SkopColors.ink} name="call-outline" size={21} />
            <View style={styles.contactCopy}>
              <Text style={styles.contactLabel}>NCAS QUIT LINE</Text>
              <Text style={styles.contactValue}>011 720 3145</Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL('mailto:quit@iafrica.com')}
            style={({ pressed }) => [styles.contact, pressed && styles.pressed]}>
            <Ionicons color={SkopColors.ink} name="mail-outline" size={21} />
            <View style={styles.contactCopy}>
              <Text style={styles.contactLabel}>NCAS EMAIL</Text>
              <Text style={styles.contactValue}>quit@iafrica.com</Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL('tel:0800226622')}
            style={({ pressed }) => [styles.contact, pressed && styles.pressed]}>
            <Ionicons color={SkopColors.ink} name="call-outline" size={21} />
            <View style={styles.contactCopy}>
              <Text style={styles.contactLabel}>CANSA TOLL-FREE SUPPORT</Text>
              <Text style={styles.contactValue}>0800 22 6622</Text>
            </View>
          </Pressable>
          <Text style={styles.note}>These services are not emergency lines.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { width: '100%', gap: 12 },
  trigger: {
    minHeight: 72,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.yellow,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    boxShadow: `0px 5px 0px 0px ${SkopColors.shadow}`,
  },
  triggerPressed: { transform: [{ translateY: 3 }], boxShadow: `0px 2px 0px 0px ${SkopColors.shadow}` },
  triggerCopy: { flex: 1, gap: 2 },
  title: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 17 },
  triggerHint: { color: SkopColors.ink, fontFamily: SkopFonts.body, fontSize: 13 },
  iconBox: {
    width: 38,
    height: 38,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 6,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: 10,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.background,
    padding: 14,
  },
  body: { color: SkopColors.ink, fontFamily: SkopFonts.body, fontSize: 14, lineHeight: 20 },
  contact: {
    minHeight: 54,
    borderWidth: 2,
    borderColor: SkopColors.ink,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: SkopColors.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    boxShadow: `0px 4px 0px 0px ${SkopColors.shadow}`,
  },
  pressed: { transform: [{ translateY: 3 }], boxShadow: 'none' },
  contactCopy: { flex: 1 },
  contactLabel: { color: SkopColors.ink, fontFamily: SkopFonts.bold, fontSize: 12 },
  contactValue: { color: SkopColors.ink, fontFamily: SkopFonts.medium, fontSize: 15 },
  note: { color: SkopColors.muted, fontFamily: SkopFonts.body, fontSize: 12 },
});
