import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  Linking,
  TextInput,
  Platform,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { AuthContext } from '../../context/AuthContext';
import Header from "../../component/tasker/Header";
import { uploadPortfolioFiles, addWorkSampleToProfile, removeWorkSampleFromProfile, fetchUser } from '../../api/authApi';
import { sendFileToS3 } from '../../api/commonApi';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48 - 16) / 2;

const WorkSamplesScreen = ({ navigation }) => {
  const { user: contextUser, updateProfile } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [workSamples, setWorkSamples] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  
  // Delete modal states
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [sampleToDelete, setSampleToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const videoRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link: '',
    files: []
  });

  // Enhanced user loading with error handling
  const loadUser = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      const res = await fetchUser();
      if (res.status === 200) {
        setUser(res.data);
        if (res.data?.workPortfolio) {
          setWorkSamples(res.data.workPortfolio);
        }
      } else {
        throw new Error('Failed to fetch user data');
      }
    } catch (err) {
      console.log('Error loading user:', err);
      Alert.alert(
        'Error', 
        'Failed to load portfolio. Please try again.',
        [{ text: 'Retry', onPress: () => loadUser() }]
      );
    } finally {
      if (showLoader) setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadUser();
  }, []);

  // Refresh control for pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadUser(false);
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', link: '', files: [] });
    setSelectedFiles([]);
    setUploadProgress({});
  };

  // Enhanced delete functionality with refetch
  const removeWorkSample = (sample) => {
    setSampleToDelete(sample);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!sampleToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const res = await removeWorkSampleFromProfile(sampleToDelete._id);
      
      if (res.status === 200) {
        // Refetch user data to ensure consistency
        await loadUser(false);
        
        // Show success feedback
        Alert.alert(
          'Success',
          'Work sample deleted successfully',
          [{ text: 'OK' }]
        );
        
        // Close modal
        setDeleteModalVisible(false);
        setSampleToDelete(null);
      } else {
        throw new Error(res.data?.message || 'Failed to delete work sample');
      }
    } catch (err) {
      console.error('Delete work sample error:', err);
      Alert.alert(
        'Delete Failed',
        err.message || 'Failed to delete work sample. Please try again.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalVisible(false);
    setSampleToDelete(null);
  };

  // Enhanced work sample addition with refetch
  const handleAddWorkSample = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Required', 'Please add a title for your work sample');
      return;
    }
    if (!selectedFiles.length && !formData.link.trim()) {
      Alert.alert('Required', 'Please add at least one file or project link');
      return;
    }

    setUploading(true);
    try {
      const uploadedFiles = selectedFiles.length
        ? await uploadFilesToS3(selectedFiles)
        : [];

      const payload = {
        workPortfolio: {
          ...formData,
          files: uploadedFiles,
        },
      };

      const res = await addWorkSampleToProfile(payload);
      if (res.status === 200) {
        // Refetch user data to ensure consistency
        await loadUser(false);
        
        Alert.alert('Success', 'Work sample added successfully!');
        setShowAddModal(false);
        resetForm();
      } else {
        throw new Error(res.data?.message || 'Failed to save work sample');
      }
    } catch (err) {
      console.error('Add work sample error:', err);
      Alert.alert(
        'Upload Failed', 
        err.message || 'Failed to add work sample. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  // Enhanced file upload with better error handling
  const uploadFilesToS3 = async (files) => {
    const uploaded = [];
    for (const [index, file] of files.entries()) {
      try {
        setUploadProgress(p => ({ ...p, [file.name]: 0 }));
        
        const res = await uploadPortfolioFiles({
          filename: file.name,
          contentType: file.mimeType,
        });
        
        if (res.status === 200) {
          await sendFileToS3(res.data.fileUrl, file, {
            onUploadProgress: (e) => {
              const percent = Math.round((e.loaded * 100) / e.total);
              setUploadProgress(p => ({ ...p, [file.name]: percent }));
            },
          });
          uploaded.push({
            publicUrl: res.data.publicUrl,
            name: file.name,
            type: file.type,
          });
        } else {
          throw new Error(`Failed to get upload URL for ${file.name}`);
        }
      } catch (error) {
        console.error(`Upload failed for ${file.name}:`, error);
        throw new Error(`Failed to upload ${file.name}. Please try again.`);
      }
    }
    return uploaded;
  };

  // Loading component
  const LoadingComponent = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#6366F1" />
      <Text style={styles.loadingText}>Loading your portfolio...</Text>
    </View>
  );

  // Delete Confirmation Modal Component
  const DeleteConfirmationModal = () => (
    <Modal
      visible={deleteModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancelDelete}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.deleteModalContent}>
          <View style={styles.deleteModalHeader}>
            <Ionicons name="warning" size={24} color="#EF4444" />
            <Text style={styles.deleteModalTitle}>Delete Work Sample</Text>
          </View>
          
          <Text style={styles.deleteModalText}>
            Are you sure you want to delete this work sample? This action cannot be undone.
          </Text>
          
          {sampleToDelete && (
            <View style={styles.samplePreview}>
              {sampleToDelete.files && sampleToDelete.files.length > 0 && (
                <Image 
                  source={{ uri: sampleToDelete.files[0].publicUrl }} 
                  style={styles.samplePreviewImage}
                />
              )}
              <Text style={styles.samplePreviewText} numberOfLines={2}>
                {sampleToDelete.title || 'Work Sample'}
              </Text>
            </View>
          )}
          
          <View style={styles.deleteModalActions}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={handleCancelDelete}
              disabled={isDeleting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.deleteButton]}
              onPress={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Rest of your existing functions (pickImages, pickFiles, FilePreview, MediaViewer, WorkSampleCard) remain the same...
  const getFileInfo = async (uri) => {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      return info;
    } catch (e) { return null; }
  };

  const validateVideoSize = async (uri) => {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists && (info.size || 0) / (1024 * 1024) <= 50;
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow media access');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const files = await Promise.all(
        result.assets.map(async (asset) => {
          const isVideo = asset.type === 'video';
          if (isVideo && !(await validateVideoSize(asset.uri))) {
            Alert.alert('File Too Large', 'Video must be under 50MB');
            return null;
          }
          return {
            name: asset.fileName || `file_${Date.now()}`,
            uri: asset.uri,
            size: asset.fileSize || 0,
            mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
            type: isVideo ? 'video' : 'image',
          };
        })
      );
      setSelectedFiles(prev => [...prev, ...files.filter(Boolean)]);
    }
  };

  const pickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true });
    if (!result.canceled) {
      const files = await Promise.all(
        result.assets.map(async (asset) => {
          const isVideo = asset.mimeType?.includes('video') || /\.(mp4|mov)$/i.test(asset.name);
          if (isVideo && !(await validateVideoSize(asset.uri))) {
            Alert.alert('File Too Large', 'Video must be under 50MB');
            return null;
          }
          return {
            name: asset.name,
            uri: asset.uri,
            size: asset.size || 0,
            mimeType: asset.mimeType || 'application/octet-stream',
            type: asset.mimeType?.startsWith('image/') ? 'image' :
                  asset.mimeType?.startsWith('video/') ? 'video' : 'document',
          };
        })
      );
      setSelectedFiles(prev => [...prev, ...files.filter(Boolean)]);
    }
  };

  const removeSelectedFile = (i) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== i));
  };

  const openMediaViewer = (file) => {
    setSelectedFile(file);
    setShowMediaViewer(true);
  };

  const closeMediaViewer = () => {
    setShowMediaViewer(false);
    setSelectedFile(null);
    videoRef.current?.pauseAsync();
  };

  // Reusable Components (FilePreview, MediaViewer, WorkSampleCard remain the same as your original)
  const FilePreview = ({ file, index }) => {
    const progress = uploadProgress[file.name] || 0;
    const isImage = file.type === 'image';
    const isVideo = file.type === 'video';

    return (
      <View style={styles.filePreview}>
        <View style={styles.filePreviewLeft}>
          {isImage ? (
            <Image source={{ uri: file.uri }} style={styles.previewThumb} />
          ) : isVideo ? (
            <View style={styles.videoThumb}>
              <Ionicons name="play" size={18} color="#fff" />
            </View>
          ) : (
            <View style={styles.docThumb}>
              <Ionicons name="document" size={20} color="#6366F1" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
            <Text style={styles.fileSize}>{(file.size / 1024 / 1024).toFixed(1)} MB</Text>
          </View>
        </View>

        {uploading && progress < 100 ? (
          <View style={styles.progressWrapper}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        ) : (
          <TouchableOpacity onPress={() => removeSelectedFile(index)}>
            <Ionicons name="close-circle" size={22} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const MediaViewer = () => {
    if (!showMediaViewer || !selectedFile) return null;

    const { publicUrl, name = 'File' } = selectedFile;

    const getFileType = () => {
      const ext = name.toLowerCase().split('.').pop();
      const url = publicUrl.toLowerCase();

      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
      if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
      if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) return 'document';
      return 'other';
    };

    const type = getFileType();

    const openInSystem = async () => {
      try {
        const supported = await Linking.canOpenURL(publicUrl);
        if (supported) {
          await Linking.openURL(publicUrl);
        } else {
          Alert.alert('Cannot Open', 'No app found to open this file');
        }
      } catch (e) {
        Alert.alert('Error', 'Failed to open file');
      }
    };

    return (
      <SafeAreaView style={styles.viewerOverlay}>
        <TouchableOpacity style={styles.closeBtn} onPress={closeMediaViewer}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        <View style={styles.viewerContent}>
          {type === 'image' ? (
            <Image
              source={{ uri: publicUrl }}
              style={styles.fullMedia}
              resizeMode="contain"
            />
          ) : type === 'video' ? (
            <Video
              ref={videoRef}
              source={{ uri: publicUrl }}
              style={styles.fullMedia}
              useNativeControls
              resizeMode="contain"
            />
          ) : type === 'document' ? (
            <View style={styles.docPreview}>
              <Ionicons name="document" size={80} color="#6366F1" />
              <Text style={styles.docName}>{name}</Text>
              <Text style={styles.docHint}>Tap to open in your default app</Text>
              <TouchableOpacity style={styles.openBtn} onPress={openInSystem}>
                <Ionicons name="open-outline" size={24} color="#fff" />
                <Text style={styles.openText}>Open File</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.docPreview}>
              <Ionicons name="download" size={80} color="#10b981" />
              <Text style={styles.docName}>{name}</Text>
              <Text style={styles.docHint}>Tap to download</Text>
              <TouchableOpacity style={styles.openBtn} onPress={openInSystem}>
                <Ionicons name="download" size={24} color="#fff" />
                <Text style={styles.openText}>Download</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  };

  const WorkSampleCard = ({ sample, index }) => {
    const getFileType = (file) => {
      const name = (file.name || '').toLowerCase();
      const url = (file.publicUrl || '').toLowerCase();
      
      if (name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) || 
          url.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
        return 'image';
      }
      if (name.match(/\.(mp4|mov|avi|mkv|webm)$/i) || 
          url.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
        return 'video';
      }
      return 'document';
    };

    const filesWithType = (sample.files || []).map(file => ({
      ...file,
      type: getFileType(file)
    }));

    const images = filesWithType.filter(f => f.type === 'image');
    const videos = filesWithType.filter(f => f.type === 'video');
    const docs = filesWithType.filter(f => f.type === 'document');
    const media = [...images, ...videos];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{sample.title}</Text>
            {sample.description ? (
              <Text style={styles.cardDesc}>{sample.description}</Text>
            ) : null}
            {sample.link ? (
              <View style={styles.linkRow}>
                <Ionicons name="link" size={14} color="#6366F1" />
                <Text style={styles.linkText}>{sample.link}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity 
            onPress={() => removeWorkSample(sample)}
            disabled={isDeleting}
          >
            {isDeleting && sampleToDelete?._id === sample._id ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Ionicons name="trash" size={20} color="#ef4444" />
            )}
          </TouchableOpacity>
        </View>

        {media.length > 0 && (
          <View style={styles.mediaGrid}>
            {media.slice(0, 4).map((file, i) => {
              const fileIdx = sample.files.indexOf(file);
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.mediaItem}
                  onPress={() => openMediaViewer(file)}
                >
                  {file.type === 'image' ? (
                    <Image source={{ uri: file.publicUrl }} style={styles.mediaThumb} />
                  ) : (
                    <View style={styles.videoItem}>
                      <Video
                        source={{ uri: file.publicUrl }}
                        style={styles.mediaThumb}
                        resizeMode="cover"
                        shouldPlay={false}
                        useNativeControls={false}
                        isMuted={true}
                      />
                      <View style={styles.playOverlay}>
                        <Ionicons name="play-circle" size={36} color="#FFFFFF" />
                      </View>
                      <View style={styles.videoBadge}>
                        <Ionicons name="videocam" size={12} color="#fff" />
                        <Text style={styles.badgeText}>VIDEO</Text>
                      </View>
                    </View>
                  )}
                  {media.length > 4 && i === 3 && (
                    <View style={styles.moreOverlay}>
                      <Text style={styles.moreText}>+{media.length - 4}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {docs.length > 0 && (
          <TouchableOpacity 
            style={styles.docsRow}
            onPress={() => {
              // If there's only one document, open it directly
              if (docs.length === 1) {
                openMediaViewer(docs[0]);
              } else {
                // If multiple documents, show an action sheet to choose
                Alert.alert(
                  'Open Document',
                  'Choose a document to open:',
                  docs.map((doc, index) => ({
                    text: doc.name,
                    onPress: () => openMediaViewer(doc)
                  }))
                );
              }
            }}
          >
            <Ionicons name="documents" size={16} color="#6366F1" />
            <Text style={styles.docsText}>
              {docs.length} document{docs.length > 1 ? 's' : ''} - Tap to open
            </Text>
            <Ionicons name="open-outline" size={16} color="#6366F1" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Show loading screen while fetching data
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Work Portfolio" showBackButton />
        <LoadingComponent />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Work Portfolio"
        showBackButton
        rightComponent={
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.addGradient}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addText}>Add Sample</Text>
            </LinearGradient>
          </TouchableOpacity>
        }
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6366F1']}
            tintColor="#6366F1"
          />
        }
      >
        {/* Hero Section */}
        <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroTitle}>Your Portfolio</Text>
              <Text style={styles.heroSubtitle}>Showcase your best work</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Work Samples List */}
        <View style={styles.listContainer}>
          {workSamples.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="images-outline" size={48} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>No work samples yet</Text>
              <Text style={styles.emptyDesc}>Add images, videos, or documents of your past works to build your portfolio</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAddModal(true)}>
                <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.emptyBtnGrad}>
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.emptyBtnText}>Add Your First Sample</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            workSamples.map((sample, i) => (
              <WorkSampleCard key={i} sample={sample} index={i} />
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Work Sample Modal */}
      {showAddModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Work Sample</Text>
              <TouchableOpacity 
                onPress={() => { setShowAddModal(false); resetForm(); }}
                disabled={uploading}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.title}
                  onChangeText={t => setFormData(p => ({ ...p, title: t }))}
                  placeholder="e.g. Kitchen Renovation 2024"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={formData.description}
                  onChangeText={t => setFormData(p => ({ ...p, description: t }))}
                  placeholder="What did you do? Tools used? Results?"
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Project Link</Text>
                <TextInput
                  style={styles.input}
                  value={formData.link}
                  onChangeText={t => setFormData(p => ({ ...p, link: t }))}
                  placeholder="https://..."
                  placeholderTextColor="#94a3b8"
                  keyboardType="url"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Attachments</Text>
                <View style={styles.uploadBtns}>
                  <TouchableOpacity 
                    style={styles.uploadBtn} 
                    onPress={pickImages}
                    disabled={uploading}
                  >
                    <Ionicons name="camera" size={20} color="#6366F1" />
                    <Text style={styles.uploadBtnText}>Add Photos/Videos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.uploadBtn} 
                    onPress={pickFiles}
                    disabled={uploading}
                  >
                    <Ionicons name="document-attach" size={20} color="#6366F1" />
                    <Text style={styles.uploadBtnText}>Add Files</Text>
                  </TouchableOpacity>
                </View>

                {selectedFiles.length > 0 && (
                  <View style={styles.fileList}>
                    {selectedFiles.map((f, i) => (
                      <FilePreview key={i} file={f} index={i} />
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalAction, styles.cancel]}
                onPress={() => { setShowAddModal(false); resetForm(); }}
                disabled={uploading}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalAction, 
                  styles.submit,
                  (!formData.title.trim() || uploading) && styles.submitDisabled
                ]}
                onPress={handleAddWorkSample}
                disabled={uploading || !formData.title.trim()}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.submitText}>Add Sample</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Media Viewer */}
      <MediaViewer />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2D325D' },
  scrollContent: { flexGrow: 1, paddingBottom: 30 ,backgroundColor: '#f8fafc' },

  // Hero
  hero: { margin: 16, borderRadius: 20, padding: 20, elevation: 8, shadowColor: '#6366F1' },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  heroIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  heroSubtitle: { fontSize: 15, color: '#e0e7ff', marginTop: 4 },
  heroStats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 12, color: '#e0e7ff', marginTop: 4 },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 16 },

  // List
  listContainer: { paddingHorizontal: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  cardDesc: { fontSize: 14, color: '#64748b', marginTop: 6, lineHeight: 20 },
  linkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  linkText: { fontSize: 13, color: '#6366F1', marginLeft: 4 },

  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  mediaItem: {width: (width ) / 3, height: 110, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f1f5f9',margin: 8, },
  mediaThumb: { width: '100%', height: '100%' },
  videoItem: { position: 'relative' },
  playIcon: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -12 }, { translateY: -12 }], backgroundColor: 'rgba(0,0,0,0.6)', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  moreOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  moreText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  docsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  docsText: { fontSize: 13, color: '#6366F1', marginLeft: 6, fontWeight: '500' },

  // Empty
  empty: { alignItems: 'center', padding: 40 },
  emptyIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#e2e8f0', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: { borderRadius: 12, overflow: 'hidden' },
  emptyBtnGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, gap: 8 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Modal
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#fff', borderRadius: 20, maxHeight: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  modalTitle: { fontSize: 19, fontWeight: '700', color: '#1e293b' },
  modalBody: { paddingHorizontal: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: '#fff' },
  textarea: { height: 100, textAlignVertical: 'top' },
  uploadBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  uploadBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, backgroundColor: '#fff', gap: 8 },
  uploadBtnText: { fontSize: 14, color: '#6366F1', fontWeight: '600' },

  fileList: { marginTop: 16 },
  filePreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  filePreviewLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  previewThumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#e2e8f0' },
  videoThumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
  docThumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  fileName: { fontSize: 13, fontWeight: '500', color: '#374151', flex: 1, marginLeft: 10 },
  fileSize: { fontSize: 11, color: '#94a3b8', marginLeft: 10 },
  progressWrapper: { alignItems: 'center', width: 50 },
  progressBar: { height: 4, width: 36, backgroundColor: '#e2e8f0', borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', backgroundColor: '#10b981' },
  progressText: { fontSize: 10, color: '#64748b' },

  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderColor: '#f1f5f9' },
  modalAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, gap: 8 },
  cancel: { backgroundColor: '#f1f5f9' },
  cancelText: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  submit: { backgroundColor: '#6366F1' },
  submitText: { fontSize: 15, color: '#fff', fontWeight: '600' },

  // Viewer
  viewerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 1000 },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 25 },
  navBtn: { position: 'absolute', top: '50%', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 30 },
  navLeft: { left: 20 },
  navRight: { right: 20 },
  viewerContent: { flex: 1, justifyContent: 'center' },
  fullMedia: { width: '100%', height: '100%' },
  viewerFooter: { position: 'absolute', bottom: 60, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center' },
  viewerTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  viewerCounter: { color: '#e5e7eb', fontSize: 13, marginTop: 4 },

  // Buttons
  addBtn: { borderRadius: 12, overflow: 'hidden' },
  addGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  addText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  videoItem: {
  position: 'relative',
  width: '100%',
  height: '100%',
},
playOverlay: {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0,0,0,0.1)',
},
videoBadge: {
  position: 'absolute',
  top: 8,
  right: 8,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(0,0,0,0.7)',
  paddingHorizontal: 6,
  paddingVertical: 3,
  borderRadius: 10,
  gap: 4,
},
badgeText: {
  color: '#fff',
  fontSize: 9,
  fontWeight: '600',
},
docPreview: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  padding: 40,
},
docName: {
  color: '#fff',
  fontSize: 18,
  fontWeight: '600',
  marginTop: 16,
  textAlign: 'center',
},
docHint: {
  color: '#cbd5e1',
  fontSize: 14,
  marginTop: 8,
  textAlign: 'center',
},
openBtn: {
  flexDirection: 'row',
  backgroundColor: '#6366F1',
  paddingHorizontal: 24,
  paddingVertical: 12,
  borderRadius: 12,
  marginTop: 20,
  alignItems: 'center',
  gap: 8,
},
openText: {
  color: '#fff',
  fontWeight: '600',
},
viewerType: {
  color: '#94a3b8',
  fontSize: 12,
  marginTop: 4,
},
deleteModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    margin: 20,
  },
  deleteModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 8,
  },
  deleteModalText: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 22,
    marginBottom: 16,
  },
  samplePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  samplePreviewImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
  },
  samplePreviewText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  deleteModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  submitDisabled: {
    opacity: 0.6,
  },
   loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },


});

export default WorkSamplesScreen;