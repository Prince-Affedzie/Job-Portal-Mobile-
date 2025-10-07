import React, { useState, useContext } from 'react';
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
import { navigate } from '../../services/navigationService';

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

const InputField = ({ label, value, onChange, placeholder, error, multiline = false, numberOfLines = 1, required = false }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
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

const CreateTaskScreen = ({ navigation }) => {
  const { addTask, loading } = useContext(PosterContext);
  const { user } = useContext(AuthContext);

  const [task, setTask] = useState({
    title: '',
    description: '',
    category: '',
    subcategory: '',
    biddingType: 'fixed',
    budget: '',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default: 7 days from now
    locationType: 'remote',
    skillsRequired: [],
    address: {
      region: '',
      city: '',
      suburb: ''
    },
    verificationRequired: false
  });

  const [currentSkill, setCurrentSkill] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!task.title.trim()) newErrors.title = 'Title is required';
    if (task.title.length < 5) newErrors.title = 'Title should be at least 5 characters';
    
    if (!task.description.trim()) newErrors.description = 'Description is required';
    if (task.description.length < 20) newErrors.description = 'Description should be at least 20 characters';
    
    if (!task.category) newErrors.category = 'Category is required';
    
    // Budget validation for both bidding types
    if (!task.budget || isNaN(task.budget) || parseFloat(task.budget) <= 0) {
      newErrors.budget = 'Valid budget is required';
    }
    if (parseFloat(task.budget) < 5) {
      newErrors.budget = 'Minimum budget is ₵5';
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
        employer: user?.id,
        status: 'Open'
      };

      // Remove address if it's a remote task
      if (task.locationType === 'remote') {
        delete taskData.address;
      }

      const result = await addTask(taskData);
      
      if (result.status ===200) {
        Alert.alert(
       '🎉 Task Posted Successfully!',
       'Your task is now under review and will be live shortly. We\'ll notify you once it\'s approved and open for applications.',
    [
      { 
        text: 'Got It', 
        onPress: () => navigate('MainTabs', { 
          screen: 'PostedTasks' 
        })
      }
    ]
   );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create task. Please try again.');
      console.error('Error creating task:', error);
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

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setTask(prev => ({ ...prev, deadline: selectedDate }));
    }
  };

  const SectionHeader = ({ title, icon, description }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleContainer}>
        <Ionicons name={icon} size={20} color="#6366F1" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {description && <Text style={styles.sectionDescription}>{description}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1F3B" />
      <Header title="Post New Task" showBackButton={true} />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Basic Information Section */}
        <View style={styles.sectionCard}>
          <SectionHeader 
            title="Basic Information" 
            icon="information-circle-outline"
            description="Provide clear details about what you need done"
          />
          
          <InputField
            label="Task Title"
            value={task.title}
            onChange={(text) => setTask(prev => ({ ...prev, title: text }))}
            placeholder="e.g., Website Redesign, Home Cleaning, Document Translation"
            error={errors.title}
            required={true}
          />

          <InputField
            label="Task Description"
            value={task.description}
            onChange={(text) => setTask(prev => ({ ...prev, description: text }))}
            placeholder="Describe the task in detail. Be specific about requirements, expectations, and any special instructions..."
            error={errors.description}
            multiline={true}
            numberOfLines={6}
            required={true}
          />

          {/* Category & Subcategory */}
          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>
                Category <Text style={styles.required}>*</Text>
              </Text>
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

        {/* Budget & Pricing Section */}
        <View style={styles.sectionCard}>
          <SectionHeader 
            title="Budget & Pricing" 
            icon="cash-outline"
            description="Set your budget for this task"
          />
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              Bidding Type <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  task.biddingType === 'fixed' && styles.radioButtonActive
                ]}
                onPress={() => setTask(prev => ({ ...prev, biddingType: 'fixed' }))}
              >
                <View style={[
                  styles.radioCircle,
                  task.biddingType === 'fixed' && styles.radioCircleActive
                ]}>
                  {task.biddingType === 'fixed' && <View style={styles.radioInnerCircle} />}
                </View>
                <View style={styles.radioContent}>
                  <Text style={styles.radioText}>Fixed Price</Text>
                  <Text style={styles.radioDescription}>Set a specific budget for the task</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.radioButton,
                  task.biddingType === 'open-bid' && styles.radioButtonActive
                ]}
                onPress={() => setTask(prev => ({ ...prev, biddingType: 'open-bid' }))}
              >
                <View style={[
                  styles.radioCircle,
                  task.biddingType === 'open-bid' && styles.radioCircleActive
                ]}>
                  {task.biddingType === 'open-bid' && <View style={styles.radioInnerCircle} />}
                </View>
                <View style={styles.radioContent}>
                  <Text style={styles.radioText}>Open for Bids</Text>
                  <Text style={styles.radioDescription}>Taskers propose their prices</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Single Budget Input for both types */}
          <InputField
            label={
              task.biddingType === 'fixed' 
                ? "Task Budget (GHS)" 
                : "Expected Budget (GHS)"
            }
            value={task.budget}
            onChange={(text) => setTask(prev => ({ ...prev, budget: text }))}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={errors.budget}
            required={true}
          />

          {/* Budget Explanation */}
          <View style={styles.budgetExplanation}>
            <Text style={styles.budgetExplanationTitle}>
              {task.biddingType === 'fixed' ? '💰 Fixed Price' : '💰 Open Bidding'}
            </Text>
            <Text style={styles.budgetExplanationText}>
              {task.biddingType === 'fixed' 
                ? 'This is the exact amount you will pay for the task. Taskers will apply knowing the fixed price.'
                : 'This is your expected budget range. Taskers will submit bids within or around this amount.'
              }
            </Text>
          </View>

          {/* Budget Tips */}
          <View style={styles.budgetTips}>
            <Text style={styles.budgetTipsTitle}>💡 Budget Tips:</Text>
            <Text style={styles.budgetTipsText}>
              • Research similar tasks to set a competitive price{'\n'}
              • Consider task complexity and time required{'\n'}
              • Higher budgets attract more experienced taskers{'\n'}
              • Minimum budget is ₵5 for all tasks
            </Text>
          </View>
        </View>

        {/* Timeline Section */}
        <View style={styles.sectionCard}>
          <SectionHeader 
            title="Timeline" 
            icon="calendar-outline"
            description="When do you need this task completed?"
          />
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              Deadline <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity 
              style={[styles.dateButton, errors.deadline && styles.inputError]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#6366F1" />
              <Text style={styles.dateText}>
                {task.deadline ? task.deadline.toLocaleDateString() : 'Select deadline'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#6366F1" />
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
          <SectionHeader 
            title="Location" 
            icon="location-outline"
            description="Where does this task need to be done?"
          />
          
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
              <View style={styles.radioContent}>
                <Text style={styles.radioText}>Remote</Text>
                <Text style={styles.radioDescription}>Can be done from anywhere</Text>
              </View>
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
              <View style={styles.radioContent}>
                <Text style={styles.radioText}>On-site</Text>
                <Text style={styles.radioDescription}>Requires physical presence</Text>
              </View>
            </TouchableOpacity>
          </View>

          {task.locationType === 'on-site' && (
            <>
              <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>
                    Region <Text style={styles.required}>*</Text>
                  </Text>
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
                  <Text style={styles.inputLabel}>
                    City <Text style={styles.required}>*</Text>
                  </Text>
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

        {/* Skills & Requirements Section */}
        <View style={styles.sectionCard}>
          <SectionHeader 
            title="Skills & Requirements" 
            icon="construct-outline"
            description="What skills are needed to complete this task?"
          />
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Required Skills</Text>
            <View style={styles.skillInputContainer}>
              <TextInput
                style={[styles.textInput, styles.skillInput]}
                value={currentSkill}
                onChangeText={setCurrentSkill}
                placeholder="Add a required skill (e.g., Web Design, Photography)"
                onSubmitEditing={addSkill}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addSkillButton} onPress={addSkill}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.skillHint}>
              Press Enter or the + button to add skills
            </Text>
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
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Post Task</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By posting this task, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
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
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
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
  required: {
    color: '#EF4444',
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
    minHeight: 120,
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
  radioGroup: {
    gap: 12,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
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
    marginRight: 12,
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
  radioContent: {
    flex: 1,
  },
  radioText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  radioDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  dateText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
    marginLeft: 8,
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
  },
  skillText: {
    fontSize: 12,
    color: '#3730A3',
    fontWeight: '500',
  },
  removeSkillButton: {
    padding: 2,
  },
  budgetExplanation: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
  },
  budgetExplanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 4,
  },
  budgetExplanationText: {
    fontSize: 12,
    color: '#0369A1',
    lineHeight: 16,
  },
  budgetTips: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  budgetTipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  budgetTipsText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
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
  footer: {
    alignItems: 'center',
    marginTop: 16,
    padding: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default CreateTaskScreen;