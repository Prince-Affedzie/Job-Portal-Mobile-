// screens/client/ApplicantProfileScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Dimensions, StatusBar,
  Alert, Modal, Animated, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import moment from 'moment';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTaskerProfile } from '../../api/clientApi';
import { navigate } from '../../services/navigationService';
import ReportForm from '../../component/common/reportForm';

const { width: W, height: H } = Dimensions.get('window');
const BANNER_H   = 260;
const AVATAR_SZ  = 92;
const GRID_GAP   = 10;
const THUMB_W    = (W - 32 - GRID_GAP * 2) / 3;
const THUMB_H    = THUMB_W * 1.15;

// ─── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:          '#F4F6FB',
  surface:     '#FFFFFF',
  card:        '#FEFEFE',
  charcoal:    '#0F1A35',
  inkDark:     '#16213E',
  inkMid:      '#243460',
  navy:        '#1A2F5A',
  sage:        '#0F766E',
  sageLight:   '#E0F5F2',
  amber:       '#D4920A',
  amberBg:     '#FEF6E0',
  coral:       '#DC2626',
  coralBg:     '#FEE2E2',
  mist:        '#7A8BA8',
  hairline:    '#E8ECF4',
  textPri:     '#0D1B35',
  textSec:     '#4A5B7A',
  textMut:     '#8FA0BE',
  white:       '#FFFFFF',
  verified:    '#059669',
  verifiedBg:  '#D1FAE5',
  gold:        '#C9891A',
  goldBg:      '#FDF3E0',
  // file type colours
  ftImage:     '#0F766E',
  ftImageBg:   '#E0F5F2',
  ftVideo:     '#7C3AED',
  ftVideoBg:   '#EDE9FE',
  ftPdf:       '#DC2626',
  ftPdfBg:     '#FEE2E2',
  ftDoc:       '#1D4ED8',
  ftDocBg:     '#DBEAFE',
  ftSheet:     '#15803D',
  ftSheetBg:   '#DCFCE7',
  ftOther:     '#475569',
  ftOtherBg:   '#F1F5F9',
  overlay:     'rgba(13,27,53,0.72)',
};

// ─── File type helpers ─────────────────────────────────────────────────────────
const IMAGE_EXTS  = ['jpg','jpeg','png','gif','bmp','webp','heic'];
const VIDEO_EXTS  = ['mp4','mov','avi','mkv','webm','m4v'];
const DOC_EXTS    = ['doc','docx'];
const SHEET_EXTS  = ['xls','xlsx','csv'];

function getFileType(url = '') {
  const clean = (url.split('?')[0] || '').toLowerCase();
  const ext   = clean.split('.').pop() || '';
  if (IMAGE_EXTS.includes(ext))  return 'image';
  if (VIDEO_EXTS.includes(ext))  return 'video';
  if (ext === 'pdf')             return 'pdf';
  if (DOC_EXTS.includes(ext))    return 'doc';
  if (SHEET_EXTS.includes(ext))  return 'sheet';
  return 'other';
}

function fileTypeConfig(type) {
  const map = {
    image:  { color: C.ftImage,  bg: C.ftImageBg,  icon: 'image-outline',         lib: 'Ionicons',  label: 'IMAGE' },
    video:  { color: C.ftVideo,  bg: C.ftVideoBg,  icon: 'videocam-outline',       lib: 'Ionicons',  label: 'VIDEO' },
    pdf:    { color: C.ftPdf,    bg: C.ftPdfBg,    icon: 'document-text-outline',  lib: 'Ionicons',  label: 'PDF'   },
    doc:    { color: C.ftDoc,    bg: C.ftDocBg,    icon: 'file-word-outline',      lib: 'MCI',       label: 'DOC'   },
    sheet:  { color: C.ftSheet,  bg: C.ftSheetBg,  icon: 'file-excel-outline',     lib: 'MCI',       label: 'SHEET' },
    other:  { color: C.ftOther,  bg: C.ftOtherBg,  icon: 'attach-outline',         lib: 'Ionicons',  label: 'FILE'  },
  };
  return map[type] || map.other;
}

function FileIcon({ url, size = 22 }) {
  const type = getFileType(url);
  const cfg  = fileTypeConfig(type);
  if (cfg.lib === 'MCI') return <MaterialCommunityIcons name={cfg.icon} size={size} color={cfg.color} />;
  return <Ionicons name={cfg.icon} size={size} color={cfg.color} />;
}

function FileTypeBadge({ url, compact = false }) {
  const type = getFileType(url);
  const cfg  = fileTypeConfig(type);
  return (
    <View style={[ftb.wrap, { backgroundColor: cfg.bg }, compact && ftb.compact]}>
      <FileIcon url={url} size={compact ? 11 : 13} />
      {!compact && <Text style={[ftb.label, { color: cfg.color }]}>{cfg.label}</Text>}
    </View>
  );
}
const ftb = StyleSheet.create({
  wrap:    { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:8, paddingVertical:4, borderRadius:8 },
  compact: { paddingHorizontal:5, paddingVertical:3, borderRadius:6, gap:0 },
  label:   { fontSize:10, fontWeight:'800', letterSpacing:0.5 },
});

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name = '') {
  return name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) || '??';
}
const PRICE_LABEL = { fixed:'Fixed', hourly:'/hr', starts_at:'From', negotiable:'Negotiable' };

