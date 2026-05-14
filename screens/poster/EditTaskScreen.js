import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

// Enhanced InputField with stable focus
const InputField = React.memo(({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  error, 
  multiline = false, 
  numberOfLines = 1, 
  required = false,
  icon = null,
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TouchableOpacity 
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
        style={[
          styles.inputWrapper,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          multiline && styles.textAreaWrapper
        ]}
      >
        {icon && <Ionicons name={icon} size={20} color="#9CA3AF" style={styles.inputIcon} />}
        <TextInput
          ref={inputRef}
          style={[
            styles.textInput,
            multiline && styles.textArea,
            icon && styles.textInputWithIcon
          ]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor="#9CA3AF"
          {...props}
        />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
});

// Chip component for skills and requirements
const Chip = ({ text, onRemove, variant = 'default' }) => (
  <View style={[
    styles.chip,
    variant === 'requirement' && styles.chipRequirement
  ]}>
    <Text style={styles.chipText}>{text}</Text>
    <TouchableOpacity onPress={onRemove} style={styles.chipRemove}>
      <Ionicons name="close" size={16} color="#EF4444" />
    </TouchableOpacity>
  </View>
);

// Section component for better organization
const FormSection = ({ title, description, icon, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name={icon} size={22} color="#6366F1" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {description && <Text style={styles.sectionDescription}>{description}</Text>}
    </View>
    {children}
  </View>
);

const EditTaskScreen = ({ route, navigation }) => {
  const { taskId, task: initialTask } = route.params;
  const { editMiniTask, loading } = useContext(PosterContext);
  const { user } = useContext(AuthContext);

  const [task, setTask] = useState({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    biddingType: 'fixed',
    budget: '',
    deadline: new Date(),
    locationType: 'remote',
    skillsRequired: [],
    requirements: [],
    address: {
      region: '',
      city: '',
      suburb: ''
    },
    verificationRequired: false,
  });

  const [currentSkill, setCurrentSkill] = useState('');
  const [currentRequirement, setCurrentRequirement] = useState('');
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
        requirements: initialTask.requirements || [],
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
    if (task.title.length < 5) newErrors.title = 'Title should be at least 5 characters';
    
    if (!task.description.trim()) newErrors.description = 'Description is required';
    if (task.description.length < 20) newErrors.description = 'Description should be at least 20 characters';
    
    if (!task.category) newErrors.category = 'Category is required';
    
    /*if (!task.budget || isNaN(task.budget) || parseFloat(task.budget) <= 0) {
      newErrors.budget = 'Valid budget is required';
    }*/
    if (task.budget && parseFloat(task.budget) < 20) {
      newErrors.budget = 'Minimum budget is ₵20';
    }
    
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

      const result = await editMiniTask(taskId, taskData);
      console.log(result)
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

  const addRequirement = () => {
    if (currentRequirement.trim() && !task.requirements.includes(currentRequirement.trim())) {
      setTask(prev => ({
        ...prev,
        requirements: [...prev.requirements, currentRequirement.trim()]
      }));
      setCurrentRequirement('');
    }
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1F3B" />
      <Header title="Edit Task" showBackButton={true} />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >

        {/* Basic Information */}
        <FormSection 
          title="Task Details" 
          icon="document-text-outline"
          description="Update your task details"
        >
          <InputField
            label="Task Title"
            value={task.title}
            onChange={(text) => setTask(prev => ({ ...prev, title: text }))}
            placeholder="e.g., Website Design, Home Cleaning"
            error={errors.title}
            required={true}
            
          />

          <InputField
            label="Description"
            value={task.description}
            onChange={(text) => setTask(prev => ({ ...prev, description: text }))}
            placeholder="Describe what needs to be done..."
            error={errors.description}
            multiline={true}
            numberOfLines={4}
            required={true}
            
          />

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={task.category}
                  onValueChange={(value) => setTask(prev => ({ 
                    ...prev, 
                    category: value,
                    subcategory: '' 
                  }))}
                >
                  <Picker.Item label="Select Category" value="" />
                  {categories.map(cat => (
                    <Picker.Item key={cat} label={cat} value={cat} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Subcategory</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={task.subcategory}
                  onValueChange={(value) => setTask(prev => ({ ...prev, subcategory: value }))}
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
        </FormSection>

        {/* Skills & Requirements - Combined */}
        <FormSection 
          title="Requirements" 
          icon="list-outline"
          description="Update skills and deliverables needed"
        >
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Required Skills</Text>
            <View style={styles.chipInputContainer}>
              <TextInput
                style={styles.chipInput}
                value={currentSkill}
                onChangeText={setCurrentSkill}
                placeholder="Add skills like Web Design, Photography..."
                onSubmitEditing={addSkill}
                returnKeyType="done"
                blurOnSubmit={false}
              />
              <TouchableOpacity style={styles.addChipButton} onPress={addSkill}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {task.skillsRequired.length > 0 && (
            <View style={styles.chipsContainer}>
              {task.skillsRequired.map((skill, index) => (
                <Chip 
                  key={index} 
                  text={skill} 
                  onRemove={() => removeSkill(skill)}
                />
              ))}
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Requirements/Deliverables</Text>
            <View style={styles.chipInputContainer}>
              <TextInput
                style={styles.chipInput}
                value={currentRequirement}
                onChangeText={setCurrentRequirement}
                placeholder="Add deliverables like Source files, Documentation..."
                onSubmitEditing={addRequirement}
                returnKeyType="done"
                blurOnSubmit={false}
              />
              <TouchableOpacity style={styles.addChipButton} onPress={addRequirement}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {task.requirements.length > 0 && (
            <View style={styles.chipsContainer}>
              {task.requirements.map((requirement, index) => (
                <Chip 
                  key={index} 
                  text={requirement} 
                  onRemove={() => removeRequirement(requirement)}
                  variant="requirement"
                />
              ))}
            </View>
          )}
        </FormSection>

        {/* Budget - Simplified */}
        <FormSection 
          title="Budget (Optional)" 
          icon="cash-outline"
          description="Update your budget and pricing"
        >
          <View style={styles.radioGroup}>
            {['fixed', 'open-bid'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.radioOption,
                  task.biddingType === type && styles.radioOptionActive
                ]}
                onPress={() => setTask(prev => ({ ...prev, biddingType: type }))}
              >
                <View style={[
                  styles.radioDot,
                  task.biddingType === type && styles.radioDotActive
                ]} />
                <View style={styles.radioContent}>
                  <Text style={styles.radioLabel}>
                    {type === 'fixed' ? 'Fixed Price' : 'Open for Bids'}
                  </Text>
                  <Text style={styles.radioDescription}>
                    {type === 'fixed' 
                      ? 'Set a specific amount' 
                      : 'Taskers propose prices'
                    }
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <InputField
            label="Budget Amount (GHS)"
            value={task.budget}
            onChange={(text) => setTask(prev => ({ ...prev, budget: text }))}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={errors.budget}
            //required={true}
            icon="cash-outline"
          />

          <View style={styles.tipBox}>
            <Ionicons name="information-circle" size={16} color="#6366F1" />
            <Text style={styles.tipText}>Minimum budget is ₵5. Higher budgets attract more experienced taskers.</Text>
          </View>
        </FormSection>

        {/* Timeline & Location - Combined */}
        <FormSection 
          title="When & Where" 
          icon="location-outline"
          description="Update timeline and location details"
        >
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#6366F1" />
            <Text style={styles.dateText}>
              Deadline: {task.deadline.toLocaleDateString()}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#6366F1" />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={task.deadline}
              mode="date"
              display="default"
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}

          <View style={styles.radioGroup}>
            {['remote', 'on-site'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.radioOption,
                  task.locationType === type && styles.radioOptionActive
                ]}
                onPress={() => setTask(prev => ({ ...prev, locationType: type }))}
              >
                <View style={[
                  styles.radioDot,
                  task.locationType === type && styles.radioDotActive
                ]} />
                <View style={styles.radioContent}>
                  <Text style={styles.radioLabel}>
                    {type === 'remote' ? 'Remote Work' : 'On-site Work'}
                  </Text>
                  <Text style={styles.radioDescription}>
                    {type === 'remote' 
                      ? 'Can be done from anywhere' 
                      : 'Requires physical presence'
                    }
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {task.locationType === 'on-site' && (
            <>
              <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Region</Text>
                  <TextInput
                    style={styles.chipInput}
                    value={task.address.region}
                    onChangeText={(text) => setTask(prev => ({
                      ...prev,
                      address: { ...prev.address, region: text }
                    }))}
                    placeholder="Greater Accra"
                  />
                </View>
                <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>City</Text>
                  <TextInput
                    style={styles.chipInput}
                    value={task.address.city}
                    onChangeText={(text) => setTask(prev => ({
                      ...prev,
                      address: { ...prev.address, city: text }
                    }))}
                    placeholder="Accra"
                  />
                </View>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Town/Suburb/Street</Text>
                <TextInput
                  style={styles.chipInput}
                  value={task.address.suburb}
                  onChangeText={(text) => setTask(prev => ({
                    ...prev,
                    address: { ...prev.address, suburb: text }
                  }))}
                  placeholder="East Legon"
                />
              </View>
            </>
          )}
        </FormSection>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={['#6366F1', '#4F46E5']}
            style={styles.submitGradient}
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

        <Text style={styles.footerText}>
          Your changes will be reviewed before going live
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  inputFocused: {
    borderColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputIcon: {
    marginLeft: 12,
  },
  textInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  textInputWithIcon: {
    marginLeft: 8,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  // Chips
  chipInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  chipInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
  },
  addChipButton: {
    backgroundColor: '#6366F1',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  chipRequirement: {
    backgroundColor: '#F0FDF4',
  },
  chipText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
  },
  chipRemove: {
    padding: 2,
  },
  // Radio options
  radioGroup: {
    gap: 12,
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  radioOptionActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  radioDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
  },
  radioDotActive: {
    borderColor: '#6366F1',
    backgroundColor: '#6366F1',
  },
  radioContent: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  radioDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  // Date
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
    marginLeft: 8,
  },
  // Tips
  tipBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    alignItems: 'flex-start',
  },
  tipText: {
    fontSize: 13,
    color: '#0369A1',
    flex: 1,
    lineHeight: 18,
  },
  // Submit
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  footerText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default EditTaskScreen;