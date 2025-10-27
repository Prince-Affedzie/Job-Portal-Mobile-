import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import Header from "../../component/tasker/Header";
import { PosterContext } from '../../context/PosterContext';
import { AuthContext } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const categories = [
  "Home Services",
  "Delivery & Errands",
  "Digital Services",
  "Writing & Assistance",
  "Learning & Tutoring",
  "Creative Tasks",
  "Event Support",
  "Others"
];

const subcategories = {
  "Home Services": ["Cleaning", "Repairs", "Assembly", "Gardening", "Other"],
  "Delivery & Errands": ["Food Delivery", "Package Delivery", "Grocery Shopping", "Other"],
  "Digital Services": ["Web Development", "Graphic Design", "Social Media", "Data Entry", "Other"],
  "Writing & Assistance": ["Content Writing", "Translation", "Research", "Virtual Assistant", "Other"],
  "Learning & Tutoring": ["Academic Tutoring", "Music Lessons", "Language Teaching", "Skill Training", "Other"],
  "Creative Tasks": ["Photography", "Videography", "Art & Design", "Music Production", "Other"],
  "Event Support": ["Event Planning", "Catering", "Decoration", "Coordination", "Other"],
  "Others": ["General Tasks", "Miscellaneous"]
};


const InputField = ({ label, value, onChange, placeholder, error, multiline = false, numberOfLines = 1 }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[
          styles.textInput,
          multiline && styles.textArea,
          error && styles.inputError
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

const EditTaskScreen = ({ route, navigation }) => {
  const { taskId, task: initialTask } = route.params;
  const { editMiniTask , loading } = useContext(PosterContext);
  const { user } = useContext(AuthContext);

  const [task, setTask] = useState({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    budget: '',
    deadline: new Date(),
    locationType: 'remote',
    skillsRequired: [],
    requirements: [], // NEW: Requirements array
    address: {
      region: '',
      city: '',
      suburb: ''
    },
    verificationRequired: false,
    biddingType: 'fixed'
  });

  const [currentSkill, setCurrentSkill] = useState('');
  const [currentRequirement, setCurrentRequirement] = useState(''); // NEW: Current requirement input
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setTask({
        title: initialTask.title || '',
        description: initialTask.description || '',
        category: initialTask.category || '',
        subcategory: initialTask.subcategory || '',
        budget: initialTask.budget?.toString() || '',
        deadline: initialTask.deadline ? new Date(initialTask.deadline) : new Date(),
        locationType: initialTask.locationType || 'remote',
        skillsRequired: initialTask.skillsRequired || [],
        requirements: initialTask.requirements || [], // NEW: Initialize requirements
        address: initialTask.address || {
          region: '',
          city: '',
          suburb: ''
        },
        verificationRequired: initialTask.verificationRequired || false,
        biddingType: initialTask.biddingType || 'fixed'
      });
    }
  }, [initialTask]);

  const validateForm = () => {
    const newErrors = {};

    if (!task.title.trim()) newErrors.title = 'Title is required';
    if (!task.description.trim()) newErrors.description = 'Description is required';
    if (task.description.length < 20) newErrors.description = 'Description should be at least 20 characters';
    if (!task.category) newErrors.category = 'Category is required';
    if (!task.budget) newErrors.budget = 'Budget is required';
    if (isNaN(task.budget) || parseFloat(task.budget) <= 0) newErrors.budget = 'Budget must be a valid number';
    if (!task.deadline) newErrors.deadline = 'Deadline is required';
    if (task.deadline < new Date()) newErrors.deadline = 'Deadline must be in the future';
    if (task.locationType === 'on-site' && (!task.address.region || !task.address.city)) {
      newErrors.address = 'Region and city are required for on-site tasks';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);
    try {
      const taskData = {
        ...task,
        budget: parseFloat(task.budget),
        deadline: task.deadline.toISOString(),
        employer: user?.id
      };

      const result = await editMiniTask (taskId, taskData);
      
      if (result.status === 200) {
        Alert.alert('Success', 'Task updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update task. Please try again.');
      console.error('Error updating task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSkill = () => {
    if (currentSkill.trim() && !task.skillsRequired.includes(currentSkill.trim())) {
      setTask(prev => ({
        ...prev,
        skillsRequired: [...prev.skillsRequired, currentSkill.trim()]
      }));
      setCurrentSkill('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setTask(prev => ({
      ...prev,
      skillsRequired: prev.skillsRequired.filter(skill => skill !== skillToRemove)
    }));
  };

  // NEW: Add requirement function
  const addRequirement = () => {
    if (currentRequirement.trim() && !task.requirements.includes(currentRequirement.trim())) {
      setTask(prev => ({
        ...prev,
        requirements: [...prev.requirements, currentRequirement.trim()]
      }));
      setCurrentRequirement('');
    }
  };

  // NEW: Remove requirement function
  const removeRequirement = (requirementToRemove) => {
    setTask(prev => ({
      ...prev,
      requirements: prev.requirements.filter(req => req !== requirementToRemove)
    }));
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setTask(prev => ({ ...prev, deadline: selectedDate }));
    }
  };

  const SectionHeader = ({ title, icon }) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={20} color="#6366F1" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1F3B" />
      <Header title="Edit Task" showBackButton={true} />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Basic Information Section */}
        <View style={styles.sectionCard}>
          <SectionHeader title="Basic Information" icon="information-circle-outline" />
          
          <InputField
            label="Task Title *"
            value={task.title}
            onChange={(text) => setTask(prev => ({ ...prev, title: text }))}
            placeholder="e.g., Website Redesign, Home Cleaning"
            error={errors.title}
          />

          <InputField
            label="Task Description *"
            value={task.description}
            onChange={(text) => setTask(prev => ({ ...prev, description: text }))}
            placeholder="Describe the task in detail..."
            error={errors.description}
            multiline={true}
            numberOfLines={4}
          />

          {/* Category & Subcategory */}
          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Category *</Text>
              <View style={[styles.pickerContainer, errors.category && styles.inputError]}>
                <Picker
                  selectedValue={task.category}
                  onValueChange={(value) => setTask(prev => ({ 
                    ...prev, 
                    category: value,
                    subcategory: '' 
                  }))}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Category" value="" />
                  {categories.map(cat => (
                    <Picker.Item key={cat} label={cat} value={cat} />
                  ))}
                </Picker>
              </View>
              {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Subcategory</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={task.subcategory}
                  onValueChange={(value) => setTask(prev => ({ ...prev, subcategory: value }))}
                  style={styles.picker}
                  enabled={!!task.category}
                >
                  <Picker.Item label="Select Subcategory" value="" />
                  {task.category && subcategories[task.category]?.map(sub => (
                    <Picker.Item key={sub} label={sub} value={sub} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>

        {/* Skills Section */}
        <View style={styles.sectionCard}>
          <SectionHeader title="Required Skills" icon="construct-outline" />
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Skills Needed</Text>
            <View style={styles.skillInputContainer}>
              <TextInput
                style={[styles.textInput, styles.skillInput]}
                value={currentSkill}
                onChangeText={setCurrentSkill}
                placeholder="Add a required skill"
                onSubmitEditing={addSkill}
              />
              <TouchableOpacity style={styles.addSkillButton} onPress={addSkill}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {task.skillsRequired.length > 0 && (
            <View style={styles.skillsContainer}>
              {task.skillsRequired.map((skill, index) => (
                <View key={index} style={styles.skillTag}>
                  <Text style={styles.skillText}>{skill}</Text>
                  <TouchableOpacity 
                    style={styles.removeSkillButton}
                    onPress={() => removeSkill(skill)}
                  >
                    <Ionicons name="close" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* NEW: Requirements Section */}
        <View style={styles.sectionCard}>
          <SectionHeader title="Task Requirements" icon="list-outline" />
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Requirements & Deliverables</Text>
            <View style={styles.skillInputContainer}>
              <TextInput
                style={[styles.textInput, styles.skillInput]}
                value={currentRequirement}
                onChangeText={setCurrentRequirement}
                placeholder="Add a requirement (e.g., Responsive design, Source files included)"
                onSubmitEditing={addRequirement}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addSkillButton} onPress={addRequirement}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.skillHint}>
              Press Enter or the + button to add requirements
            </Text>
          </View>

          {task.requirements.length > 0 && (
            <View style={styles.skillsContainer}>
              {task.requirements.map((requirement, index) => (
                <View key={index} style={[styles.skillTag]}>
                  <Text style={[styles.skillText]}>{requirement}</Text>
                  <TouchableOpacity 
                    style={styles.removeSkillButton}
                    onPress={() => removeRequirement(requirement)}
                  >
                    <Ionicons name="close" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Budget & Timeline Section */}
        <View style={styles.sectionCard}>
          <SectionHeader title="Budget & Timeline" icon="cash-outline" />
          
          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Budget (₵) *</Text>
              <TextInput
                style={[styles.textInput, errors.budget && styles.inputError]}
                value={task.budget}
                onChangeText={(text) => setTask(prev => ({ ...prev, budget: text }))}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
              {errors.budget && <Text style={styles.errorText}>{errors.budget}</Text>}
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Bidding Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={task.biddingType}
                  onValueChange={(value) => setTask(prev => ({ ...prev, biddingType: value }))}
                  style={styles.picker}
                >
                  <Picker.Item label="Fixed Price" value="fixed" />
                  <Picker.Item label="Open for Bids" value="open-bid" />
                </Picker>
              </View>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Deadline *</Text>
            <TouchableOpacity 
              style={[styles.dateButton, errors.deadline && styles.inputError]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#6366F1" />
              <Text style={styles.dateText}>
                {task.deadline ? task.deadline.toLocaleDateString() : 'Select deadline'}
              </Text>
            </TouchableOpacity>
            {errors.deadline && <Text style={styles.errorText}>{errors.deadline}</Text>}
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={task.deadline}
              mode="date"
              display="default"
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        {/* Location Section */}
        <View style={styles.sectionCard}>
          <SectionHeader title="Location" icon="location-outline" />
          
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[
                styles.radioButton,
                task.locationType === 'remote' && styles.radioButtonActive
              ]}
              onPress={() => setTask(prev => ({ ...prev, locationType: 'remote' }))}
            >
              <View style={[
                styles.radioCircle,
                task.locationType === 'remote' && styles.radioCircleActive
              ]}>
                {task.locationType === 'remote' && <View style={styles.radioInnerCircle} />}
              </View>
              <Text style={styles.radioText}>Remote</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.radioButton,
                task.locationType === 'on-site' && styles.radioButtonActive
              ]}
              onPress={() => setTask(prev => ({ ...prev, locationType: 'on-site' }))}
            >
              <View style={[
                styles.radioCircle,
                task.locationType === 'on-site' && styles.radioCircleActive
              ]}>
                {task.locationType === 'on-site' && <View style={styles.radioInnerCircle} />}
              </View>
              <Text style={styles.radioText}>On-site</Text>
            </TouchableOpacity>
          </View>

          {task.locationType === 'on-site' && (
            <>
              <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Region *</Text>
                  <TextInput
                    style={[styles.textInput, errors.address && styles.inputError]}
                    value={task.address.region}
                    onChangeText={(text) => setTask(prev => ({
                      ...prev,
                      address: { ...prev.address, region: text }
                    }))}
                    placeholder="e.g., Greater Accra"
                  />
                </View>

                <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>City *</Text>
                  <TextInput
                    style={[styles.textInput, errors.address && styles.inputError]}
                    value={task.address.city}
                    onChangeText={(text) => setTask(prev => ({
                      ...prev,
                      address: { ...prev.address, city: text }
                    }))}
                    placeholder="e.g., Accra"
                  />
                </View>
              </View>

              <InputField
                label="Suburb (Optional)"
                value={task.address.suburb}
                onChange={(text) => setTask(prev => ({
                  ...prev,
                  address: { ...prev.address, suburb: text }
                }))}
                placeholder="e.g., East Legon"
              />

              {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
            </>
          )}
        </View>

        

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={['#1A1F3B', '#2D325D']}
            style={styles.submitGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Update Task</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D325D',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    color: '#1F2937',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    flex: 1,
  },
  radioButtonActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: '#6366F1',
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366F1',
  },
  radioText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  skillInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  skillInput: {
    flex: 1,
  },
  skillHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  addSkillButton: {
    backgroundColor: '#6366F1',
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    maxWidth: '100%', // Prevent overflow
   flexShrink: 1, // Allow shrinking if needed
  },
  requirementTag: {
    backgroundColor: '#F0FDF4',
  },
  skillText: {
  fontSize: 12,
  color: '#1E293B',
  fontWeight: '500',
  flexShrink: 1, // Allow text to shrink
  flexWrap: 'wrap', // Allow text wrapping
  },
  requirementText: {
    color: '#166534',
  },
  removeSkillButton: {
    padding: 2,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabelContainer: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
});

export default EditTaskScreen;