import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTaskerOnboarding } from '../../context/TaskerOnboardingContext';
import { serviceSkills } from '../../constants/commonSkills';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const SkillsScreen = () => {
  const {
    skills,
    primaryService,
    secondaryServices,
    allServices,
    servicesLoading,
    servicesError,
    updateSkills,
    updateServices,
    fetchAllServices,
    goToNextStep,
    goToPreviousStep,
    clearErrors,
  } = useTaskerOnboarding();

  const navigation = useNavigation();

  const [selectedPrimary, setSelectedPrimary] = useState(primaryService);
  const [selectedSecondary, setSelectedSecondary] = useState(secondaryServices || []);
  const [selectedSkills, setSelectedSkills] = useState(skills || []);
  
  // Modal states
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [skillSearch, setSkillSearch] = useState('');

  useEffect(() => {
    if (allServices.length === 0 && !servicesLoading) {
      fetchAllServices();
    }
  }, []);

  // Get skills for a specific service
  const getSkillsForService = (service) => {
    if (!service || !service.name) return [];
    
    // Try to find exact match
    let exactMatchSkills = serviceSkills[service.name] || [];
    
    // If no exact match, try partial match
    if (exactMatchSkills.length === 0) {
      const serviceName = service.name.toLowerCase();
      for (const [category, skillsList] of Object.entries(serviceSkills)) {
        if (serviceName.includes(category.toLowerCase()) || 
            category.toLowerCase().includes(serviceName)) {
          return skillsList;
        }
      }
    }
    
    return exactMatchSkills;
  };

  // Get recommended skills based on ALL selected services (primary + secondary)
  const getRecommendedSkills = useMemo(() => {
    const allServices = [selectedPrimary, ...selectedSecondary].filter(Boolean);
    if (allServices.length === 0) return [];
    
    const allRecommendedSkills = new Set();
    
    // Get skills from each service
    allServices.forEach(service => {
      const serviceSkillsList = getSkillsForService(service);
      serviceSkillsList.forEach(skill => allRecommendedSkills.add(skill));
    });
    
    // Add general skills if we have any services
    if (allRecommendedSkills.size === 0 && serviceSkills['General']) {
      serviceSkills['General'].forEach(skill => allRecommendedSkills.add(skill));
    }
    
    return Array.from(allRecommendedSkills);
  }, [selectedPrimary, selectedSecondary]);

  const filteredServices = allServices.filter(s =>
    s.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  // Get all available skills for searching
  const getAllSkills = () => {
    const allAvailableSkills = Object.values(serviceSkills).flat();
    return Array.from(new Set(allAvailableSkills));
  };

  const filteredSkills = () => {
    const searchTerm = skillSearch.toLowerCase();
    
    if (!searchTerm) {
      // When no search term, show recommended skills first, then selected skills
      const combinedSkills = [...getRecommendedSkills, ...selectedSkills];
      return Array.from(new Set(combinedSkills));
    }
    
    // When searching, filter all available skills
    const allSkills = getAllSkills();
    return allSkills.filter(skill => 
      skill.toLowerCase().includes(searchTerm)
    );
  };

  const selectPrimary = (service) => {
    setSelectedPrimary(service);
    setSelectedSecondary(prev => prev.filter(s => s.name !== service.name));
    clearErrors();
    setShowServiceModal(false);
    setServiceSearch('');
  };

  const toggleSecondary = (service) => {
    if (selectedPrimary?.name === service.name) return;
    
    const exists = selectedSecondary.some(s => s.name === service.name);
    if (exists) {
      setSelectedSecondary(prev => prev.filter(s => s.name !== service.name));
    } else if (selectedSecondary.length < 3) {
      setSelectedSecondary(prev => [...prev, service]);
      setShowServiceModal(false);
      setServiceSearch('');
    } else {
      Alert.alert('Limit Reached', 'You can select up to 3 additional services.');
    }
    clearErrors();
  };

  const toggleSkill = (skill) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(prev => prev.filter(s => s !== skill));
    } else {
      setSelectedSkills(prev => [...prev, skill]);
    }
  };

  const addCustomSkill = () => {
    const skill = skillSearch.trim();
    if (!skill || skill.length < 2) return;
    if (selectedSkills.some(s => s.toLowerCase() === skill.toLowerCase())) {
      Alert.alert('Already Added', 'This skill is already in your list.');
      return;
    }
    setSelectedSkills(prev => [...prev, skill]);
    setSkillSearch('');
  };

  const handleContinue = () => {
    if (!selectedPrimary) {
      Alert.alert('Required', 'Please select a primary service to continue.');
      return;
    }
    updateServices({ primaryService: selectedPrimary, secondaryServices: selectedSecondary });
    updateSkills(selectedSkills);
    if (goToNextStep()) {
      navigation.navigate('BasicInfo');
    }
  };

  const renderServiceItem = ({ item }) => {
    const isPrimary = selectedPrimary?.name === item.name;
    const isSecondary = selectedSecondary.some(s => s.name === item.name);
    
    return (
      <TouchableOpacity
        style={[
          styles.modalItem,
          isPrimary && styles.modalItemSelected,
          isSecondary && styles.modalItemSecondary,
        ]}
        onPress={() => {
          if (!selectedPrimary) {
            selectPrimary(item);
          } else if (isPrimary) {
            // Allow deselecting primary
            setSelectedPrimary(null);
          } else {
            toggleSecondary(item);
          }
        }}
      >
        <View style={styles.modalItemContent}>
          <Text style={[styles.modalItemText, (isPrimary || isSecondary) && styles.modalItemTextSelected]}>
            {item.name}
          </Text>
          {item.description && (
            <Text style={styles.modalItemDesc} numberOfLines={1}>
              {item.description}
            </Text>
          )}
        </View>
        {isPrimary && <Ionicons name="star" size={20} color="#FF9500" />}
        {isSecondary && <Ionicons name="checkmark-circle" size={20} color="#007AFF" />}
      </TouchableOpacity>
    );
  };

  const renderSkillItem = ({ item }) => {
    const isSelected = selectedSkills.includes(item);
    const isRecommended = getRecommendedSkills.includes(item) && (selectedPrimary || selectedSecondary.length > 0);
    
    return (
      <TouchableOpacity
        style={[
          styles.modalItem,
          isSelected && styles.modalItemSelected,
          isRecommended && !isSelected && styles.recommendedSkill,
        ]}
        onPress={() => toggleSkill(item)}
      >
        <View style={styles.skillItemContent}>
          <Text style={[
            styles.modalItemText, 
            isSelected && styles.modalItemTextSelected,
            isRecommended && styles.recommendedSkillText
          ]}>
            {item}
          </Text>
          {isRecommended && !isSelected && (
            <View style={styles.recommendedBadge}>
              <Ionicons name="sparkles" size={14} color="#FF9500" />
              <Text style={styles.recommendedBadgeText}>Recommended</Text>
            </View>
          )}
        </View>
        {isSelected && <Ionicons name="checkmark-circle" size={20} color="#007AFF" />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Set Up Your Services</Text>
          <Text style={styles.subtitle}>
            Choose what you'll offer to clients on our platform
          </Text>
        </View>

        {/* Recommended Skills Section (scrollable like before) */}
        {(selectedPrimary || selectedSecondary.length > 0) && getRecommendedSkills.length > 0 && (
          <View style={styles.recommendedSection}>
            <View style={styles.recommendedHeader}>
              <View style={styles.recommendedIcon}>
                <Ionicons name="sparkles" size={18} color="#FF9500" />
              </View>
              <View style={styles.recommendedTextContainer}>
                <Text style={styles.recommendedTitle}>Recommended Skills</Text>
                <Text style={styles.recommendedSubtitle}>
                  {selectedPrimary && selectedSecondary.length > 0 
                    ? `Based on your ${selectedSecondary.length + 1} selected services`
                    : selectedPrimary
                    ? `Based on your primary service: ${selectedPrimary.name}`
                    : 'Based on your services'}
                </Text>
              </View>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.recommendedSkillsScroll}
              contentContainerStyle={styles.recommendedSkillsContent}
            >
              {getRecommendedSkills.slice(0, 10).map((skill, index) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <TouchableOpacity
                    key={`recommended-${index}`}
                    style={[
                      styles.recommendedSkillChip,
                      isSelected && styles.recommendedSkillChipSelected
                    ]}
                    onPress={() => toggleSkill(skill)}
                  >
                    <Text style={[
                      styles.recommendedSkillChipText,
                      isSelected && styles.recommendedSkillChipTextSelected
                    ]}>
                      {skill}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color="#007AFF" style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            {getRecommendedSkills.length > 10 && (
              <TouchableOpacity 
                style={styles.viewMoreButton}
                onPress={() => setShowSkillModal(true)}
              >
                <Text style={styles.viewMoreText}>View all {getRecommendedSkills.length} skills</Text>
                <Ionicons name="chevron-forward" size={16} color="#007AFF" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Primary Service Selector */}
        <View style={styles.section}>
          <Text style={styles.label}>Primary Service *</Text>
          <Text style={styles.cardSubtitle}>Your main offering</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowServiceModal(true)}
          >
            <View style={styles.selectorContent}>
              {selectedPrimary ? (
                <>
                  <Ionicons name="star" size={20} color="#FF9500" />
                  <Text style={styles.selectorTextFilled}>{selectedPrimary.name}</Text>
                </>
              ) : (
                <Text style={styles.selectorTextPlaceholder}>Select your primary service</Text>
              )}
            </View>
            <Ionicons name="chevron-down" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Additional Services Selector */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Additional Services ({selectedSecondary.length}/3)
          </Text>
          <Text style={styles.cardSubtitle}>Extra services you can offer</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowServiceModal(true)}
          >
            <View style={styles.selectorContent}>
              {selectedSecondary.length > 0 ? (
                <View style={styles.chipsRow}>
                  {selectedSecondary.map(s => (
                    <View key={s.name} style={styles.miniChip}>
                      <Text style={styles.miniChipText}>{s.name}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.selectorTextPlaceholder}>Add additional services (optional)</Text>
              )}
            </View>
            <Ionicons name="chevron-down" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Skills Selector */}
        <View style={styles.section}>
          <View style={styles.skillsHeader}>
            <View>
              <Text style={styles.label}>Skills</Text>
              <Text style={styles.cardSubtitle}>Keywords for your profile</Text>
            </View>
            {selectedPrimary && (
              <TouchableOpacity 
                style={styles.addSkillsButton}
                onPress={() => setShowSkillModal(true)}
              >
                <Ionicons name="add-circle" size={20} color="#007AFF" />
                <Text style={styles.addSkillsText}>Add Skills</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {selectedSkills.length > 0 ? (
            <View style={styles.selectedSkillsContainer}>
              <View style={styles.selectedSkillsHeader}>
                <Text style={styles.selectedSkillsTitle}>
                  Your Skills ({selectedSkills.length})
                </Text>
                <TouchableOpacity onPress={() => setSelectedSkills([])}>
                  <Text style={styles.clearSkillsText}>Clear All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.chipsRow}>
                {selectedSkills.map(skill => (
                  <View key={skill} style={styles.selectedSkillChip}>
                    <Text style={styles.selectedSkillChipText}>{skill}</Text>
                    <TouchableOpacity 
                      style={styles.removeSkillButton}
                      onPress={() => toggleSkill(skill)}
                    >
                      <Ionicons name="close" size={14} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.selector, !selectedPrimary && styles.selectorDisabled]}
              onPress={() => {
                if (selectedPrimary) {
                  setShowSkillModal(true);
                }
              }}
              disabled={!selectedPrimary}
            >
              <View style={styles.selectorContent}>
                <Text style={[
                  styles.selectorTextPlaceholder,
                  !selectedPrimary && styles.selectorTextPlaceholderDisabled
                ]}>
                  {selectedPrimary ? 'Tap to add skills' : 'Select a primary service first'}
                </Text>
              </View>
              {selectedPrimary && <Ionicons name="chevron-down" size={24} color="#666" />}
            </TouchableOpacity>
          )}
          
          {selectedPrimary && selectedSkills.length === 0 && (
            <Text style={styles.skillsHint}>
              Adding skills helps clients find you when searching for specific expertise
            </Text>
          )}
        </View>
        
        {/* Spacer for footer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueBtn, !selectedPrimary && styles.disabledBtn]}
          onPress={handleContinue}
          disabled={!selectedPrimary}
        >
          <Text style={styles.continueText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Services Modal */}
      <Modal
        visible={showServiceModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowServiceModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Select Services</Text>
              <Text style={styles.modalSubtitle}>
                {!selectedPrimary 
                  ? "Choose your primary service first" 
                  : `Add up to 3 additional services (${selectedSecondary.length}/3 selected)`}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowServiceModal(false)}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#888" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search services..."
              value={serviceSearch}
              onChangeText={setServiceSearch}
              autoFocus
            />
          </View>

          {servicesLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : servicesError ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>Failed to load services</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchAllServices}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredServices}
              renderItem={renderServiceItem}
              keyExtractor={(item, index) => item.name + index}
              contentContainerStyle={styles.modalList}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Skills Modal */}
      <Modal
        visible={showSkillModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSkillModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Add Skills</Text>
              <Text style={styles.modalSubtitle}>
                {(selectedPrimary || selectedSecondary.length > 0)
                  ? `Skills for your ${selectedSecondary.length + (selectedPrimary ? 1 : 0)} selected services`
                  : 'Add skills to describe your expertise'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowSkillModal(false)}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#888" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search or add custom skill..."
              value={skillSearch}
              onChangeText={setSkillSearch}
              autoFocus
            />
            {skillSearch.trim() && (
              <TouchableOpacity onPress={addCustomSkill} style={styles.addBtn}>
                <Ionicons name="add-circle" size={24} color="#007AFF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Simple recommended section in modal (scrollable by FlatList) */}
          {(selectedPrimary || selectedSecondary.length > 0) && getRecommendedSkills.length > 0 && !skillSearch.trim() && (
            <View style={styles.modalRecommendedSection}>
              <View style={styles.modalRecommendedHeader}>
                <Ionicons name="sparkles" size={16} color="#FF9500" />
                <Text style={styles.modalRecommendedTitle}>Recommended Skills</Text>
              </View>
              <Text style={styles.modalRecommendedText}>
                Based on your selected services
              </Text>
            </View>
          )}

          <FlatList
            data={filteredSkills()}
            renderItem={renderSkillItem}
            keyExtractor={(item, index) => item + index}
            contentContainerStyle={styles.modalList}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = {
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB' 
  },
  content: { 
    flex: 1, 
    padding: 20 
  },
  header: { 
    marginBottom: 24, 
    alignItems: 'center' 
  },
  cardSubtitle: { 
    fontSize: 14, 
    color: '#8E8E93',
    marginBottom: 8,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    marginBottom: 8, 
    textAlign: 'center' 
  },
  subtitle: { 
    fontSize: 16, 
    color: '#666', 
    textAlign: 'center' 
  },

  // Recommended Skills Section (NOW SCROLLABLE)
  recommendedSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E4E6EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  recommendedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  recommendedIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFF4E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recommendedTextContainer: {
    flex: 1,
  },
  recommendedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1E21',
    marginBottom: 4,
  },
  recommendedSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  recommendedSkillsScroll: {
    flexGrow: 0,
  },
  recommendedSkillsContent: {
    paddingRight: 20,
  },
  recommendedSkillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#B3D4FC',
    marginRight: 8,
    marginBottom: 8,
  },
  recommendedSkillChipSelected: {
    backgroundColor: '#E6F0FA',
    borderColor: '#007AFF',
  },
  recommendedSkillChipText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginRight: 6,
  },
  recommendedSkillChipTextSelected: {
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 2,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  viewMoreText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },

  // Sections
  section: { 
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  skillsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  addSkillsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addSkillsText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  label: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1C1E21' 
  },
  
  // Selected Skills
  selectedSkillsContainer: {
    marginTop: 8,
  },
  selectedSkillsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedSkillsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1E21',
  },
  clearSkillsText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },
  selectedSkillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F0FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#B3D4FC',
    marginBottom: 8,
  },
  selectedSkillChipText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginRight: 6,
  },
  removeSkillButton: {
    padding: 2,
  },
  
  // Selectors
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E4E6EA',
    minHeight: 60,
  },
  selectorDisabled: {
    opacity: 0.6,
  },
  selectorContent: { 
    flex: 1, 
    marginRight: 12 
  },
  selectorTextPlaceholder: { 
    fontSize: 16, 
    color: '#8E8E93',
    fontWeight: '500',
  },
  selectorTextPlaceholderDisabled: {
    color: '#C7C7CC',
  },
  selectorTextFilled: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1C1E21', 
    marginLeft: 8 
  },
  
  // Skills Hint
  skillsHint: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 12,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  
  // Chips Row
  chipsRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8 
  },
  miniChip: {
    backgroundColor: '#E6F0FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  miniChipText: { 
    fontSize: 14, 
    color: '#007AFF', 
    fontWeight: '500' 
  },
  
  // Bottom Spacer
  bottomSpacer: {
    height: 40,
  },
  
  // Footer
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderColor: '#EEE',
  },
  continueBtn: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 12,
  },
  disabledBtn: { 
    backgroundColor: '#CCC' 
  },
  continueText: { 
    color: '#FFF', 
    fontSize: 18, 
    fontWeight: '700', 
    marginRight: 8 
  },

  // Modal Styles
  modalContainer: { 
    flex: 1, 
    backgroundColor: '#FFF' 
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#EEE',
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalRecommendedSection: {
    backgroundColor: '#F2F8FF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  modalRecommendedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modalRecommendedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1E21',
  },
  modalRecommendedText: {
    fontSize: 14,
    color: '#007AFF',
    lineHeight: 20,
  },
  
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    margin: 20,
    marginBottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: { 
    flex: 1, 
    marginLeft: 12, 
    fontSize: 16 
  },
  addBtn: { 
    marginLeft: 8 
  },

  modalList: { 
    padding: 20,
    paddingBottom: 40,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    marginBottom: 12,
  },
  modalItemSelected: {
    backgroundColor: '#E6F0FA',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  modalItemSecondary: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  recommendedSkill: {
    backgroundColor: '#FFF4E5',
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  skillItemContent: {
    flex: 1,
    marginRight: 12,
  },
  modalItemText: { 
    fontSize: 17, 
    fontWeight: '500', 
    color: '#000' 
  },
  modalItemTextSelected: { 
    fontWeight: '700', 
    color: '#007AFF' 
  },
  recommendedSkillText: {
    color: '#FF9500',
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  recommendedBadgeText: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '500',
  },
  modalItemDesc: { 
    fontSize: 14, 
    color: '#666', 
    marginTop: 4 
  },

  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  errorText: { 
    fontSize: 16, 
    color: '#FF3B30', 
    marginBottom: 16 
  },
  retryBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: { 
    color: '#FFF', 
    fontWeight: '600' 
  },
};

export default SkillsScreen;