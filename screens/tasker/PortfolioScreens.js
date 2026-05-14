// screens/tasker/TaskerPortfolioScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, SafeAreaView, Image,
  ActivityIndicator, TextInput, StyleSheet, Alert, Dimensions,
  Animated, Modal, FlatList, Pressable, Platform, StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import {
  taskerGetMyProfile,
  uploadPortfolioFiles,
  addWorkSampleToProfile,
  removeWorkSampleFromProfile,
} from '../../api/taskerApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 12) / 2; // 2-col grid with gaps

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border: '#E8ECF2',
  borderStrong: '#D1D9E6',
  primary: '#1A3461',
  primaryLight: '#E8EEF9',
  accent: '#C9891A',
  accentLight: '#FDF3E0',
  accentMid: '#E8A730',
  teal: '#0F766E',
  tealLight: '#E0F5F2',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  textPrimary: '#0D1B35',
  textSecondary: '#4A5B7A',
  textMuted: '#8FA0BE',
  white: '#FFFFFF',
  overlay: 'rgba(13,27,53,0.72)',
  shimmer: '#E8ECF2',
};

// ─── File type helpers ─────────────────────────────────────────────────────────
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic'];
const VIDEO_EXTS = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
const DOC_EXTS   = ['doc', 'docx'];
const SHEET_EXTS = ['xls', 'xlsx', 'csv'];

function getFileType(url = '') {
  console.log(url)
  const ext = (url.split('?')[0].split('.').pop() || '').toLowerCase();
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (VIDEO_EXTS.includes(ext)) return 'video';
  if (ext === 'pdf')            return 'pdf';
  if (DOC_EXTS.includes(ext))   return 'doc';
  if (SHEET_EXTS.includes(ext)) return 'sheet';
  return 'other';
}

function FileTypeChip({ url, size = 'md' }) {
  const type = getFileType(url);
  const configs = {
    image:  { icon: 'image',                lib: 'Ionicons', color: C.teal,    bg: C.tealLight,  label: 'IMG'  },
    video:  { icon: 'videocam',             lib: 'Ionicons', color: '#7C3AED', bg: '#EDE9FE',    label: 'VID'  },
    pdf:    { icon: 'document-text',        lib: 'Ionicons', color: C.danger,  bg: C.dangerLight,label: 'PDF'  },
    doc:    { icon: 'file-word-outline',    lib: 'MCI',      color: '#1D4ED8', bg: '#DBEAFE',    label: 'DOC'  },
    sheet:  { icon: 'file-excel-outline',   lib: 'MCI',      color: '#15803D', bg: '#DCFCE7',    label: 'XLS'  },
    other:  { icon: 'attach-outline',       lib: 'Ionicons', color: C.textSecondary, bg: C.border, label: 'FILE' },
  };
  const cfg = configs[type];
  const iconSize = size === 'lg' ? 28 : size === 'sm' ? 14 : 20;

  return (
    <View style={[fileChipStyles.wrap, { backgroundColor: cfg.bg }, size === 'lg' && fileChipStyles.lg]}>
      {cfg.lib === 'MCI'
        ? <MaterialCommunityIcons name={cfg.icon} size={iconSize} color={cfg.color} />
        : <Ionicons name={cfg.icon} size={iconSize} color={cfg.color} />
      }
      {size !== 'sm' && <Text style={[fileChipStyles.label, { color: cfg.color }]}>{cfg.label}</Text>}
    </View>
  );
}
const fileChipStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  lg: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
});