// ─── Brand palette (deterministic from name) ───────────────────────────────────
const BRAND_PALETTES = [
  { from:'#0F1E3D', to:'#1A3461', accent:'#C9891A' }, // navy + gold
  { from:'#0F766E', to:'#134E4A', accent:'#34D399' }, // teal + mint
  { from:'#1E1B4B', to:'#3730A3', accent:'#818CF8' }, // indigo + lavender
  { from:'#7C2D12', to:'#9A3412', accent:'#FB923C' }, // burnt orange
  { from:'#14532D', to:'#166534', accent:'#4ADE80' }, // forest green
  { from:'#4A044E', to:'#701A75', accent:'#E879F9' }, // plum + pink
  { from:'#0C4A6E', to:'#075985', accent:'#38BDF8' }, // ocean blue
  { from:'#1C1917', to:'#292524', accent:'#D4A76A' }, // charcoal + tan
];
function getBrandPalette(name = '') {
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % BRAND_PALETTES.length;
  return BRAND_PALETTES[idx];
}
function splitBannerName(name = '') {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return [words[0]];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

// ─── Branded fallback banner ────────────────────────────────────────────────────
function ProfileBrandedBanner({ name, services = [], palette }) {
  const lines    = splitBannerName(name);
  const initials = getInitials(name);
  // show up to 3 service names as pills across the banner bottom area
  const topServices = services.slice(0, 3);

  return (
    <LinearGradient
      colors={[palette.from, palette.to]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    >
      {/* Decorative rings */}
      <View style={[pbb.ring, pbb.ring1, { borderColor: palette.accent + '20' }]} />
      <View style={[pbb.ring, pbb.ring2, { borderColor: palette.accent + '12' }]} />
      <View style={[pbb.ring, pbb.ring3, { borderColor: palette.accent + '0A' }]} />

      {/* Workaflow watermark */}
      <View style={pbb.watermark}>
        <Text style={pbb.watermarkText}>Workaflow</Text>
      </View>

      {/* Centred name block */}
      <View style={pbb.centerBlock}>
        {/* Giant translucent initials — purely decorative */}
        <Text style={[pbb.bgInitials, { color: palette.accent + '15' }]}>{initials}</Text>

        <View style={[pbb.rule, { backgroundColor: palette.accent }]} />

        {lines.map((line, i) => (
          <Text key={i} style={[pbb.nameLine, i === 0 && pbb.nameLineFirst]} numberOfLines={1}>
            {line}
          </Text>
        ))}

        <Text style={[pbb.subtitle, { color: palette.accent }]}>Professional Tasker</Text>
      </View>

      {/* Service pills along the bottom */}
      {topServices.length > 0 && (
        <View style={pbb.servicePills}>
          {topServices.map((svc, i) => (
            <View key={i} style={[pbb.servicePill, { borderColor: palette.accent + '50' }]}>
              <Text style={[pbb.servicePillText, { color: palette.accent }]} numberOfLines={1}>
                {svc.name}
              </Text>
            </View>
          ))}
        </View>
      )}
    </LinearGradient>
  );
}

const pbb = StyleSheet.create({
  ring:  { position:'absolute', borderRadius:999, borderWidth:1 },
  ring1: { width:260, height:260, top:-100, right:-80 },
  ring2: { width:180, height:180, top:-60,  right:-40 },
  ring3: { width:300, height:300, bottom:-120, left:-80 },

  watermark: { position:'absolute', top:12, right:14 },
  watermarkText: { fontSize:9, fontWeight:'800', letterSpacing:1.5, color:'rgba(255,255,255,0.22)', textTransform:'uppercase' },

  centerBlock: { flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:24, paddingBottom:32 },
  bgInitials: { position:'absolute', fontSize:130, fontWeight:'900', letterSpacing:-6 },
  rule: { width:32, height:2, borderRadius:1, marginBottom:10, opacity:0.85 },
  nameLine: { fontSize:20, fontWeight:'800', color:'rgba(255,255,255,0.92)', textAlign:'center', lineHeight:24, letterSpacing:-0.3, textShadowColor:'rgba(0,0,0,0.3)', textShadowOffset:{width:0,height:1}, textShadowRadius:6 },
  nameLineFirst: { fontSize:24, fontWeight:'900' },
  subtitle: { fontSize:10, fontWeight:'700', letterSpacing:1.4, textTransform:'uppercase', marginTop:8 },

  servicePills: { position:'absolute', bottom:14, left:14, right:14, flexDirection:'row', flexWrap:'wrap', gap:6 },
  servicePill:  { backgroundColor:'rgba(255,255,255,0.1)', borderWidth:1, paddingHorizontal:10, paddingVertical:4, borderRadius:20 },
  servicePillText: { fontSize:11, fontWeight:'700' },
});

// ─── Animated entrance ─────────────────────────────────────────────────────────
function FadeUp({ delay=0, children, style }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue:1, duration:480, delay, useNativeDriver:true }),
      Animated.spring(ty,  { toValue:0, tension:55, friction:12, delay, useNativeDriver:true }),
    ]).start();
  }, []);
  return <Animated.View style={[style,{opacity:op,transform:[{translateY:ty}]}]}>{children}</Animated.View>;
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function Stars({ rating, size=14, color=C.amber }) {
  const full  = Math.floor(rating);
  const half  = (rating % 1) >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <View style={{flexDirection:'row',alignItems:'center',gap:2}}>
      {[...Array(full)].map((_,i)  => <Ionicons key={`f${i}`} name="star"         size={size} color={color}/>)}
      {half                         &&  <Ionicons              name="star-half"    size={size} color={color}/>}
      {[...Array(empty)].map((_,i) => <Ionicons key={`e${i}`} name="star-outline" size={size} color={color}/>)}
    </View>
  );
}

// ─── Service Card ──────────────────────────────────────────────────────────────
const ACCENT_CYCLE = [C.sage, C.inkMid, C.amber, C.coral, '#7C6FE8', '#3B82C4'];

function ServiceCard({ svc, index }) {
  const sc     = useRef(new Animated.Value(1)).current;
  const accent = ACCENT_CYCLE[index % ACCENT_CYCLE.length];
  const hasPrice = svc.price > 0 && svc.priceType !== 'negotiable';

  return (
    <FadeUp delay={100 + index * 55}>
      <Animated.View style={{transform:[{scale:sc}]}}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={()  => Animated.spring(sc,{toValue:0.97,useNativeDriver:true}).start()}
          onPressOut={()  => Animated.spring(sc,{toValue:1,   useNativeDriver:true}).start()}
          style={[ss.svcCard, {borderLeftColor:accent}]}
        >
          <View style={[ss.svcIconWrap,{backgroundColor:accent+'18'}]}>
            <Ionicons name="construct-outline" size={16} color={accent}/>
          </View>
          <View style={ss.svcBody}>
            <Text style={ss.svcName}>{svc.name}</Text>
            {svc.description ? <Text style={ss.svcDesc} numberOfLines={2}>{svc.description}</Text> : null}
          </View>
          <View style={[ss.svcPricePill, {backgroundColor:accent+'12', borderColor:accent+'35'}]}>
            {hasPrice && <Text style={[ss.svcPriceAmt, {color:accent}]}>GHS {svc.price}</Text>}
            <Text style={[ss.svcPriceType,{color:accent}]}>{PRICE_LABEL[svc.priceType]||svc.priceType}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </FadeUp>
  );
}

