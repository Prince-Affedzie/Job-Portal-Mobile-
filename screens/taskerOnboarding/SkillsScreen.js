import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  
  Keyboard,
} from 'react-native';
import { useTaskerOnboarding } from '../../context/TaskerOnboardingContext';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {ALL_SKILLS} from '../../data/taskerOnboardingData';

const SkillsScreen = () => {
  const { 
    skills, 
    updateSkills, 
    goToNextStep, 
    goToPreviousStep,
    errors,
    clearErrors 
  } = useTaskerOnboarding();
  
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);
  const searchInputRef = useRef(null);

  const [selectedSkills, setSelectedSkills] = useState(skills || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filter skills based on search query
  const filteredSkills = ALL_SKILLS.filter(skill =>
    skill.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if search query matches exactly any existing skill
  const exactMatch = ALL_SKILLS.find(skill => 
    skill.toLowerCase() === searchQuery.toLowerCase().trim()
  );

  // Check if we should show "Add skill" option
  const shouldShowAddOption = searchQuery.trim().length > 0 && !exactMatch;

  const toggleSkill = (skill) => {
    let newSkills;
    if (selectedSkills.includes(skill)) {
      newSkills = selectedSkills.filter(s => s !== skill);
    } else {
      newSkills = [...selectedSkills, skill];
    }
    
    setSelectedSkills(newSkills);
    setSearchQuery(''); // Clear search after selection
    setShowSuggestions(false);
    
    // Dismiss keyboard after selection
    Keyboard.dismiss();
    
    if (errors.skills) {
      clearErrors();
    }
  };

  const addCustomSkill = () => {
    const customSkill = searchQuery.trim();
    if (customSkill.length === 0) return;

    // Check if skill already exists (case insensitive)
    const alreadyExists = selectedSkills.some(skill => 
      skill.toLowerCase() === customSkill.toLowerCase()
    );

    if (alreadyExists) {
      Alert.alert('Skill Exists', 'This skill is already in your list.');
      return;
    }

    if (customSkill.length < 2) {
      Alert.alert('Invalid Skill', 'Skill name should be at least 2 characters long.');
      return;
    }

    if (customSkill.length > 50) {
      Alert.alert('Too Long', 'Skill name should be less than 50 characters.');
      return;
    }

    const newSkills = [...selectedSkills, customSkill];
    setSelectedSkills(newSkills);
    setSearchQuery('');
    setShowSuggestions(false);
    
    // Dismiss keyboard after adding custom skill
    Keyboard.dismiss();
  };

  const removeSkill = (skillToRemove) => {
    const newSkills = selectedSkills.filter(skill => skill !== skillToRemove);
    setSelectedSkills(newSkills);
  };

  const handleSubmit = () => {
    updateSkills(selectedSkills);
    
    if (goToNextStep()) {
      navigation.navigate('ProfileImage');
    }
  };

  const handleBack = () => {
    updateSkills(selectedSkills);
    goToPreviousStep();
    navigation.goBack();
  };

  const isFormValid = selectedSkills.length > 0;

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    setShowSuggestions(text.length > 0);
  };

  const handleSearchFocus = () => {
    setShowSuggestions(searchQuery.length > 0);
    // Scroll to search section when focused
    setTimeout(() => {
      if (scrollViewRef.current && searchInputRef.current) {
        scrollViewRef.current.scrollTo({ y: 200, animated: true });
      }
    }, 100);
  };

  const PopularSkills = () => (
    <View style={styles.popularSection}>
      <Text style={styles.sectionTitle}>Popular Skills</Text>
      <View style={styles.popularSkillsGrid}>
        {POPULAR_SKILLS.map((skill) => {
          const isSelected = selectedSkills.includes(skill);
          return (
            <TouchableOpacity
              key={skill}
              style={[styles.popularSkillChip, isSelected && styles.popularSkillChipSelected]}
              onPress={() => toggleSkill(skill)}
              activeOpacity={0.7}
            >
              <Text style={[styles.popularSkillText, isSelected && styles.popularSkillTextSelected]}>
                {skill}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark" size={14} color="#1877F2" style={styles.checkIcon} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // Render suggestions as a FlatList for better performance and scrolling
  const renderSuggestion = ({ item: skill, index }) => (
    <TouchableOpacity
      style={[
        styles.suggestionItem,
        index === filteredSkills.slice(0, 6).length - 1 && styles.suggestionItemLast
      ]}
      onPress={() => toggleSkill(skill)}
      activeOpacity={0.7}
    >
      <Ionicons 
        name={selectedSkills.includes(skill) ? "checkmark-circle" : "add-circle-outline"} 
        size={20} 
        color={selectedSkills.includes(skill) ? "#1877F2" : "#65676B"} 
      />
      <Text style={[
        styles.suggestionText,
        selectedSkills.includes(skill) && styles.suggestionTextSelected
      ]}>
        {skill}
      </Text>
      {selectedSkills.includes(skill) && (
        <Text style={styles.addedText}>Added</Text>
      )}
    </TouchableOpacity>
  );

  const SuggestionsComponent = () => {
    if (!showSuggestions) return null;

    return (
      <View style={styles.suggestionsContainer}>
        {filteredSkills.length > 0 ? (
          <FlatList
            data={filteredSkills.slice(0, 6)}
            renderItem={renderSuggestion}
            keyExtractor={(item, index) => `suggestion-${item}-${index}`}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.suggestionsList}
          />
        ) : shouldShowAddOption ? (
          <TouchableOpacity
            style={styles.addCustomSkill}
            onPress={addCustomSkill}
            activeOpacity={0.7}
          >
            <View style={styles.addCustomIcon}>
              <Ionicons name="add" size={18} color="#1877F2" />
            </View>
            <View style={styles.addCustomContent}>
              <Text style={styles.addCustomMain}>Add "{searchQuery.trim()}"</Text>
              <Text style={styles.addCustomSub}>Create a custom skill</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.noResults}>
            <Ionicons name="search" size={24} color="#8A8D91" />
            <Text style={styles.noResultsText}>No skills found</Text>
            <Text style={styles.noResultsSubtext}>Try a different search term</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Header Section */}
          <View style={styles.header}>
            <Text style={styles.title}>What services do you offer?</Text>
            <Text style={styles.subtitle}>
              Add your skills and expertise. Most professionals showcase 5-10 key skills to attract the right clients.
            </Text>
          </View>

          {/* Selected Skills Section */}
          {selectedSkills.length > 0 && (
            <View style={styles.selectedSection}>
              <View style={styles.selectedHeader}>
                <Text style={styles.selectedTitle}>Selected Skills</Text>
                <View style={styles.selectedCount}>
                  <Text style={styles.selectedCountText}>{selectedSkills.length}</Text>
                </View>
              </View>
              <View style={styles.selectedSkillsContainer}>
                {selectedSkills.map((skill, index) => (
                  <View key={`${skill}-${index}`} style={styles.selectedSkill}>
                    <Text style={styles.selectedSkillText} numberOfLines={1}>{skill}</Text>
                    <TouchableOpacity 
                      onPress={() => removeSkill(skill)}
                      style={styles.removeButton}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close" size={16} color="#65676B" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Search Section */}
          <View style={styles.searchSection}>
            <View style={[
              styles.searchContainer,
              showSuggestions && styles.searchContainerActive,
              errors.skills && styles.searchContainerError
            ]}>
              <Ionicons name="search" size={20} color="#65676B" style={styles.searchIcon} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search skills or add your own..."
                placeholderTextColor="#8A8D91"
                value={searchQuery}
                onChangeText={handleSearchChange}
                onFocus={handleSearchFocus}
                returnKeyType="search"
                autoCorrect={false}
                blurOnSubmit={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => {
                    setSearchQuery('');
                    setShowSuggestions(false);
                    Keyboard.dismiss();
                  }}
                  style={styles.clearButton}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={20} color="#8A8D91" />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Suggestions */}
            <SuggestionsComponent />
          </View>

          {/* Popular Skills Section - Hide when searching */}
          {!showSuggestions && <PopularSkills />}

          {/* Tips Section - Hide when searching */}
          {!showSuggestions && (
            <View style={styles.tipsSection}>
              <View style={styles.tipItem}>
                <Ionicons name="bulb-outline" size={20} color="#1877F2" />
                <Text style={styles.tipText}>
                  Choose skills that best represent your expertise and services you're confident providing.
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="people-outline" size={20} color="#1877F2" />
                <Text style={styles.tipText}>
                  Clients search by skills, so pick relevant ones that match common service requests.
                </Text>
              </View>
            </View>
          )}

          {/* Error Message */}
          {errors.skills && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#E41E3F" />
              <Text style={styles.errorText}>{errors.skills}</Text>
            </View>
          )}

          {/* Add extra space when suggestions are showing to ensure they're visible above keyboard */}
          {showSuggestions && <View style={styles.keyboardSpacer} />}
        </ScrollView>

        {/* Fixed Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={20} color="#65676B" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.continueButton,
              !isFormValid && styles.continueButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.continueButtonText,
              !isFormValid && styles.continueButtonTextDisabled
            ]}>
              Continue
            </Text>
            {selectedSkills.length > 0 && (
              <View style={styles.skillsBadge}>
                <Text style={styles.skillsBadgeText}>{selectedSkills.length}</Text>
              </View>
            )}
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={isFormValid ? "#FFFFFF" : "#8A8D91"} 
              style={styles.continueIcon}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Popular skills to help users get started
const POPULAR_SKILLS = [
  'Plumbing',
  'Electrical Repairs', 
  'Carpentry',
  'Painting',
  'Cleaning Services',
  'Laundry & Ironing',
  'Gardening',
  'Moving & Packing',
  'Home Appliance Repair',
  'AC Installation & Repair',
  'Cooking & Catering',
  'Tutoring',
];

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for fixed footer
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1E21',
    marginBottom: 12,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: '#65676B',
    lineHeight: 24,
  },
  selectedSection: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E6EA',
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1E21',
  },
  selectedCount: {
    backgroundColor: '#1877F2',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectedSkillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedSkill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1877F2',
    maxWidth: '100%',
  },
  selectedSkillText: {
    fontSize: 14,
    color: '#1877F2',
    fontWeight: '500',
    marginRight: 8,
    flexShrink: 1,
  },
  removeButton: {
    padding: 2,
  },
  searchSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
    zIndex: 1000, // Ensure suggestions appear above other content
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E6EA',
    paddingHorizontal: 16,
    paddingVertical: 14,
    position: 'relative',
  },
  searchContainerActive: {
    borderColor: '#1877F2',
    shadowColor: '#1877F2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchContainerError: {
    borderColor: '#E41E3F',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1E21',
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 12,
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E4E6EA',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: 250, // Reduced height to fit better with keyboard
    overflow: 'hidden',
  },
  suggestionsList: {
    maxHeight: 250,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionText: {
    flex: 1,
    fontSize: 16,
    color: '#1C1E21',
    marginLeft: 12,
  },
  suggestionTextSelected: {
    color: '#1877F2',
    fontWeight: '500',
  },
  addedText: {
    fontSize: 12,
    color: '#42B883',
    fontWeight: '500',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addCustomSkill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  addCustomIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCustomContent: {
    marginLeft: 12,
    flex: 1,
  },
  addCustomMain: {
    fontSize: 16,
    color: '#1877F2',
    fontWeight: '500',
  },
  addCustomSub: {
    fontSize: 14,
    color: '#65676B',
    marginTop: 2,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  noResultsText: {
    fontSize: 16,
    color: '#65676B',
    fontWeight: '500',
    marginTop: 12,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#8A8D91',
    marginTop: 4,
  },
  popularSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1E21',
    marginBottom: 16,
  },
  popularSkillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularSkillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E4E6EA',
  },
  popularSkillChipSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1877F2',
  },
  popularSkillText: {
    fontSize: 14,
    color: '#65676B',
    fontWeight: '500',
  },
  popularSkillTextSelected: {
    color: '#1877F2',
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 6,
  },
  tipsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tipText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#65676B',
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FDEBEE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F8BBD0',
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#E41E3F',
  },
  keyboardSpacer: {
    height: 300, // Extra space when suggestions are showing
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4E6EA',
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E6EA',
    flex: 0.4,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#65676B',
    marginLeft: 4,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#1877F2',
    borderRadius: 12,
    flex: 0.6,
    shadowColor: '#1877F2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonDisabled: {
    backgroundColor: '#E4E6EA',
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  continueButtonTextDisabled: {
    color: '#8A8D91',
  },
  skillsBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginHorizontal: 8,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillsBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  continueIcon: {
    marginLeft: 4,
  },
};

export default SkillsScreen;