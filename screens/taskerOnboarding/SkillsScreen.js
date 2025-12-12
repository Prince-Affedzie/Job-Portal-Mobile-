// SkillsScreen.js - FIXED TOUCH HANDLING FOR SKILL SELECTION
import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  Keyboard,
  ScrollView,
  Dimensions,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTaskerOnboarding } from '../../context/TaskerOnboardingContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

const CATEGORIES = [
  {
    id: 'digital-tech',
    title: 'Digital & Tech',
    icon: 'laptop-outline',
    color: '#1976D2',
    bg: '#E3F2FD',
    skills: [
      'Software Engineering', 'Web Development', 'Mobile App Development',
      'UI/UX Design', 'Graphic Design', 'Video Editing', 'Photo Editing',
      'Digital Marketing', 'SEO/SEM', 'Social Media Management', 'Data Analysis',
      'AI/ML', 'Cybersecurity', 'Network Administration', 'IT Support',
      'Cloud Computing', 'Blockchain', 'Game Development'
    ]
  },
  {
    id: 'creative-design',
    title: 'Creative & Design',
    icon: 'brush-outline',
    color: '#7B1FA2',
    bg: '#F3E5F5',
    skills: [
      'Logo Design', 'Brand Identity', 'Interior Decor', 'Interior Design',
      'Architectural Design', '3D Modeling', 'Animation', 'Motion Graphics',
      'Video Production', 'Photography', 'Illustration', 'Fashion Design',
      'Jewelry Design', 'Product Design', 'Industrial Design', 'Art Direction',
      'Creative Writing'
    ]
  },
  {
    id: 'home-professional',
    title: 'Home & Professional',
    icon: 'home-outline',
    color: '#388E3C',
    bg: '#E8F5E9',
    skills: [
      'Plumbing', 'Electrical Repairs', 'Carpentry', 'Painting',
      'Cleaning Services', 'Gardening', 'Landscaping', 'Moving & Packing',
      'Home Appliance Repair', 'HVAC Installation', 'CCTV Installation',
      'Home Security', 'Smart Home Setup', 'Home Renovation', 'Roofing',
      'Masonry', 'Flooring Installation', 'Window Installation',
      'Event Planning', 'Catering', 'Personal Training', 'Tutoring',
      'Language Translation', 'Virtual Assistance', 'Accounting', 'Legal Services'
    ]
  }
];

