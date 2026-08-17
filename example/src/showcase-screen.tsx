import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { Marquee } from 'react-native-marquee-animation';

const SHOWCASE_INTERVAL_MS = 1_500;
const HERO_CONTENT_CARD_WIDTH = 280;
const SHOWCASE_INTERACTION = {
  deceleration: 0.9985,
  maxFlingVelocity: 3_200,
  pauseOnPress: true,
  resumeDelay: 0,
} as const;
const MARKET_VALUES = ['+0.82%', '+1.14%', '+0.67%', '+1.32%'] as const;

const ARTWORK_TEXTURE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjYPj/HwADAgH/5ncLrgAAAABJRU5ErkJggg==';

type ShowcaseScreenProps = Readonly<{
  onOpenLab?: () => void;
}>;

type ContentPillProps = Readonly<{
  artwork: 'blue' | 'green' | 'orange' | 'purple';
  eyebrow: string;
  glyph: string;
  meta: string;
  title: string;
  tone?: 'mint' | 'rose';
}>;

const ContentPill = ({
  artwork,
  eyebrow,
  glyph,
  meta,
  title,
  tone = 'mint',
}: ContentPillProps) => (
  <View style={styles.contentPill}>
    <View
      style={[
        styles.artwork,
        artwork === 'blue' ? styles.artworkBlue : null,
        artwork === 'green' ? styles.artworkGreen : null,
        artwork === 'orange' ? styles.artworkOrange : null,
        artwork === 'purple' ? styles.artworkPurple : null,
      ]}
    >
      <Image
        contentFit="cover"
        source={ARTWORK_TEXTURE}
        style={styles.artworkTexture}
      />
      <View style={styles.artworkHighlight} />
      <Text style={styles.artworkGlyph}>{glyph}</Text>
    </View>
    <View style={styles.pillCopy}>
      <Text style={styles.pillEyebrow}>{eyebrow}</Text>
      <Text numberOfLines={1} style={styles.pillTitle}>
        {title}
      </Text>
    </View>
    <View style={tone === 'rose' ? styles.roseBadge : styles.mintBadge}>
      <Text
        style={tone === 'rose' ? styles.roseBadgeText : styles.mintBadgeText}
      >
        {meta}
      </Text>
    </View>
  </View>
);

type CapabilityCardProps = Readonly<{
  children: React.ReactNode;
  caption: string;
  label: string;
}>;

const CapabilityCard = ({ children, caption, label }: CapabilityCardProps) => (
  <View style={styles.capabilityCard}>
    <Text style={styles.label}>{label}</Text>
    {children}
    <Text style={styles.capabilityCaption}>{caption}</Text>
  </View>
);

type MarketPillProps = Readonly<{
  label: string;
  negative?: boolean;
  symbol: string;
  value: string;
}>;

const MarketPill = ({
  label,
  negative = false,
  symbol,
  value,
}: MarketPillProps) => (
  <View style={styles.marketPill}>
    <View style={styles.marketCopy}>
      <Text style={styles.marketSymbol}>{symbol}</Text>
      <Text style={styles.marketLabel}>{label}</Text>
    </View>
    <Text style={negative ? styles.marketNegative : styles.marketPositive}>
      {value}
    </Text>
  </View>
);