// ─── Portfolio Thumbnail ───────────────────────────────────────────────────────
function PortfolioThumb({ item, onPress, index }) {
  const files    = item.files || item.images || [];
  const coverUrl = files[0] || '';
  const type     = getFileType(coverUrl);
  const isImage  = type === 'image';
  const isVideo  = type === 'video';
  const extra    = files.length - 1;
  const cfg      = fileTypeConfig(type);
  const [imgErr, setImgErr] = useState(false);

  return (
    <FadeUp delay={60 + index * 45}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={ss.thumb}>
        {/* Cover */}
        {isImage && coverUrl && !imgErr ? (
          <Image source={{uri:coverUrl}} style={ss.thumbImg} resizeMode="cover" onError={()=>setImgErr(true)}/>
        ) : isVideo && coverUrl ? (
          // Video — show dark placeholder with play icon
          <View style={[ss.thumbPlaceholder, {backgroundColor:'#1A1A2E'}]}>
            <View style={ss.thumbPlayCircle}>
              <Ionicons name="play" size={18} color={C.white}/>
            </View>
          </View>
        ) : (
          // PDF / Doc / Sheet / Other
          <View style={[ss.thumbPlaceholder, {backgroundColor:cfg.bg}]}>
            {cfg.lib === 'MCI'
              ? <MaterialCommunityIcons name={cfg.icon} size={32} color={cfg.color}/>
              : <Ionicons name={cfg.icon} size={32} color={cfg.color}/>
            }
            <Text style={[ss.thumbFileLabel, {color:cfg.color}]}>{cfg.label}</Text>
          </View>
        )}

        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent','rgba(10,14,32,0.82)']}
          style={ss.thumbGrad}
        >
          <View style={ss.thumbFooter}>
            <Text style={ss.thumbTitle} numberOfLines={1}>{item.title || 'Project'}</Text>
            {item.completedAt && (
              <Text style={ss.thumbDate}>{moment(item.completedAt).format('MMM YYYY')}</Text>
            )}
          </View>
        </LinearGradient>

        {/* File count badge */}
        {extra > 0 && (
          <View style={ss.thumbCountBadge}>
            <Ionicons name="copy-outline" size={10} color={C.white}/>
            <Text style={ss.thumbCountText}>{extra+1}</Text>
          </View>
        )}

        {/* File type badge top-left */}
        <View style={ss.thumbTypeBadge}>
          <FileTypeBadge url={coverUrl} compact />
        </View>

        {/* Video play overlay */}
        {isVideo && (
          <View style={ss.thumbVideoOverlay}>
            <Ionicons name="play-circle" size={30} color="rgba(255,255,255,0.9)"/>
          </View>
        )}
      </TouchableOpacity>
    </FadeUp>
  );
}