const ALL_SKILLS = CATEGORIES.flatMap(category => category.skills).sort();

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

  const [selectedSkills, setSelectedSkills] = useState(skills || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);

  // Filter skills based on search query
  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return ALL_SKILLS.filter(skill =>
      skill.toLowerCase().includes(searchQuery.toLowerCase().trim())
    ).slice(0, 8);
  }, [searchQuery]);

  const shouldShowAddOption = searchQuery.trim().length > 0 && 
    !ALL_SKILLS.some(skill => 
      skill.toLowerCase() === searchQuery.toLowerCase().trim()
    );

  // ================== SKILL HANDLERS ==================
  const toggleSkill = (skill) => {
    const newSkills = selectedSkills.includes(skill)
      ? selectedSkills.filter(s => s !== skill)
      : [...selectedSkills, skill];
    
    setSelectedSkills(newSkills);
    if (!selectedSkills.includes(skill)) {
      setSearchQuery('');
      setShowSuggestions(false);
    }
    Keyboard.dismiss();
    
    if (errors.skills) clearErrors();
  };

  const addCustomSkill = () => {
    const customSkill = searchQuery.trim();
    if (!customSkill) return;

    if (selectedSkills.some(skill => 
      skill.toLowerCase() === customSkill.toLowerCase())) {
      Alert.alert('Already Added', 'This skill is already in your list.');
      return;
    }

    if (customSkill.length < 2) {
      Alert.alert('Too Short', 'Skill must be at least 2 characters.');
      return;
    }

    if (customSkill.length > 50) {
      Alert.alert('Too Long', 'Skill must be less than 50 characters.');
      return;
    }

    const newSkills = [...selectedSkills, customSkill];
    setSelectedSkills(newSkills);
    setSearchQuery('');
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  const removeSkill = (skillToRemove) => {
    setSelectedSkills(selectedSkills.filter(skill => skill !== skillToRemove));
  };

  const toggleCategory = (categoryId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const handleSubmit = () => {
    if (selectedSkills.length === 0) {
      Alert.alert('Required', 'Please add at least one skill to continue.');
      return;
    }
    updateSkills(selectedSkills);
    if (goToNextStep()) navigation.navigate('ProfileImage');
  };

  const handleBack = () => {
    updateSkills(selectedSkills);
    goToPreviousStep();
    navigation.goBack();
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    setShowSuggestions(text.trim().length > 0);
  };

  // ================== RENDER COMPONENTS ==================
  const renderSkillChip = (skill) => (
    <TouchableOpacity
      key={`chip-${skill}`}
      style={[
        styles.skillChip,
        selectedSkills.includes(skill) && styles.skillChipSelected
      ]}
      onPress={() => toggleSkill(skill)}
      activeOpacity={0.7}
      // These props prevent the ScrollView from capturing the tap
      onStartShouldSetResponder={() => true}
      onResponderTerminationRequest={() => true}
    >
      <Text style={[
        styles.skillChipText,
        selectedSkills.includes(skill) && styles.skillChipTextSelected
      ]} numberOfLines={1}>
        {skill}
      </Text>
      {selectedSkills.includes(skill) && (
        <Ionicons name="checkmark" size={16} color="#007AFF" style={styles.checkIcon} />
      )}
    </TouchableOpacity>
  );

  const renderSuggestionItem = (skill, index) => (
    <TouchableOpacity
      key={`suggestion-${skill}-${index}`}
      style={styles.suggestionItem}
      onPress={() => toggleSkill(skill)}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.suggestionText,
        selectedSkills.includes(skill) && styles.suggestionTextSelected
      ]}>
        {skill}
      </Text>
      <Ionicons 
        name={selectedSkills.includes(skill) ? "checkmark-circle" : "add-circle-outline"} 
        size={24} 
        color={selectedSkills.includes(skill) ? "#007AFF" : "#65676B"} 
      />
    </TouchableOpacity>
  );

  const renderCategoryDropdown = (category) => {
    const isExpanded = expandedCategory === category.id;

    return (
      <View style={styles.categoryDropdown} key={category.id}>
        <TouchableOpacity
          style={[
            styles.categoryHeader,
            isExpanded && styles.categoryHeaderExpanded,
          ]}
          onPress={() => toggleCategory(category.id)}
          activeOpacity={0.7}
        >
          <View style={styles.categoryHeaderLeft}>
            <View style={[styles.categoryIcon, { backgroundColor: category.bg }]}>
              <Ionicons name={category.icon} size={20} color={category.color} />
            </View>
            <View style={styles.categoryInfo}>
              <Text style={styles.categoryTitleText}>{category.title}</Text>
              <Text style={styles.categorySkillCount}>
                {category.skills.length} skills
              </Text>
            </View>
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#8E8E93"
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalSkillsContainer}
              style={styles.horizontalScrollView}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              // CRITICAL: These props allow taps to work
              keyboardShouldPersistTaps="handled"
              // Don't capture taps - let child components handle them
              onStartShouldSetResponder={() => false}
              onMoveShouldSetResponder={() => false}
            >
              {category.skills.map((skill) => renderSkillChip(skill))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  // ================== MAIN SCREEN RENDER ==================
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* FIXED HEADER */}
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Skills & Expertise</Text>
          <Text style={styles.subtitle}>
            Showcase what you're great at
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* MAIN CONTENT */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        bounces={true}
        scrollEnabled={true}
        nestedScrollEnabled={true}
      >
        {/* SEARCH SECTION */}
        <View style={styles.searchSection}>
          <View style={[
            styles.searchContainer,
            showSuggestions && styles.searchContainerActive
          ]}>
            <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search or add custom skill..."
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>

          {/* SUGGESTIONS */}
          {showSuggestions && (
            <View style={styles.suggestionsContainer}>
              {filteredSkills.length > 0 ? (
                <View style={styles.suggestionsList}>
                  {filteredSkills.map((skill, index) =>
                    renderSuggestionItem(skill, index)
                  )}
                </View>
              ) : shouldShowAddOption ? (
                <TouchableOpacity
                  style={styles.addCustomSkill}
                  onPress={addCustomSkill}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addCustomText}>
                    <Ionicons name="add-circle" size={18} color="#007AFF" /> 
                    {' '}Add "{searchQuery.trim()}"
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.noResults}>
                  <Ionicons name="search-outline" size={24} color="#C7C7CC" />
                  <Text style={styles.noResultsText}>No matching skills found</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* SELECTED SKILLS */}
        {selectedSkills.length > 0 && (
          <View style={styles.selectedSection}>
            <View style={styles.selectedHeader}>
              <Text style={styles.sectionTitle}>Your Selected Skills</Text>
              <Text style={styles.skillCount}>{selectedSkills.length} added</Text>
            </View>
            <View style={styles.selectedSkillsGrid}>
              {selectedSkills.map(skill => (
                <View key={`selected-${skill}`} style={styles.selectedSkillChip}>
                  <Text style={styles.selectedSkillText} numberOfLines={1}>
                    {skill}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => removeSkill(skill)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="close" size={16} color="#8E8E93" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* CATEGORIES DROPDOWN */}
        {!showSuggestions && (
          <View style={styles.categoriesContainer}>
            <View style={styles.categoriesHeader}>
              <Text style={styles.categoriesTitle}>Browse Popular Categories</Text>
              <Text style={styles.categoriesSubtitle}>
                Tap on a category to view available skills
              </Text>
            </View>
            
            {/* CATEGORY DROPDOWNS */}
            {CATEGORIES.map(category => renderCategoryDropdown(category))}
            
            {/* EXTRA SPACE FOR BETTER VISUAL APPEARANCE */}
            <View style={styles.categoriesSpacer} />
          </View>
        )}
      </ScrollView>

      {/* FIXED CONTINUE BUTTON */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            selectedSkills.length === 0 && styles.continueButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={selectedSkills.length === 0}
          activeOpacity={0.8}
        >
          <View style={styles.continueButtonContent}>
            <Text style={styles.continueButtonText}>
              Continue to Next Step
            </Text>
            {selectedSkills.length > 0 && (
              <View style={styles.skillCounter}>
                <Text style={styles.skillCounterText}>{selectedSkills.length}</Text>
              </View>
            )}
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.continueIcon} />
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ================== STYLES ==================
const styles = {
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1E21',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#65676B',
  },
  // SCROLL VIEW
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 160,
  },
  // SEARCH SECTION
  searchSection: {
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E6EA',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchContainerActive: {
    borderColor: '#007AFF',
    backgroundColor: '#FFFFFF',
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
  // SUGGESTIONS
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E6EA',
    overflow: 'hidden',
  },
  suggestionsList: {},
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  suggestionText: {
    fontSize: 16,
    color: '#1C1E21',
    flex: 1,
  },
  suggestionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  addCustomSkill: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  addCustomText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noResultsText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8,
  },
  // SELECTED SKILLS
  selectedSection: {
    marginBottom: 32,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1E21',
  },
  skillCount: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  selectedSkillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedSkillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F0FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#B3D4FC',
    maxWidth: width * 0.85,
  },
  selectedSkillText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginRight: 6,
    flexShrink: 1,
  },
  removeButton: {
    padding: 2,
  },
  // CATEGORIES DROPDOWN
  categoriesContainer: {
    marginBottom: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  categoriesHeader: {
    marginBottom: 24,
  },
  categoriesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1E21',
    marginBottom: 8,
  },
  categoriesSubtitle: {
    fontSize: 14,
    color: '#65676B',
    lineHeight: 20,
  },
  categoriesSpacer: {
    height: 20,
  },
  categoryDropdown: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E6EA',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
  },
  categoryHeaderExpanded: {
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E6EA',
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1E21',
    marginBottom: 4,
  },
  categorySkillCount: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  expandedContent: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
  },
  horizontalScrollView: {
    backgroundColor: '#FFFFFF',
    maxHeight: 180,
  },
  horizontalSkillsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 12,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E4E6EA',
    marginBottom: 12,
    minHeight: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  skillChipSelected: {
    backgroundColor: '#E6F0FA',
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  skillChipText: {
    fontSize: 15,
    color: '#65676B',
    fontWeight: '500',
    marginRight: 8,
    flexShrink: 1,
    maxWidth: width * 0.7,
  },
  skillChipTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 2,
    flexShrink: 0,
  },
  // FOOTER
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  continueButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    bottom:18,
    paddingVertical: 16,
  },
  continueButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  continueButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  skillCounter: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  skillCounterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  continueIcon: {
    marginLeft: 4,
  },
};

export default SkillsScreen;