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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTaskerOnboarding } from '../../context/TaskerOnboardingContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ALL_SKILLS } from '../../data/taskerOnboardingData';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

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
  const searchInputRef = useRef(null);

  const [selectedSkills, setSelectedSkills] = useState(skills || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSkills = ALL_SKILLS.filter(skill =>
    skill.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exactMatch = ALL_SKILLS.find(skill => 
    skill.toLowerCase() === searchQuery.toLowerCase().trim()
  );

  const shouldShowAddOption = searchQuery.trim().length > 0 && !exactMatch;

  const toggleSkill = (skill) => {
    const newSkills = selectedSkills.includes(skill)
      ? selectedSkills.filter(s => s !== skill)
      : [...selectedSkills, skill];
    
    setSelectedSkills(newSkills);
    setSearchQuery('');
    setShowSuggestions(false);
    Keyboard.dismiss();
    
    if (errors.skills) {
      clearErrors();
    }
  };

  const addCustomSkill = () => {
    const customSkill = searchQuery.trim();
    if (customSkill.length === 0) return;

    if (selectedSkills.some(skill => skill.toLowerCase() === customSkill.toLowerCase())) {
      Alert.alert('Skill Exists', 'This skill is already in your list.');
      return;
    }

    if (customSkill.length < 2) {
      Alert.alert('Invalid Skill', 'Skill name must be at least 2 characters.');
      return;
    }

    if (customSkill.length > 50) {
      Alert.alert('Too Long', 'Skill name must be less than 50 characters.');
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

  const handleSubmit = () => {
    if (selectedSkills.length === 0) {
      Alert.alert('No Skills Selected', 'Please add at least one skill to continue.');
      return;
    }

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

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    setShowSuggestions(text.length > 0);
  };

  const renderSuggestion = ({ item: skill }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => toggleSkill(skill)}
      activeOpacity={0.8}
      accessibilityLabel={`Select ${skill}`}
      accessibilityHint={selectedSkills.includes(skill) ? `Remove ${skill} from your skills` : `Add ${skill} to your skills`}
    >
      <Text style={[
        styles.suggestionText,
        selectedSkills.includes(skill) && styles.suggestionTextSelected
      ]}>
        {skill}
      </Text>
      <Ionicons 
        name={selectedSkills.includes(skill) ? "checkmark-circle" : "add-circle-outline"} 
        size={wp('5%')} 
        color={selectedSkills.includes(skill) ? "#007AFF" : "#65676B"} 
      />
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
            keyExtractor={(item) => `suggestion-${item}`}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.suggestionsList}
          />
        ) : shouldShowAddOption ? (
          <TouchableOpacity
            style={styles.addCustomSkill}
            onPress={addCustomSkill}
            activeOpacity={0.8}
            accessibilityLabel={`Add custom skill ${searchQuery.trim()}`}
            accessibilityHint="Add a new custom skill to your list"
          >
            <Text style={styles.addCustomMain}>Add "{searchQuery.trim()}"</Text>
            <Ionicons name="add" size={wp('5%')} color="#007AFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>No skills found</Text>
          </View>
        )}
      </View>
    );
  };

  const PopularSkills = () => (
    <View style={styles.popularSection}>
      <Text style={styles.sectionTitle}>Popular Skills</Text>
      <View style={styles.popularSkillsGrid}>
        {POPULAR_SKILLS.map((skill) => (
          <TouchableOpacity
            key={skill}
            style={[styles.popularSkillChip, selectedSkills.includes(skill) && styles.popularSkillChipSelected]}
            onPress={() => toggleSkill(skill)}
            activeOpacity={0.8}
            accessibilityLabel={`Select ${skill}`}
            accessibilityHint={selectedSkills.includes(skill) ? `Remove ${skill} from your skills` : `Add ${skill} to your skills`}
          >
            <Text style={[styles.popularSkillText, selectedSkills.includes(skill) && styles.popularSkillTextSelected]}>
              {skill}
            </Text>
            {selectedSkills.includes(skill) && (
              <Ionicons name="checkmark" size={wp('4%')} color="#007AFF" style={styles.checkIcon} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : hp('2%')}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Your Skills</Text>
            <Text style={styles.subtitle}>
              Add skills to showcase your expertise and attract clients
            </Text>
          </View>

          <View style={styles.searchSection}>
            <View style={[
              styles.searchContainer,
              showSuggestions && styles.searchContainerActive,
              errors.skills && styles.searchContainerError
            ]}>
              <Ionicons name="search" size={wp('5%')} color="#65676B" style={styles.searchIcon} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search skills or add your own..."
                placeholderTextColor="#8E8E93"
                value={searchQuery}
                onChangeText={handleSearchChange}
                returnKeyType="search"
                autoCorrect={false}
                accessibilityLabel="Search skills"
                accessibilityHint="Type to search for skills or add a custom skill"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => {
                    setSearchQuery('');
                    setShowSuggestions(false);
                    Keyboard.dismiss();
                  }}
                  style={styles.clearButton}
                  activeOpacity={0.8}
                  accessibilityLabel="Clear search"
                  accessibilityHint="Clear the skill search input"
                >
                  <Ionicons name="close-circle" size={wp('5%')} color="#8E8E93" />
                </TouchableOpacity>
              )}
            </View>
            <SuggestionsComponent />
            {errors.skills && <Text style={styles.errorText}>{errors.skills}</Text>}
          </View>

          {selectedSkills.length > 0 && (
            <View style={styles.selectedSection}>
              <Text style={styles.sectionTitle}>Selected Skills ({selectedSkills.length})</Text>
              <FlatList
                data={selectedSkills}
                renderItem={({ item: skill }) => (
                  <View style={styles.selectedSkill}>
                    <Text style={styles.selectedSkillText} numberOfLines={1}>{skill}</Text>
                    <TouchableOpacity 
                      onPress={() => removeSkill(skill)}
                      style={styles.removeButton}
                      activeOpacity={0.8}
                      accessibilityLabel={`Remove ${skill}`}
                      accessibilityHint={`Remove ${skill} from your skills`}
                    >
                      <Ionicons name="close" size={wp('4%')} color="#65676B" />
                    </TouchableOpacity>
                  </View>
                )}
                keyExtractor={(item, index) => `skill-${item}-${index}`}
                style={styles.selectedSkillsList}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}

          {!showSuggestions && <PopularSkills />}
        </ScrollView>

        <SafeAreaView style={styles.footer} edges={['bottom']}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.8}
            accessibilityLabel="Go back"
            accessibilityHint="Return to the previous screen"
          >
            <Ionicons name="arrow-back" size={wp('5%')} color="#65676B" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.continueButton, !selectedSkills.length && styles.continueButtonDisabled]}
            onPress={handleSubmit}
            disabled={!selectedSkills.length}
            activeOpacity={0.8}
            accessibilityLabel="Continue to profile image"
            accessibilityHint={selectedSkills.length ? "Proceed to the profile image screen" : "Add at least one skill to continue"}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            {selectedSkills.length > 0 && (
              <View style={styles.skillsBadge}>
                <Text style={styles.skillsBadgeText}>{selectedSkills.length}</Text>
              </View>
            )}
            <Ionicons name="arrow-forward" size={wp('5%')} color="#FFFFFF" />
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const POPULAR_SKILLS = [
  'Plumbing',
  'Electrical Repairs',
  'Carpentry',
  'Painting',
  'Cleaning Services',
  'Gardening',
  'Moving & Packing',
  'Home Appliance Repair',
];

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: wp('5%'),
    paddingBottom: hp('10%'),
  },
  header: {
    alignItems: 'center',
    marginBottom: hp('4%'),
  },
  title: {
    fontSize: wp('7%'),
    fontWeight: '700',
    color: '#1C1E21',
    marginBottom: hp('1%'),
  },
  subtitle: {
    fontSize: wp('4%'),
    color: '#65676B',
    textAlign: 'center',
    lineHeight: wp('5.5%'),
  },
  searchSection: {
    marginBottom: hp('4%'),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: wp('3%'),
    borderWidth: 1,
    borderColor: '#E4E6EA',
    padding: wp('3%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainerActive: {
    borderColor: '#007AFF',
  },
  searchContainerError: {
    borderColor: '#FF3B30',
  },
  searchIcon: {
    marginRight: wp('2%'),
  },
  searchInput: {
    flex: 1,
    fontSize: wp('4%'),
    color: '#1C1E21',
    paddingVertical: 0,
  },
  clearButton: {
    padding: wp('1%'),
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: wp('3%'),
    marginTop: hp('1%'),
    borderWidth: 1,
    borderColor: '#E4E6EA',
    maxHeight: hp('30%'),
  },
  suggestionsList: {
    maxHeight: hp('30%'),
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp('3%'),
    borderBottomWidth: 1,
    borderBottomColor: '#E4E6EA',
  },
  suggestionText: {
    flex: 1,
    fontSize: wp('4%'),
    color: '#1C1E21',
    marginRight: wp('2%'),
  },
  suggestionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  addCustomSkill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp('3%'),
  },
  addCustomMain: {
    flex: 1,
    fontSize: wp('4%'),
    color: '#007AFF',
    fontWeight: '500',
    marginRight: wp('2%'),
  },
  noResults: {
    alignItems: 'center',
    padding: wp('4%'),
  },
  noResultsText: {
    fontSize: wp('4%'),
    color: '#8E8E93',
  },
  selectedSection: {
    marginBottom: hp('4%'),
  },
  sectionTitle: {
    fontSize: wp('4.5%'),
    fontWeight: '600',
    color: '#1C1E21',
    marginBottom: hp('2%'),
  },
  selectedSkillsList: {
    maxHeight: hp('30%'),
  },
  selectedSkill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: wp('3%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
    borderColor: '#E4E6EA',
    marginBottom: hp('1%'),
  },
  selectedSkillText: {
    flex: 1,
    fontSize: wp('4%'),
    color: '#007AFF',
    fontWeight: '500',
    marginRight: wp('2%'),
  },
  removeButton: {
    padding: wp('1%'),
  },
  popularSection: {
    marginBottom: hp('4%'),
  },
  popularSkillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp('2%'),
  },
  popularSkillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1.5%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
    borderColor: '#E4E6EA',
  },
  popularSkillChipSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E6F0FA',
  },
  popularSkillText: {
    fontSize: wp('3.5%'),
    color: '#65676B',
    fontWeight: '500',
  },
  popularSkillTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: wp('1%'),
  },
  errorText: {
    fontSize: wp('3.5%'),
    color: '#FF3B30',
    marginTop: hp('1%'),
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: wp('5%'),
    paddingVertical: hp('2%'),
    paddingBottom: Platform.OS === 'ios' ? hp('4%') : hp('3%'),
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E4E6EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    gap: wp('3%'),
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp('3%'),
    backgroundColor: '#F8F9FA',
    borderRadius: wp('3%'),
    borderWidth: 1,
    borderColor: '#E4E6EA',
  },
  backButtonText: {
    fontSize: wp('4%'),
    color: '#65676B',
    fontWeight: '600',
    marginLeft: wp('2%'),
  },
  continueButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp('3%'),
    backgroundColor: '#007AFF',
    borderRadius: wp('3%'),
  },
  continueButtonDisabled: {
    backgroundColor: '#AEAEB2',
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: wp('4%'),
    color: '#FFFFFF',
    fontWeight: '600',
    marginRight: wp('2%'),
  },
  skillsBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: wp('2%'),
    paddingHorizontal: wp('1.5%'),
    paddingVertical: hp('0.5%'),
    marginRight: wp('2%'),
  },
  skillsBadgeText: {
    fontSize: wp('3%'),
    color: '#FFFFFF',
    fontWeight: '600',
  },
};

export default SkillsScreen;