// ─── Portfolio Detail Modal ────────────────────────────────────────────────────
function PortfolioDetailModal({ item, visible, onClose }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const videoRef = useRef(null);
  const insets   = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) {
      setActiveIdx(0);
      videoRef.current?.pauseAsync?.();
    }
  }, [visible]);

  if (!item) return null;
  const files = item.files || item.images || [];

  const navTo = (dir) => {
    setActiveIdx(i => (i + dir + files.length) % files.length);
    videoRef.current?.pauseAsync?.();
  };

  const activeUrl  = files[activeIdx] || '';
  const activeType = getFileType(activeUrl);
  const activeCfg  = fileTypeConfig(activeType);

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={mv.root}>
        <StatusBar barStyle="light-content" backgroundColor="#000"/>

        {/* Header */}
        <View style={[mv.header, {paddingTop: insets.top + 8}]}>
          <TouchableOpacity onPress={onClose} style={mv.closeBtn}>
            <Ionicons name="close" size={22} color={C.white}/>
          </TouchableOpacity>
          <View style={mv.headerCenter}>
            <Text style={mv.headerTitle} numberOfLines={1}>{item.title || 'Project'}</Text>
            {files.length > 1 && (
              <Text style={mv.headerSub}>{activeIdx+1} of {files.length}</Text>
            )}
          </View>
          <View style={{width:40}}/>
        </View>

        {/* Active media display */}
        <View style={mv.mediaWrap}>
          {activeType === 'image' ? (
            <Image source={{uri:activeUrl}} style={mv.mediaImage} resizeMode="contain"/>
          ) : activeType === 'video' ? (
            <Video
              ref={videoRef}
              source={{uri:activeUrl}}
              style={mv.mediaImage}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={false}
            />
          ) : (
            // Non-previewable file — show rich placeholder
            <View style={mv.filePlaceholder}>
              <View style={[mv.filePlaceholderIcon, {backgroundColor:activeCfg.bg}]}>
                {activeCfg.lib === 'MCI'
                  ? <MaterialCommunityIcons name={activeCfg.icon} size={52} color={activeCfg.color}/>
                  : <Ionicons name={activeCfg.icon} size={52} color={activeCfg.color}/>
                }
              </View>
              <Text style={mv.filePlaceholderLabel}>{activeCfg.label}</Text>
              <Text style={mv.filePlaceholderName} numberOfLines={2}>
                {activeUrl.split('/').pop()?.split('?')[0] || `File ${activeIdx+1}`}
              </Text>
            </View>
          )}

          {/* Prev / Next arrows */}
          {files.length > 1 && activeIdx > 0 && (
            <TouchableOpacity style={[mv.navBtn, mv.navLeft]} onPress={()=>navTo(-1)}>
              <Ionicons name="chevron-back" size={26} color={C.white}/>
            </TouchableOpacity>
          )}
          {files.length > 1 && activeIdx < files.length - 1 && (
            <TouchableOpacity style={[mv.navBtn, mv.navRight]} onPress={()=>navTo(1)}>
              <Ionicons name="chevron-forward" size={26} color={C.white}/>
            </TouchableOpacity>
          )}
        </View>

        {/* Thumbnail strip */}
        {files.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={mv.stripRow}
            style={mv.strip}
          >
            {files.map((url, i) => {
              const t   = getFileType(url);
              const cfg = fileTypeConfig(t);
              const isImg = t === 'image';
              const active = i === activeIdx;
              return (
                <TouchableOpacity key={i} onPress={()=>setActiveIdx(i)} style={[mv.stripThumb, active && mv.stripThumbActive]}>
                  {isImg ? (
                    <Image source={{uri:url}} style={mv.stripImg} resizeMode="cover"/>
                  ) : (
                    <View style={[mv.stripIconWrap, {backgroundColor:cfg.bg}]}>
                      {cfg.lib === 'MCI'
                        ? <MaterialCommunityIcons name={cfg.icon} size={18} color={cfg.color}/>
                        : <Ionicons name={cfg.icon} size={18} color={cfg.color}/>
                      }
                    </View>
                  )}
                  {active && <View style={mv.stripActiveDot}/>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Project info footer */}
        <View style={[mv.footer, {paddingBottom: insets.bottom + 16}]}>
          {item.description ? (
            <Text style={mv.footerDesc} numberOfLines={3}>{item.description}</Text>
          ) : null}
          <View style={mv.footerMeta}>
            {item.completedAt && (
              <View style={mv.footerMetaChip}>
                <Ionicons name="calendar-outline" size={13} color={C.textMut}/>
                <Text style={mv.footerMetaText}>{moment(item.completedAt).format('MMMM YYYY')}</Text>
              </View>
            )}
            <View style={mv.footerMetaChip}>
              <Ionicons name="attach-outline" size={13} color={C.textMut}/>
              <Text style={mv.footerMetaText}>{files.length} file{files.length!==1?'s':''}</Text>
            </View>
            {/* File type badges for all distinct types */}
            <View style={mv.fileTypePills}>
              {[...new Set(files.map(getFileType))].map(t => (
                <FileTypeBadge key={t} url={`file.${t==='image'?'jpg':t==='video'?'mp4':t}`} compact={false}/>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Modal styles
const mv = StyleSheet.create({
  root:   { flex:1, backgroundColor:'#08101F' },
  header: { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingBottom:12, backgroundColor:'rgba(0,0,0,0.5)' },
  closeBtn: { width:38, height:38, borderRadius:10, backgroundColor:'rgba(255,255,255,0.12)', alignItems:'center', justifyContent:'center' },
  headerCenter: { flex:1, alignItems:'center' },
  headerTitle: { color:C.white, fontSize:16, fontWeight:'700' },
  headerSub:   { color:'rgba(255,255,255,0.5)', fontSize:12, marginTop:1 },
  mediaWrap:   { flex:1, justifyContent:'center', alignItems:'center', position:'relative' },
  mediaImage:  { width:W, height:H * 0.55 },
  filePlaceholder: { alignItems:'center', justifyContent:'center', gap:14 },
  filePlaceholderIcon: { width:110, height:110, borderRadius:28, alignItems:'center', justifyContent:'center' },
  filePlaceholderLabel: { color:C.white, fontSize:14, fontWeight:'800', letterSpacing:1 },
  filePlaceholderName:  { color:'rgba(255,255,255,0.5)', fontSize:12, textAlign:'center', maxWidth:220 },
  navBtn:  { position:'absolute', top:'50%', marginTop:-24, width:48, height:48, borderRadius:24, backgroundColor:'rgba(255,255,255,0.14)', alignItems:'center', justifyContent:'center' },
  navLeft:  { left:12 },
  navRight: { right:12 },
  strip:    { maxHeight:80, backgroundColor:'rgba(0,0,0,0.4)' },
  stripRow: { paddingHorizontal:14, paddingVertical:12, gap:8, flexDirection:'row' },
  stripThumb: { width:54, height:54, borderRadius:10, overflow:'hidden', borderWidth:2, borderColor:'transparent' },
  stripThumbActive: { borderColor:C.white },
  stripImg: { width:'100%', height:'100%' },
  stripIconWrap: { width:'100%', height:'100%', alignItems:'center', justifyContent:'center' },
  stripActiveDot: { position:'absolute', bottom:3, left:'50%', marginLeft:-3, width:6, height:6, borderRadius:3, backgroundColor:C.white },
  footer: { backgroundColor:'rgba(0,0,0,0.6)', paddingHorizontal:20, paddingTop:14 },
  footerDesc: { color:'rgba(255,255,255,0.8)', fontSize:14, lineHeight:20, marginBottom:10 },
  footerMeta: { flexDirection:'row', flexWrap:'wrap', gap:10, alignItems:'center' },
  footerMetaChip: { flexDirection:'row', alignItems:'center', gap:5 },
  footerMetaText: { color:'rgba(255,255,255,0.45)', fontSize:12 },
  fileTypePills: { flexDirection:'row', gap:6 },
});

// ─── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ icon, text }) {
  return (
    <View style={ss.emptyState}>
      <View style={ss.emptyIconCircle}>
        <Ionicons name={icon} size={32} color={C.mist}/>
      </View>
      <Text style={ss.emptyText}>{text}</Text>
    </View>
  );
}

// ─── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, dot, badge, action, children }) {
  return (
    <View style={ss.section}>
      <View style={ss.secHeader}>
        <View style={[ss.secDot, {backgroundColor:dot}]}/>
        <Text style={ss.secTitle}>{title}</Text>
        {badge != null && (
          <View style={ss.secBadge}><Text style={ss.secBadgeText}>{badge}</Text></View>
        )}
        {action && (
          <TouchableOpacity onPress={action.onPress} style={ss.secAction}>
            <Text style={ss.secActionText}>{action.label}</Text>
            <Ionicons name="chevron-forward" size={13} color={C.sage}/>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function ApplicantProfileScreen({ route, navigation }) {
  const { taskerId } = route.params;
  const insets  = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [profile,       setProfile]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState('overview');
  const [viewerItem,    setViewerItem]    = useState(null);
  const [showViewer,    setShowViewer]    = useState(false);

  const [showReport,    setShowReport]    = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTaskerProfile(taskerId);
      if (res.status === 200) setProfile(res.data.data || res.data);
      else { Alert.alert('Not found', 'This profile could not be loaded.'); navigation?.goBack(); }
    } catch {
      Alert.alert('Error', 'Failed to load profile.');
    } finally { setLoading(false); }
  }, [taskerId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const user       = profile?.userId || {};
  const userName   = profile?.businessName || user.name || 'Tasker';
  const userImage  = user.profileImage || null;
  const bannerImg  = profile?.brandBanner || null;
  const rating     = profile?.rating || 0;
  const numRatings = profile?.numberOfRatings || 0;
  const score      = profile?.score ?? 0;
  const isVerified = !!profile?.isVerified;
  const location   = [profile?.location?.city, profile?.location?.region].filter(Boolean).join(', ');
  const portfolio  = profile?.workPortfolio || [];
  const services   = profile?.servicesOffered || [];
  const palette    = getBrandPalette(userName);

  // ── Scroll-driven header ──────────────────────────────────────────────────
  const headerBgOp = scrollY.interpolate({
    inputRange: [BANNER_H - 80, BANNER_H - 30],
    outputRange: [0, 1], extrapolate:'clamp',
  });

  const TABS = [
    { id:'overview',  label:'Overview',  icon:'person-outline'    },
    { id:'services',  label:'Services',  icon:'construct-outline' },
    { id:'portfolio', label:'Portfolio', icon:'images-outline'    },
    { id:'reviews',   label:'Reviews',   icon:'star-outline'      },
  ];

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <SafeAreaView style={[ss.root,{justifyContent:'center',alignItems:'center'}]}>
      <StatusBar barStyle="dark-content"/>
      <ActivityIndicator size="large" color={C.inkMid}/>
      <Text style={{color:C.textSec, marginTop:14, fontSize:14}}>Loading profile…</Text>
    </SafeAreaView>
  );

  if (!profile) return (
    <SafeAreaView style={[ss.root,{justifyContent:'center',alignItems:'center'}]}>
      <Text style={{color:C.textSec}}>Profile not found.</Text>
    </SafeAreaView>
  );

  // ── Tab panels ────────────────────────────────────────────────────────────

  const OverviewTab = () => (
    <View>
      {/* Bio */}
      {profile?.bio ? (
        <FadeUp delay={80}>
          <Section title="About" dot={C.sage}>
            <Text style={ss.bioText}>{profile.bio}</Text>
          </Section>
        </FadeUp>
      ) : null}

      {/* Stats strip */}
      <FadeUp delay={130}>
        <View style={ss.statsStrip}>
          <View style={ss.statItem}>
            <Text style={ss.statVal}>{rating.toFixed(1)}</Text>
            <Stars rating={rating} size={13}/>
            <Text style={ss.statLabel}>{numRatings} reviews</Text>
          </View>
          <View style={ss.statDivider}/>
          <View style={ss.statItem}>
            <Text style={ss.statVal}>{score}</Text>
            <View style={ss.statMeta}>
              <Ionicons name="trending-up-outline" size={13} color={C.sage}/>
              <Text style={ss.statLabel}>Score</Text>
            </View>
          </View>
          <View style={ss.statDivider}/>
          <View style={ss.statItem}>
            <Text style={ss.statVal}>{portfolio.length}</Text>
            <View style={ss.statMeta}>
              <Ionicons name="images-outline" size={13} color={C.inkMid}/>
              <Text style={ss.statLabel}>Projects</Text>
            </View>
          </View>
        </View>
      </FadeUp>

      {/* Services preview */}
      {services.length > 0 && (
        <FadeUp delay={170}>
          <Section title="Services" dot={C.inkMid}
            action={services.length>3 ? {label:`See all ${services.length}`, onPress:()=>setActiveTab('services')} : null}>
            {services.slice(0,3).map((svc,i) => <ServiceCard key={i} svc={svc} index={i}/>)}
          </Section>
        </FadeUp>
      )}

      {/* Details */}
      <FadeUp delay={220}>
        <Section title="Details" dot={C.amber}>
          <View style={ss.detailsGrid}>
            {location ? (
              <View style={ss.detailRow}>
                <View style={[ss.detailIcon,{backgroundColor:C.sageLight}]}>
                  <Ionicons name="location-outline" size={16} color={C.sage}/>
                </View>
                <View><Text style={ss.detailLabel}>Location</Text><Text style={ss.detailVal}>{location}</Text></View>
              </View>
            ) : null}
            <View style={ss.detailRow}>
              <View style={[ss.detailIcon,{backgroundColor:isVerified?C.verifiedBg:C.coralBg}]}>
                <Ionicons name={isVerified?'checkmark-circle':'shield-outline'} size={16} color={isVerified?C.verified:C.coral}/>
              </View>
              <View>
                <Text style={ss.detailLabel}>Verification</Text>
                <Text style={[ss.detailVal,{color:isVerified?C.verified:C.coral}]}>{isVerified?'Verified Professional':'Not Verified'}</Text>
              </View>
            </View>
            <View style={ss.detailRow}>
              <View style={[ss.detailIcon,{backgroundColor:C.goldBg}]}>
                <Ionicons name="time-outline" size={16} color={C.gold}/>
              </View>
              <View>
                <Text style={ss.detailLabel}>Vetting Status</Text>
                <Text style={ss.detailVal}>{profile?.vettingStatus==='approved'?'Background Checked':(profile?.vettingStatus||'N/A')}</Text>
              </View>
            </View>
            <View style={ss.detailRow}>
              <View style={[ss.detailIcon,{backgroundColor:'#EEF0FF'}]}>
                <Ionicons name="calendar-outline" size={16} color={C.inkMid}/>
              </View>
              <View>
                <Text style={ss.detailLabel}>Member Since</Text>
                <Text style={ss.detailVal}>{moment(profile?.createdAt).format('MMMM YYYY')}</Text>
              </View>
            </View>
          </View>
        </Section>
      </FadeUp>
    </View>
  );

  const ServicesTab = () => (
    <FadeUp delay={60}>
      <Section title="All Services" dot={C.inkMid} badge={services.length}>
        {services.length > 0
          ? services.map((svc,i) => <ServiceCard key={i} svc={svc} index={i}/>)
          : <EmptyState icon="construct-outline" text="No services listed yet."/>
        }
      </Section>
    </FadeUp>
  );

  const PortfolioTab = () => (
    <View>
      {portfolio.length > 0 ? (
        <>
          {/* File type legend */}
          <FadeUp delay={40}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}} contentContainerStyle={{gap:8,paddingHorizontal:2}}>
              {[...new Set(portfolio.flatMap(p => (p.files||p.images||[]).map(getFileType)))].map(t => (
                <FileTypeBadge key={t} url={`file.${t==='image'?'jpg':t==='video'?'mp4':t==='pdf'?'pdf':t==='doc'?'docx':t==='sheet'?'xlsx':'dat'}`}/>
              ))}
              <View style={ss.legendCount}>
                <Text style={ss.legendCountText}>{portfolio.length} project{portfolio.length!==1?'s':''}</Text>
              </View>
            </ScrollView>
          </FadeUp>

          {/* 3-column grid */}
          <View style={ss.portfolioGrid}>
            {portfolio.map((item, i) => (
              <PortfolioThumb
                key={i} item={item} index={i}
                onPress={()=>{ setViewerItem(item); setShowViewer(true); }}
              />
            ))}
          </View>
        </>
      ) : (
        <FadeUp delay={60}>
          <EmptyState icon="images-outline" text="No portfolio projects yet."/>
        </FadeUp>
      )}
    </View>
  );

  const ReviewsTab = () => (
    <FadeUp delay={60}>
      <Section title="Ratings & Reviews" dot={C.amber}>
        <View style={ss.ratingHero}>
          <Text style={ss.ratingBig}>{rating.toFixed(1)}</Text>
          <Stars rating={rating} size={26} color={C.amber}/>
          <Text style={ss.ratingCount}>{numRatings} review{numRatings!==1?'s':''}</Text>
        </View>
        {numRatings===0 && <EmptyState icon="star-outline" text="No reviews yet."/>}
      </Section>
    </FadeUp>
  );

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={ss.root}>
      <StatusBar barStyle="light-content"/>

      {/* Scroll-driven solid header */}
        <Animated.View style={[ss.floatingHeader, {
          paddingTop: insets.top + 8,
          backgroundColor: C.surface,
          opacity: headerBgOp,
          borderBottomWidth: 1, borderBottomColor: C.hairline,
        }]}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={ss.backSolid}>
            <Ionicons name="chevron-back" size={20} color={C.charcoal} />
          </TouchableOpacity>
          <Text style={ss.floatingTitle} numberOfLines={1}>{userName}</Text>
          
          {/* ── Report button (solid header) ── */}
          <TouchableOpacity
            style={ss.reportHeaderBtn}
            onPress={() => setShowReport(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="flag-outline" size={18} color={C.coral} />
          </TouchableOpacity>
        </Animated.View>

      {/* Always-visible glass back btn + Report */}
            <View style={[ss.floatingHeader,{
              paddingTop:insets.top+8,
              backgroundColor:'transparent',
              borderBottomWidth:0,
              zIndex:10,
            }]}>
              <TouchableOpacity onPress={()=>navigation?.goBack()} style={ss.backGlass}>
                <Ionicons name="chevron-back" size={20} color={C.white}/>
              </TouchableOpacity>
              <View style={{flex:1}}/>
              
              {/* ── Report button (transparent header) ── */}
              <TouchableOpacity
                style={ss.reportGlassBtn}
                onPress={() => setShowReport(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="flag-outline" size={18} color={C.white} />
              </TouchableOpacity>
            </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{nativeEvent:{contentOffset:{y:scrollY}}}],{useNativeDriver:false})}
        contentContainerStyle={{paddingBottom:130}}
      >
        {/* Banner */}
        <View style={ss.bannerWrap}>
          {bannerImg ? (
            <Image source={{uri:bannerImg}} style={ss.bannerImg} resizeMode="cover"/>
          ) : (
            <View style={ss.bannerImg}>
              <ProfileBrandedBanner name={userName} services={services} palette={palette}/>
            </View>
          )}
          <LinearGradient colors={['transparent','rgba(8,12,28,0.6)']} style={ss.bannerVignette}/>
          <View style={ss.providerTag}>
            <Text style={ss.providerTagTxt}>
              {profile?.providerType==='business' ? '🏢 Business' : '👤 Individual'}
            </Text>
          </View>
        </View>

        {/* Avatar row */}
        <View style={ss.avatarRow}>
          <View style={ss.avatarRing}>
            {userImage
              ? <Image source={{uri:userImage}} style={ss.avatar}/>
              : <LinearGradient colors={[palette.accent, palette.from]} start={{x:0,y:0}} end={{x:1,y:1}} style={ss.avatar}>
                  <Text style={ss.avatarInit}>{getInitials(userName)}</Text>
                </LinearGradient>
            }
            {isVerified && (
              <View style={ss.verifiedBadge}>
                <Ionicons name="checkmark" size={10} color={C.white}/>
              </View>
            )}
          </View>
          <View style={{flex:1}}/>
          {rating > 0 && (
            <View style={ss.ratingPill}>
              <Ionicons name="star" size={13} color={C.amber}/>
              <Text style={ss.ratingPillVal}>{rating.toFixed(1)}</Text>
              <Text style={ss.ratingPillCount}>({numRatings})</Text>
            </View>
          )}
        </View>

        {/* Identity */}
        <FadeUp delay={40}>
          <View style={ss.identityBlock}>
            <View style={ss.nameRow}>
              <Text style={ss.nameText}>{userName}</Text>
              {isVerified && (
                <View style={ss.verifiedChip}>
                  <Ionicons name="checkmark-circle" size={13} color={C.verified}/>
                  <Text style={ss.verifiedChipTxt}>Verified</Text>
                </View>
              )}
            </View>
            {profile?.tagline
              ? <Text style={ss.tagline}>"{profile.tagline}"</Text>
              : null}
            {location
              ? <View style={ss.locationRow}>
                  <Ionicons name="location-outline" size={13} color={C.mist}/>
                  <Text style={ss.locationTxt}>{location}</Text>
                </View>
              : null}
          </View>
        </FadeUp>

        {/* Tab bar */}
        <View style={ss.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ss.tabBarInner}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[ss.tabBtn, activeTab===tab.id && ss.tabBtnActive]}
                onPress={()=>setActiveTab(tab.id)}
                activeOpacity={0.8}
              >
                <Ionicons name={tab.icon} size={14} color={activeTab===tab.id ? C.white : C.mist}/>
                <Text style={[ss.tabBtnTxt, activeTab===tab.id && ss.tabBtnTxtActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab content */}
        <View style={ss.tabContent}>
          {activeTab === 'overview'  && <OverviewTab/>}
          {activeTab === 'services'  && <ServicesTab/>}
          {activeTab === 'portfolio' && <PortfolioTab/>}
          {activeTab === 'reviews'   && <ReviewsTab/>}
        </View>
      </Animated.ScrollView>

      {/* Book Now */}
      <View style={[ss.bookBar, {paddingBottom: insets.bottom + 12}]}>
        <TouchableOpacity
          style={ss.bookBtn}
          onPress={()=>navigate('Booking',{selectedTasker:profile})}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={[C.inkMid, C.charcoal]}
            start={{x:0,y:0}} end={{x:1,y:0}}
            style={ss.bookGrad}
          >
            <Ionicons name="calendar-outline" size={20} color={C.white}/>
            <Text style={ss.bookTxt}>Book This Tasker</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Portfolio detail modal */}
      <PortfolioDetailModal
        item={viewerItem}
        visible={showViewer}
        onClose={()=>{ setShowViewer(false); setViewerItem(null); }}
      />
      <ReportForm
      isVisible={showReport}
      onClose={() => setShowReport(false)}
      reportedUserId={profile?.userId?._id}
      taskId={null}                          // optional
      taskTitle={profile?.businessName || userName}
      onReportSubmitted={() => {
        Alert.alert('Done', 'Your report has been submitted.');
      }}
    />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  root: { flex:1, backgroundColor:C.bg },

  // Floating header
  floatingHeader: {
    position:'absolute', top:0, left:0, right:0, zIndex:20,
    flexDirection:'row', alignItems:'center',
    paddingHorizontal:16, paddingBottom:12,
  },
  floatingTitle: { flex:1, textAlign:'center', fontSize:16, fontWeight:'700', color:C.charcoal },
  backGlass: { width:38, height:38, borderRadius:19, backgroundColor:'rgba(0,0,0,0.38)', alignItems:'center', justifyContent:'center' },
  backSolid: { width:38, height:38, borderRadius:19, backgroundColor:C.hairline, alignItems:'center', justifyContent:'center' },

  // Banner
  bannerWrap:    { width:'100%', height:BANNER_H, position:'relative' },
  bannerImg:     { width:'100%', height:'100%' },
  bannerVignette:{ position:'absolute', bottom:0, left:0, right:0, height:BANNER_H*0.55 },
  providerTag:   { position:'absolute', bottom:12, left:14, backgroundColor:'rgba(255,255,255,0.14)', borderWidth:1, borderColor:'rgba(255,255,255,0.22)', borderRadius:20, paddingHorizontal:12, paddingVertical:5 },
  providerTagTxt:{ color:C.white, fontSize:12, fontWeight:'600' },

  // Avatar
  avatarRow: { flexDirection:'row', alignItems:'flex-end', marginTop:-(AVATAR_SZ/2), paddingHorizontal:18, paddingBottom:4, zIndex:5 },
  avatarRing: { width:AVATAR_SZ+6, height:AVATAR_SZ+6, borderRadius:(AVATAR_SZ+6)/2, backgroundColor:C.bg, justifyContent:'center', alignItems:'center', position:'relative', shadowColor:'#000', shadowOffset:{width:0,height:6}, shadowOpacity:0.18, shadowRadius:14, elevation:10 },
  avatar:     { width:AVATAR_SZ, height:AVATAR_SZ, borderRadius:AVATAR_SZ/2, justifyContent:'center', alignItems:'center' },
  avatarInit: { fontSize:30, fontWeight:'800', color:C.white, letterSpacing:1 },
  verifiedBadge: { position:'absolute', bottom:2, right:2, width:22, height:22, borderRadius:11, backgroundColor:C.verified, borderWidth:2, borderColor:C.bg, alignItems:'center', justifyContent:'center' },
  ratingPill: { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:C.goldBg, borderRadius:20, paddingHorizontal:12, paddingVertical:6, borderWidth:1, borderColor:C.amber+'30', marginBottom:6 },
  ratingPillVal:   { fontSize:14, fontWeight:'800', color:C.charcoal },
  ratingPillCount: { fontSize:12, color:C.mist },

  // Identity
  identityBlock: { paddingHorizontal:18, paddingTop:8, paddingBottom:4 },
  nameRow: { flexDirection:'row', alignItems:'center', flexWrap:'wrap', gap:8, marginBottom:4 },
  nameText: { fontSize:26, fontWeight:'800', color:C.charcoal, letterSpacing:-0.5 },
  verifiedChip: { flexDirection:'row', alignItems:'center', gap:4, backgroundColor:C.verifiedBg, borderRadius:12, paddingHorizontal:8, paddingVertical:3, borderWidth:1, borderColor:C.verified+'30' },
  verifiedChipTxt: { fontSize:11, fontWeight:'700', color:C.verified },
  tagline: { fontSize:14, color:C.textSec, fontStyle:'italic', lineHeight:20, marginBottom:8 },
  locationRow: { flexDirection:'row', alignItems:'center', gap:4 },
  locationTxt: { fontSize:13, color:C.mist },

  // Tabs
  tabBar: { marginHorizontal:8, marginTop:18, marginBottom:4, backgroundColor:C.surface, borderRadius:14, borderWidth:1, borderColor:C.hairline, overflow:'hidden', shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.05, shadowRadius:6, elevation:2 },
  tabBarInner: { paddingVertical:6, gap:1, flexDirection:'row', paddingHorizontal:4 },
  tabBtn: { flexDirection:'row', alignItems:'center', gap:5, paddingHorizontal:14, paddingVertical:9, borderRadius:10 },
  tabBtnActive: { backgroundColor:C.charcoal },
  tabBtnTxt:   { fontSize:13, fontWeight:'600', color:C.mist },
  tabBtnTxtActive: { color:C.white },
  tabContent: { paddingHorizontal:16, paddingTop:12 },

  // Section
  section: { backgroundColor:C.surface, borderRadius:18, padding:18, marginBottom:14, borderWidth:1, borderColor:C.hairline, shadowColor:'#1A1A2E', shadowOffset:{width:0,height:3}, shadowOpacity:0.06, shadowRadius:12, elevation:3 },
  secHeader: { flexDirection:'row', alignItems:'center', gap:10, marginBottom:16, paddingBottom:14, borderBottomWidth:1, borderBottomColor:C.hairline },
  secDot: { width:10, height:10, borderRadius:5 },
  secTitle: { fontSize:17, fontWeight:'800', color:C.charcoal, flex:1, letterSpacing:-0.2 },
  secBadge: { backgroundColor:C.inkMid+'14', borderRadius:10, paddingHorizontal:8, paddingVertical:2 },
  secBadgeText: { fontSize:12, fontWeight:'700', color:C.inkMid },
  secAction: { flexDirection:'row', alignItems:'center', gap:2 },
  secActionText: { fontSize:13, color:C.sage, fontWeight:'600' },

  // Bio
  bioText: { fontSize:15, color:C.textSec, lineHeight:23 },

  // Stats
  statsStrip: { flexDirection:'row', backgroundColor:C.surface, borderRadius:18, padding:18, marginBottom:14, borderWidth:1, borderColor:C.hairline, shadowColor:'#1A1A2E', shadowOffset:{width:0,height:3}, shadowOpacity:0.06, shadowRadius:12, elevation:3 },
  statItem:   { flex:1, alignItems:'center', gap:4 },
  statDivider:{ width:1, backgroundColor:C.hairline, marginHorizontal:8 },
  statVal:    { fontSize:24, fontWeight:'800', color:C.charcoal },
  statLabel:  { fontSize:11, color:C.mist, textAlign:'center' },
  statMeta:   { flexDirection:'row', alignItems:'center', gap:4 },

  // Services
  svcCard: { flexDirection:'row', alignItems:'flex-start', backgroundColor:C.bg, borderRadius:14, padding:14, marginBottom:10, borderWidth:1, borderColor:C.hairline, borderLeftWidth:3 },
  svcIconWrap: { width:34, height:34, borderRadius:10, alignItems:'center', justifyContent:'center', marginRight:12 },
  svcBody: { flex:1, marginRight:8 },
  svcName: { fontSize:15, fontWeight:'700', color:C.charcoal, marginBottom:3 },
  svcDesc: { fontSize:13, color:C.textSec, lineHeight:18 },
  svcPricePill: { borderWidth:1, borderRadius:12, paddingHorizontal:10, paddingVertical:5, alignItems:'center', minWidth:70 },
  svcPriceAmt:  { fontSize:13, fontWeight:'800' },
  svcPriceType: { fontSize:11, fontWeight:'600', marginTop:1 },

  // Details
  detailsGrid: { gap:12 },
  detailRow: { flexDirection:'row', alignItems:'center', gap:12 },
  detailIcon: { width:38, height:38, borderRadius:10, alignItems:'center', justifyContent:'center' },
  detailLabel: { fontSize:11, color:C.mist, fontWeight:'600', letterSpacing:0.5, marginBottom:2 },
  detailVal:   { fontSize:14, color:C.textPri, fontWeight:'600' },

  // Portfolio grid
  portfolioGrid: { flexDirection:'row', flexWrap:'wrap', gap:GRID_GAP },
  legendCount: { backgroundColor:C.hairline, borderRadius:20, paddingHorizontal:10, paddingVertical:5, justifyContent:'center' },
  legendCountText: { fontSize:12, fontWeight:'700', color:C.mist },

  // Portfolio thumbnail
  thumb: { width:THUMB_W, height:THUMB_H, borderRadius:14, overflow:'hidden', backgroundColor:C.hairline, position:'relative' },
  thumbImg: { width:'100%', height:'100%' },
  thumbPlaceholder: { width:'100%', height:'100%', alignItems:'center', justifyContent:'center', gap:8 },
  thumbFileLabel: { fontSize:10, fontWeight:'800', letterSpacing:0.8 },
  thumbPlayCircle: { width:40, height:40, borderRadius:20, backgroundColor:'rgba(255,255,255,0.22)', alignItems:'center', justifyContent:'center' },
  thumbGrad: { position:'absolute', bottom:0, left:0, right:0, paddingHorizontal:9, paddingBottom:10, paddingTop:28 },
  thumbFooter: {},
  thumbTitle: { color:C.white, fontSize:12, fontWeight:'700', marginBottom:2 },
  thumbDate:  { color:'rgba(255,255,255,0.6)', fontSize:10 },
  thumbCountBadge: { position:'absolute', top:7, right:7, flexDirection:'row', alignItems:'center', gap:3, backgroundColor:'rgba(0,0,0,0.55)', paddingHorizontal:6, paddingVertical:3, borderRadius:10 },
  thumbCountText: { color:C.white, fontSize:10, fontWeight:'700' },
  thumbTypeBadge: { position:'absolute', top:7, left:7 },
  thumbVideoOverlay: { position:'absolute', top:0, left:0, right:0, bottom:0, alignItems:'center', justifyContent:'center' },

  // Rating hero
  ratingHero: { alignItems:'center', paddingVertical:24, gap:8 },
  ratingBig:  { fontSize:56, fontWeight:'800', color:C.charcoal, letterSpacing:-2 },
  ratingCount:{ fontSize:14, color:C.mist, marginTop:4 },

  // Empty state
  emptyState: { alignItems:'center', paddingVertical:36, gap:10 },
  emptyIconCircle: { width:70, height:70, borderRadius:35, backgroundColor:C.hairline, alignItems:'center', justifyContent:'center' },
  emptyText: { fontSize:14, color:C.textMut },

  // Book bar
  bookBar: { position:'absolute', bottom:0, left:0, right:0, paddingHorizontal:20, paddingTop:12, backgroundColor:C.surface, borderTopWidth:1, borderTopColor:C.hairline },
  bookBtn: { borderRadius:16, overflow:'hidden', shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.18, shadowRadius:8, elevation:6 },
  bookGrad: { flexDirection:'row', alignItems:'center', justifyContent:'center', paddingVertical:16, gap:10 },
  bookTxt: { color:C.white, fontSize:16, fontWeight:'700', letterSpacing:0.3 },

  reportHeaderBtn: {
  width: 38,
  height: 38,
  borderRadius: 12,
  backgroundColor: C.coralBg,
  borderWidth: 1,
  borderColor: C.coral + '40',
  alignItems: 'center',
  justifyContent: 'center',
},
reportGlassBtn: {
  width: 38,
  height: 38,
  borderRadius: 19,
  backgroundColor: 'rgba(0,0,0,0.38)',
  alignItems: 'center',
  justifyContent: 'center',
},
});