export const ShowcaseScreen = ({ onOpenLab }: ShowcaseScreenProps) => {
  const [step, setStep] = useState(0);
  const marketValue = MARKET_VALUES[step] ?? MARKET_VALUES[0];
  const platformEngine =
    Platform.OS === 'ios' ? 'CORE ANIMATION · FABRIC' : 'DISPLAY LIST · FABRIC';
  const heroAccessibilityLabel = useMemo(
    () =>
      `Mixed content showcase. Orbit headphones shipping, Night Drive new release, design week today, and market pulse ${marketValue}.`,
    [marketValue]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((currentStep) => (currentStep + 1) % MARKET_VALUES.length);
    }, SHOWCASE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.screen} testID="showcase-screen">
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          Platform.OS === 'android' ? styles.androidContent : null,
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.mark}>
              <Text style={styles.markText}>M</Text>
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.brand}>MARQUEE</Text>
              <Text style={styles.engine}>{platformEngine}</Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          <Text style={styles.title}>{'Anything,\nin motion.'}</Text>
          <Text style={styles.subtitle}>
            Native looping motion for text, images, badges, and views—with zero
            JavaScript work per frame.
          </Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.cardHeadingRow}>
            <Text style={styles.darkLabel}>LIVE CONTENT STRIP</Text>
            <Text style={styles.darkMeta}>DRAG · FLING · AUTO</Text>
          </View>
          <View style={styles.heroViewport}>
            <Marquee
              accessibilityLabel={heroAccessibilityLabel}
              contentContainerStyle={styles.heroStrip}
              interaction={SHOWCASE_INTERACTION}
              spacing={14}
              speed={25}
              style={styles.heroMarquee}
              testID="showcase-hero-marquee"
            >
              <ContentPill
                artwork="blue"
                eyebrow="PRODUCT"
                glyph="O"
                meta="SHIPPING"
                title="Orbit Headphones"
              />
              <ContentPill
                artwork="orange"
                eyebrow="MUSIC"
                glyph="♪"
                meta="NEW"
                title="Night Drive"
              />
              <ContentPill
                artwork="purple"
                eyebrow="EVENT"
                glyph="D"
                meta="TODAY"
                title="Design Week"
                tone="rose"
              />
              <ContentPill
                artwork="green"
                eyebrow="MARKET PULSE"
                glyph="%"
                meta={marketValue}
                title="S&P 500"
              />
            </Marquee>
          </View>
          <View style={styles.rule} />
          <View style={styles.heroFooter}>
            <Text style={styles.heroFooterText}>ONE REACT TREE</Text>
            <Text style={styles.heroFooterText}>NATIVE GESTURES</Text>
            <Text style={styles.heroFooterText}>ACCESSIBLE</Text>
          </View>
        </View>

        <View style={styles.capabilityGrid}>
          <CapabilityCard
            caption="Direction is a native prop"
            label="BIDIRECTIONAL"
          >
            <Marquee
              accessibilityLabel="Motion can travel in either direction"
              contentContainerStyle={styles.tokenStrip}
              direction="right"
              shortContentMode="repeat"
              spacing={12}
              speed={18}
              style={styles.metricMarquee}
            >
              <View style={styles.directionToken}>
                <Text style={styles.directionTokenText}>RIGHT →</Text>
              </View>
            </Marquee>
          </CapabilityCard>

          <CapabilityCard
            caption="No frame work when it fits"
            label="NATIVE AT REST"
          >
            <Marquee
              accessibilityLabel="Short content remains centered and stationary"
              contentAlignment="center"
              contentContainerStyle={styles.tokenStrip}
              style={styles.metricMarquee}
            >
              <View style={styles.staticToken}>
                <View style={styles.staticDot} />
                <Text style={styles.staticTokenText}>STATIC</Text>
              </View>
            </Marquee>
          </CapabilityCard>
        </View>

        <View style={styles.marketCard}>
          <View style={styles.cardHeadingRow}>
            <Text style={styles.label}>MARKET PULSE</Text>
            <Text style={styles.marketMeta}>FINANCE · SAME GENERIC API</Text>
          </View>
          <Marquee
            accessibilityLabel="Market pulse: S&P 500 up 0.82%, Nasdaq up 1.14%, and EUR USD down 0.24%"
            contentContainerStyle={styles.marketStrip}
            spacing={12}
            speed={20}
            style={styles.marketMarquee}
          >
            <MarketPill label="INDEX" symbol="S&P 500" value="+0.82%" />
            <MarketPill label="TECH" symbol="NASDAQ" value="+1.14%" />
            <MarketPill
              label="FOREX"
              negative
              symbol="EUR / USD"
              value="−0.24%"
            />
          </Marquee>
        </View>

        <View style={styles.localeCard}>
          <View style={styles.localeCopy}>
            <Text style={styles.label}>WORLD READY</Text>
            <Text style={styles.localeTitle}>Every script keeps moving.</Text>
            <Text style={styles.localeCaption}>
              A timeless verse in Kannada script stays in one live tree.
            </Text>
          </View>
          <View style={styles.localeViewport}>
            <Marquee
              accessibilityLabel="Bhagavad Gita verse in Kannada script: You have a right to action, never to its fruits"
              contentContainerStyle={styles.localeStrip}
              direction="right"
              shortContentMode="repeat"
              spacing={18}
              speed={16}
              style={styles.localeMarquee}
            >
              <Text style={styles.localeText}>ಕರ್ಮಣ್ಯೇ ವಾಧಿಕಾರಸ್ತೇ |</Text>
              <Text style={styles.localeText}>ಮಾ ಫಲೇಷು ಕದಾಚನ ||</Text>
              <Text style={styles.localeText}>ಮಾ ಕರ್ಮಫಲ ಹೇತುರ್ಭೂ ||</Text>
              <Text style={styles.localeText}>ಮಾ ತೇ ಸಂಗೋಸ್ತ್ವ ಕರ್ಮಣಿ</Text>
            </Marquee>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>ONE TREE · NATIVE COPIES</Text>
          <Text style={styles.footerVersion}>iOS 17+ · ANDROID 7+</Text>
        </View>

        {onOpenLab ? (
          <Pressable
            accessibilityRole="button"
            onPress={onOpenLab}
            style={({ pressed }) => [
              styles.labButton,
              pressed ? styles.labButtonPressed : null,
            ]}
            testID="open-lab-button"
          >
            <Text style={styles.labButtonText}>Open reliability lab</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  androidContent: {
    paddingTop: (NativeStatusBar.currentHeight ?? 0) + 18,
  },
  artwork: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 42,
  },
  artworkBlue: { backgroundColor: '#177ddc' },
  artworkGlyph: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  artworkGreen: { backgroundColor: '#0f7455' },
  artworkHighlight: {
    backgroundColor: '#ffffff',
    borderCurve: 'continuous',
    borderRadius: 999,
    height: 14,
    opacity: 0.16,
    position: 'absolute',
    right: 4,
    top: 4,
    width: 14,
  },
  artworkOrange: { backgroundColor: '#ff754f' },
  artworkPurple: { backgroundColor: '#7657e8' },
  artworkTexture: {
    height: 42,
    opacity: 0.08,
    position: 'absolute',
    width: 42,
  },
  brand: {
    color: '#eafff3',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  brandCopy: { flex: 1, gap: 2, paddingHorizontal: 11 },
  brandRow: { alignItems: 'center', flexDirection: 'row' },
  capabilityCaption: { color: '#78978a', fontSize: 10, lineHeight: 14 },
  capabilityCard: {
    backgroundColor: '#10271f',
    borderColor: '#1e4134',
    borderCurve: 'continuous',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    gap: 9,
    minWidth: 0,
    padding: 14,
  },
  capabilityGrid: { flexDirection: 'row', gap: 12 },
  cardHeadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  content: { gap: 14, padding: 18, paddingBottom: 32 },
  contentPill: {
    alignItems: 'center',
    backgroundColor: '#10271f',
    borderColor: '#265041',
    borderCurve: 'continuous',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    height: 62,
    paddingHorizontal: 9,
    width: HERO_CONTENT_CARD_WIDTH,
  },
  darkLabel: {
    color: '#4e665c',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  darkMeta: { color: '#7f8d87', fontSize: 9, fontWeight: '800' },
  directionToken: {
    alignItems: 'center',
    backgroundColor: '#78edb3',
    borderCurve: 'continuous',
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  directionTokenText: { color: '#061510', fontSize: 10, fontWeight: '900' },
  engine: { color: '#78988b', fontSize: 9, fontWeight: '800' },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  footerText: { color: '#638176', fontSize: 8, fontWeight: '900' },
  footerVersion: { color: '#49675b', fontSize: 8, fontWeight: '800' },
  header: { gap: 12, paddingHorizontal: 4, paddingVertical: 8 },
  heroCard: {
    backgroundColor: '#f1eee5',
    borderCurve: 'continuous',
    borderRadius: 24,
    gap: 12,
    overflow: 'hidden',
    padding: 18,
  },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  heroFooterText: {
    color: '#65766e',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  heroMarquee: { height: 68 },
  heroStrip: { alignItems: 'center', gap: 14, height: 68 },
  heroViewport: {
    backgroundColor: '#092119',
    borderCurve: 'continuous',
    borderRadius: 17,
    overflow: 'hidden',
  },
  label: {
    color: '#78edb3',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  labButton: {
    alignItems: 'center',
    borderColor: '#28483b',
    borderCurve: 'continuous',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  labButtonPressed: { opacity: 0.7 },
  labButtonText: { color: '#91aa9f', fontSize: 12, fontWeight: '800' },
  liveBadge: {
    alignItems: 'center',
    borderColor: '#28483b',
    borderCurve: 'continuous',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  liveDot: {
    backgroundColor: '#78edb3',
    borderCurve: 'continuous',
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  liveText: { color: '#9bb7ac', fontSize: 9, fontWeight: '900' },
  localeCaption: { color: '#78978a', fontSize: 10, lineHeight: 14 },
  localeCard: {
    backgroundColor: '#0c2019',
    borderColor: '#1e4134',
    borderCurve: 'continuous',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  localeCopy: { gap: 5 },
  localeMarquee: { height: 40 },
  localeStrip: { alignItems: 'center', flexDirection: 'row', gap: 18 },
  localeText: { color: '#f0fff6', fontSize: 19, fontWeight: '700' },
  localeTitle: { color: '#effff6', fontSize: 14, fontWeight: '800' },
  localeViewport: {
    backgroundColor: '#10271f',
    borderCurve: 'continuous',
    borderRadius: 12,
    overflow: 'hidden',
  },
  mark: {
    alignItems: 'center',
    backgroundColor: '#78edb3',
    borderCurve: 'continuous',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  markText: { color: '#061510', fontSize: 21, fontWeight: '900' },
  marketCard: {
    backgroundColor: '#0c2019',
    borderColor: '#1e4134',
    borderCurve: 'continuous',
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    overflow: 'hidden',
    padding: 16,
  },
  marketCopy: { gap: 2 },
  marketLabel: {
    color: '#78978a',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  marketMarquee: { height: 46 },
  marketMeta: { color: '#627e72', fontSize: 8, fontWeight: '800' },
  marketNegative: { color: '#ff8998', fontSize: 13, fontWeight: '900' },
  marketPill: {
    alignItems: 'center',
    backgroundColor: '#10271f',
    borderColor: '#265041',
    borderCurve: 'continuous',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 18,
    height: 44,
    paddingHorizontal: 12,
  },
  marketPositive: { color: '#78edb3', fontSize: 13, fontWeight: '900' },
  marketStrip: { alignItems: 'center', gap: 12, height: 46 },
  marketSymbol: { color: '#effff6', fontSize: 12, fontWeight: '900' },
  metricMarquee: { height: 34 },
  mintBadge: {
    alignItems: 'center',
    backgroundColor: '#c9ffe0',
    borderCurve: 'continuous',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    width: 64,
  },
  mintBadgeText: {
    color: '#0c523c',
    fontSize: 8,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
  },
  pillCopy: { flex: 1, gap: 2, minWidth: 0 },
  pillEyebrow: {
    color: '#78edb3',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  pillTitle: { color: '#f0fff6', fontSize: 13, fontWeight: '800' },
  roseBadge: {
    alignItems: 'center',
    backgroundColor: '#ffe0e6',
    borderCurve: 'continuous',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    width: 64,
  },
  roseBadgeText: {
    color: '#8b3146',
    fontSize: 8,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
  },
  rule: { backgroundColor: '#d8d4ca', height: StyleSheet.hairlineWidth },
  screen: { backgroundColor: '#061510', flex: 1 },
  staticDot: {
    backgroundColor: '#78edb3',
    borderCurve: 'continuous',
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  staticToken: {
    alignItems: 'center',
    borderColor: '#2a5545',
    borderCurve: 'continuous',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    height: 32,
    paddingHorizontal: 10,
  },
  staticTokenText: { color: '#d9eee4', fontSize: 9, fontWeight: '900' },
  subtitle: { color: '#91aa9f', fontSize: 14, lineHeight: 20, maxWidth: 350 },
  title: {
    color: '#f4fff8',
    fontSize: 35,
    fontWeight: '900',
    letterSpacing: -1.4,
    lineHeight: 39,
  },
  tokenStrip: { alignItems: 'center', height: 34 },
});