// ─── Animated entry wrapper ───────────────────────────────────────────────────
function FadeIn({ delay = 0, children, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,     { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.spring(translateY,  { toValue: 0, tension: 60, friction: 12, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

// ─── Single file preview tile ─────────────────────────────────────────────────
function FileThumbnail({ url, size = 56, onPress }) {
  const type = getFileType(url);
  const isImage = type === 'image';

  if (isImage) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ width: size, height: size }}>
        <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: 10 }} resizeMode="cover" />
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}
      style={{ width: size, height: size, borderRadius: 10, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' }}>
      <FileTypeChip url={url} size="sm" />
    </TouchableOpacity>
  );
}

// ─── Portfolio card (grid item) ───────────────────────────────────────────────
function PortfolioCard({ item, index, onRemove, isRemoving, onPress }) {
  const files = item.files || [];
  const coverFile = files.find(f => getFileType(f) === 'image') || files[0];
  const hasCover = !!coverFile && getFileType(coverFile) === 'image';
  const fileCount = files.length;
 
  return (
    <FadeIn delay={index * 60} style={styles.card}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.cardInner}>
        {/* Cover area */}
        <View style={styles.cardCover}>
          {hasCover ? (
            <Image source={{ uri: coverFile }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <FileTypeChip url={coverFile || ''} size="lg" />
            </View>
          )}

          {/* File count badge */}
          {fileCount > 1 && (
            <View style={styles.fileBadge}>
              <Ionicons name="copy-outline" size={11} color={C.white} />
              <Text style={styles.fileBadgeText}>{fileCount}</Text>
            </View>
          )}

          {/* File type strip for non-image covers */}
          {!hasCover && files.length > 1 && (
            <View style={styles.fileStrip}>
              {files.slice(0, 4).map((f, i) => (
                <View key={i} style={styles.fileStripDot}>
                  <FileTypeChip url={f} size="sm" />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}
          <View style={styles.cardMeta}>
            {item.completedAt && (
              <Text style={styles.cardDate}>
                {new Date(item.completedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
              </Text>
            )}
            {fileCount > 0 && (
              <Text style={styles.cardFileCount}>{fileCount} file{fileCount !== 1 ? 's' : ''}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Remove button */}
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={onRemove}
        disabled={isRemoving}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {isRemoving
          ? <ActivityIndicator size="small" color={C.danger} />
          : <Ionicons name="trash-outline" size={15} color={C.danger} />
        }
      </TouchableOpacity>
    </FadeIn>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ item, visible, onClose }) {
  if (!item) return null;
  const files = item.files || [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={detailStyles.header}>
          <TouchableOpacity onPress={onClose} style={detailStyles.closeBtn}>
            <Ionicons name="close" size={20} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={detailStyles.title} numberOfLines={1}>{item.title}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Hero image */}
          {files.length > 0 && getFileType(files[0]) === 'image' && (
            <Image source={{ uri: files[0] }} style={detailStyles.hero} resizeMode="cover" />
          )}

          <View style={detailStyles.body}>
            {item.description ? (
              <Text style={detailStyles.desc}>{item.description}</Text>
            ) : null}

            {item.completedAt && (
              <View style={detailStyles.metaRow}>
                <Ionicons name="calendar-outline" size={15} color={C.textMuted} />
                <Text style={detailStyles.metaText}>
                  {new Date(item.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </View>
            )}

            {files.length > 0 && (
              <>
                <Text style={detailStyles.sectionLabel}>Files ({files.length})</Text>
                <View style={detailStyles.fileGrid}>
                  {files.map((url, i) => {
                    const type = getFileType(url);
                    const isImage = type === 'image';
                    return (
                      <View key={i} style={detailStyles.fileCard}>
                        {isImage ? (
                          <Image source={{ uri: url }} style={detailStyles.filePreview} resizeMode="cover" />
                        ) : (
                          <View style={[detailStyles.filePreview, detailStyles.fileIconBox]}>
                            <FileTypeChip url={url} size="lg" />
                          </View>
                        )}
                        <Text style={detailStyles.fileName} numberOfLines={1}>
                          {url.split('/').pop()?.split('?')[0] || `File ${i + 1}`}
                        </Text>
                        <Text style={detailStyles.fileType}>{type.toUpperCase()}</Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const detailStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: C.textPrimary, marginHorizontal: 8 },
  hero: { width: '100%', height: 240 },
  body: { padding: 20 },
  desc: { fontSize: 15, color: C.textSecondary, lineHeight: 23, marginBottom: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  metaText: { fontSize: 13, color: C.textMuted },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: C.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 12 },
  fileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  fileCard: { width: (SCREEN_WIDTH - 40 - 12) / 2, backgroundColor: C.surface, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  filePreview: { width: '100%', height: 120 },
  fileIconBox: { backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  fileName: { fontSize: 12, color: C.textPrimary, fontWeight: '600', paddingHorizontal: 10, paddingTop: 8 },
  fileType: { fontSize: 11, color: C.textMuted, paddingHorizontal: 10, paddingBottom: 10 },
});

// ─── Add Work Modal ────────────────────────────────────────────────────────────
function AddWorkModal({ visible, onClose, onSave, saving }) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [form, setForm] = useState({ title: '', description: '', files: [] });

  useEffect(() => {
    if (visible) {
      setForm({ title: '', description: '', files: [] });
    }
  }, [visible]);

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'video/*', 'application/pdf',
               'application/msword',
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
               'application/vnd.ms-excel',
               'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets) {
        setForm(f => ({ ...f, files: [...f.files, ...result.assets].slice(0, 6) }));
      }
    } catch { Alert.alert('Error', 'Could not open file picker.'); }
  };

  const removeFile = (uri) => setForm(f => ({ ...f, files: f.files.filter(item => item.uri !== uri) }));

  const handleSave = () => onSave(form);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={addStyles.overlay}>
        <View style={addStyles.sheet}>
          <View style={addStyles.handle} />
          <View style={addStyles.header}>
            <Text style={addStyles.title}>Add Work Sample</Text>
            <TouchableOpacity onPress={onClose} style={addStyles.closeBtn}>
              <Ionicons name="close" size={20} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={addStyles.body} keyboardShouldPersistTaps="handled">
            <Text style={addStyles.label}>Project Title <Text style={{ color: C.danger }}>*</Text></Text>
            <TextInput
              style={addStyles.input}
              value={form.title}
              onChangeText={t => setForm(f => ({ ...f, title: t }))}
              placeholder="e.g. Kitchen Renovation 2024"
              placeholderTextColor={C.textMuted}
            />

            <Text style={addStyles.label}>Description</Text>
            <TextInput
              style={[addStyles.input, addStyles.textarea]}
              value={form.description}
              onChangeText={t => setForm(f => ({ ...f, description: t }))}
              placeholder="Describe what this project involved, your role, the outcome…"
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={addStyles.filesHeader}>
              <Text style={addStyles.label}>Attachments</Text>
              <Text style={addStyles.filesCount}>{form.files.length}/6</Text>
            </View>

            {/* Previews */}
            {form.files.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={addStyles.previewScroll} contentContainerStyle={addStyles.previewRow}>
                {form.files.map((file, i) => {
                  const isImage = (file.mimeType || '').startsWith('image/');
                  return (
                    <View key={i} style={addStyles.previewItem}>
                      {isImage ? (
                        <Image source={{ uri: file.uri }} style={addStyles.previewImage} resizeMode="cover" />
                      ) : (
                        <View style={addStyles.previewDoc}>
                          <FileTypeChip url={file.name || file.uri} size="lg" />
                        </View>
                      )}
                      <TouchableOpacity style={addStyles.removeFileDot} onPress={() => removeFile(file.uri)}>
                        <Ionicons name="close" size={10} color={C.white} />
                      </TouchableOpacity>
                      <Text style={addStyles.previewName} numberOfLines={1}>{file.name || 'file'}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {form.files.length < 6 && (
              <TouchableOpacity style={addStyles.addFileBtn} onPress={pickFiles}>
                <View style={addStyles.addFileBtnIcon}>
                  <Ionicons name="cloud-upload-outline" size={22} color={C.teal} />
                </View>
                <View>
                  <Text style={addStyles.addFileBtnText}>Upload Files</Text>
                  <Text style={addStyles.addFileBtnSub}>Images, PDFs, Videos, Docs — up to 6</Text>
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={addStyles.footer}>
            <TouchableOpacity style={addStyles.cancelBtn} onPress={onClose}>
              <Text style={addStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[addStyles.saveBtn, saving && { opacity: 0.65 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color={C.white} />
                : <>
                    <Ionicons name="cloud-upload-outline" size={17} color={C.white} />
                    <Text style={addStyles.saveText}>Save Sample</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const addStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, alignSelf: 'center', marginTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { fontSize: 18, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.3 },
  closeBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 20, paddingTop: 4 },
  label: { fontSize: 12, fontWeight: '700', color: C.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 18, marginBottom: 7 },
  input: { backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: C.textPrimary },
  textarea: { minHeight: 110, textAlignVertical: 'top', paddingTop: 13 },
  filesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filesCount: { fontSize: 12, color: C.textMuted, marginTop: 18 },
  previewScroll: { marginBottom: 12 },
  previewRow: { gap: 10, paddingVertical: 4 },
  previewItem: { width: 82, alignItems: 'center' },
  previewImage: { width: 82, height: 82, borderRadius: 12 },
  previewDoc: { width: 82, height: 82, borderRadius: 12, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  removeFileDot: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center' },
  previewName: { fontSize: 10, color: C.textMuted, marginTop: 5, width: 82, textAlign: 'center' },
  addFileBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.tealLight, borderRadius: 14, padding: 16, marginBottom: 20 },
  addFileBtnIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  addFileBtnText: { fontSize: 14, fontWeight: '700', color: C.teal },
  addFileBtnSub: { fontSize: 12, color: C.teal, opacity: 0.7, marginTop: 2 },
  footer: { bottom:25, flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: C.border, paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 15, borderRadius: 14, borderWidth: 1.5, borderColor: C.borderStrong },
  cancelText: { fontSize: 15, fontWeight: '600', color: C.textSecondary },
  saveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, backgroundColor: C.accent },
  saveText: { fontSize: 15, fontWeight: '700', color: C.white },
});

// ─── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onAdd }) {
  return (
    <FadeIn delay={100} style={styles.emptyWrap}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="images-outline" size={38} color={C.accent} />
      </View>
      <Text style={styles.emptyTitle}>No work samples yet</Text>
      <Text style={styles.emptySubtitle}>
        Showcase your best projects to attract more clients. Add photos, documents, and project details.
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onAdd}>
        <Ionicons name="add" size={18} color={C.white} />
        <Text style={styles.emptyBtnText}>Add Your First Sample</Text>
      </TouchableOpacity>
    </FadeIn>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function TaskerPortfolioScreen({ navigation }) {
  const [portfolio, setPortfolio]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showAdd, setShowAdd]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const [removingId, setRemovingId]   = useState(null);
  const [detailItem, setDetailItem]   = useState(null);

  const fetchPortfolio = useCallback(async () => {
    setLoading(true);
    try {
      const res = await taskerGetMyProfile();
      const p = res.data?.taskerProfile || res.data;
      setPortfolio(p?.workPortfolio || []);
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Could not load portfolio.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPortfolio(); }, []);

  const handleSaveWork = async (form) => {
    if (!form.title.trim()) {
      Alert.alert('Required', 'Please enter a project title.');
      return;
    }
    setSaving(true);
    try {
      let uploadedUrls = [];
      if (form.files.length > 0) {
        const formData = new FormData();
        form.files.forEach((file) => {
          const filename = file.name || file.uri.split('/').pop();
          const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
          const type = file.mimeType || `image/${ext}`;
          formData.append('files', { uri: file.uri, name: filename, type });
        });
        const uploadRes = await uploadPortfolioFiles(formData);
        uploadedUrls = uploadRes.data?.urls || uploadRes.data?.fileUrls || [];
      }
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        files: uploadedUrls,
        completedAt: new Date().toISOString(),
      };
      const res = await addWorkSampleToProfile(payload);
      if (res.status === 200 || res.status === 201) {
        const newSample = res.data?.workSample || payload;
        setPortfolio(prev => [newSample, ...prev]);
        setShowAdd(false);
        fetchPortfolio();
        Alert.alert('Added ✓', 'Work sample added to your portfolio.');
      } else throw new Error();
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Could not upload work sample. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (item) => {
    const id = item._id || item.id;
    if (!id) return;
    Alert.alert(
      'Remove Project',
      `Remove "${item.title || 'this project'}" from your portfolio?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: async () => {
          setRemovingId(id);
          try {
           const res = await removeWorkSampleFromProfile(id);
           if (res.status===200){
               fetchPortfolio();
           } 
          } catch (error) { 
            console.log(error);
            Alert.alert('Error', 'Could not remove this sample.'); 
        }
          finally { setRemovingId(null); }
        }},
      ],
    );
  };

  // ── render ──
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Portfolio</Text>
          {portfolio.length > 0 && (
            <Text style={styles.headerSubtitle}>{portfolio.length} project{portfolio.length !== 1 ? 's' : ''}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.addHeaderBtn}
          onPress={() => setShowAdd(true)}
        >
          <Ionicons name="add" size={20} color={C.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.loadingText}>Loading portfolio…</Text>
        </View>
      ) : portfolio.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            {portfolio.filter(Boolean).map((item, idx) => (
              <PortfolioCard
                key={item._id || item.id || idx}
                item={item}
                index={idx}
                onRemove={() => handleRemove(item)}
                isRemoving={removingId === (item._id || item.id)}
                onPress={() => setDetailItem(item)}
              />
            ))}
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* FAB (only when portfolio has items) */}
      {!loading && portfolio.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={26} color={C.white} />
        </TouchableOpacity>
      )}

      {/* Add Modal */}
      <AddWorkModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={handleSaveWork}
        saving={saving}
      />

      {/* Detail Modal */}
      <DetailModal
        item={detailItem}
        visible={!!detailItem}
        onClose={() => setDetailItem(null)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.2 },
  headerSubtitle: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  addHeaderBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
  },

  // Loading
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: C.textMuted },

  // Scroll / Grid
  scrollContent: { padding: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  // Card
  card: { width: CARD_WIDTH, backgroundColor: C.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  cardInner: { flex: 1 },
  cardCover: { width: '100%', height: 130, backgroundColor: C.bg, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primaryLight },
  fileBadge: {
    position: 'absolute', top: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(13,27,53,0.65)',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20,
  },
  fileBadgeText: { fontSize: 11, fontWeight: '700', color: C.white },
  fileStrip: {
    position: 'absolute', bottom: 8, left: 8,
    flexDirection: 'row', gap: 4,
  },
  fileStripDot: {},

  cardBody: { padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary, marginBottom: 3 },
  cardDesc: { fontSize: 12, color: C.textSecondary, lineHeight: 17, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  cardDate: { fontSize: 11, color: C.textMuted },
  cardFileCount: { fontSize: 11, color: C.textMuted },

  removeBtn: {
    position: 'absolute', top: 8, left: 8,
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.dangerLight,
  },

  // Empty
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  emptyIconCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: C.accentLight, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: C.textPrimary, marginBottom: 10, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: C.textSecondary, lineHeight: 21, textAlign: 'center', marginBottom: 28 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: C.white },

  // FAB
  fab: {
    position: 'absolute', bottom: 98, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.accent, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});