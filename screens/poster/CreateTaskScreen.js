import React, { useState, useContext, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Dimensions,
  StatusBar, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '../../component/tasker/Header';
import { PosterContext } from '../../context/PosterContext';
import { AuthContext } from '../../context/AuthContext';
import { navigate } from '../../services/navigationService';

const { width } = Dimensions.get('window');
const scale = (size) => (width / 375) * size;

// ─── Data ─────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'Home Services', 'Delivery & Errands', 'Digital Services',
  'Writing & Assistance', 'Learning & Tutoring', 'Creative Tasks',
  'Event Support', 'Others',
];

const SUBCATEGORIES = {
  'Home Services':       ['Cleaning', 'Repairs', 'Assembly', 'Gardening', 'Other'],
  'Delivery & Errands':  ['Food Delivery', 'Package Delivery', 'Grocery Shopping', 'Other'],
  'Digital Services':    ['Web Development', 'Graphic Design', 'Social Media', 'Data Entry', 'Other'],
  'Writing & Assistance':['Content Writing', 'Translation', 'Research', 'Virtual Assistant', 'Other'],
  'Learning & Tutoring': ['Academic Tutoring', 'Music Lessons', 'Language Teaching', 'Skill Training', 'Other'],
  'Creative Tasks':      ['Photography', 'Videography', 'Art & Design', 'Music Production', 'Other'],
  'Event Support':       ['Event Planning', 'Catering', 'Decoration', 'Coordination', 'Other'],
  'Others':              ['General Tasks', 'Miscellaneous'],
};

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:            '#F8FAFF',
  surface:       '#FFFFFF',
  border:        '#E4E8EE',
  borderLight:   '#EEF1F6',
  primary:       '#1E3A6E',
  primaryMid:    '#1A56DB',
  primaryGlow:   '#EBF5FF',
  gold:          '#D49B3F',
  goldLight:     '#FCF3E1',
  green:         '#0E9F6E',
  greenLight:    '#E3FCEC',
  red:           '#DC2626',
  redLight:      '#FEF2F2',
  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  textMuted:     '#94A3B8',
  white:         '#FFFFFF',
};

// ─── InputField ───────────────────────────────────────────────────────────────
const InputField = React.memo(({
  label, value, onChange, placeholder, error, multiline = false,
  numberOfLines = 1, required = false, icon = null, keyboardType = 'default', ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  return (
    <View style={s.inputContainer}>
      <Text style={s.inputLabel}>
        {label}{required && <Text style={{ color: C.red }}> *</Text>}
      </Text>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
        style={[
          s.inputWrapper,
          isFocused && s.inputFocused,
          error && s.inputError,
          multiline && s.textAreaWrapper,
        ]}
      >
        {icon && <Ionicons name={icon} size={scale(18)} color={isFocused ? C.primaryMid : C.textMuted} style={s.inputIcon} />}
        <TextInput
          ref={inputRef}
          style={[s.textInput, multiline && s.textArea, icon && s.textInputWithIcon]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          returnKeyType={multiline ? 'default' : 'next'}
          {...props}
        />
      </TouchableOpacity>
      {error ? (
        <View style={s.errorRow}>
          <Ionicons name="alert-circle-outline" size={scale(13)} color={C.red} />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : multiline ? (
        <Text style={s.charCount}>{value.length}/1000</Text>
      ) : null}
    </View>
  );
});

// ─── Chip ─────────────────────────────────────────────────────────────────────
const Chip = ({ text, onRemove, variant = 'skill' }) => (
  <View style={[s.chip, variant === 'requirement' ? s.chipReq : s.chipSkill]}>
    <Text style={s.chipText} numberOfLines={1}>{text}</Text>
    <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name="close-circle" size={scale(16)} color={variant === 'requirement' ? C.green : C.primaryMid} />
    </TouchableOpacity>
  </View>
);

// ─── Section card ─────────────────────────────────────────────────────────────
const SectionCard = ({ title, description, icon, children, accent = C.primaryMid, collapsible = false }) => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <View style={s.section}>
      <TouchableOpacity
        style={s.sectionHeader}
        onPress={() => collapsible && setCollapsed(!collapsed)}
        activeOpacity={collapsible ? 0.75 : 1}
      >
        <View style={[s.sectionIconWrap, { backgroundColor: accent }]}>
          <Ionicons name={icon} size={scale(18)} color={C.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.sectionTitle}>{title}</Text>
          {description && !collapsed && (
            <Text style={s.sectionDesc}>{description}</Text>
          )}
        </View>
        {collapsible && (
          <Ionicons
            name={collapsed ? 'chevron-down' : 'chevron-up'}
            size={scale(18)}
            color={C.textMuted}
          />
        )}
      </TouchableOpacity>

      {!collapsed && <View style={s.sectionBody}>{children}</View>}
    </View>
  );
};

// ─── Picker wrapper ───────────────────────────────────────────────────────────
const PickerField = ({ label, selectedValue, onValueChange, items, enabled = true, required = false }) => (
  <View style={s.inputContainer}>
    <Text style={s.inputLabel}>
      {label}{required && <Text style={{ color: C.red }}> *</Text>}
    </Text>
    <View style={[s.pickerWrap, !enabled && { opacity: 0.5 }]}>
      <Picker
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        enabled={enabled}
        dropdownIconColor={C.primaryMid}
        style={s.picker}
      >
        <Picker.Item label={`Select ${label.toLowerCase()}`} value="" color={C.textMuted} />
        {items.map((item, i) => (
          <Picker.Item key={i} label={item} value={item} color={C.textPrimary} />
        ))}
      </Picker>
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const CreateTaskScreen = ({ navigation }) => {
  const { addTask } = useContext(PosterContext);
  const { user }    = useContext(AuthContext);

  const [task, setTask] = useState({
    title:          '',
    description:    '',
    category:       '',
    subcategory:    '',
    biddingType:    'open-bid',
    budget:         '',
    deadline:       new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    locationType:   'remote',
    skillsRequired: [],
    requirements:   [],
    address:        { region: '', city: '', suburb: '' },
  });

  const [currentSkill, setCurrentSkill]       = useState('');
  const [currentRequirement, setCurrentReq]   = useState('');
  const [showDatePicker, setShowDatePicker]   = useState(false);
  const [errors, setErrors]                   = useState({});
  const [isSubmitting, setIsSubmitting]       = useState(false);

  // ── Stable change handlers ─────────────────────────────────────────────────
  const setField   = useCallback((key, val) => setTask(p => ({ ...p, [key]: val })), []);
  const setAddress = useCallback((key, val) => setTask(p => ({ ...p, address: { ...p.address, [key]: val } })), []);

  // ── Skills & requirements ──────────────────────────────────────────────────
  const addSkill = () => {
    if (currentSkill.trim() && !task.skillsRequired.includes(currentSkill.trim())) {
      setTask(p => ({ ...p, skillsRequired: [...p.skillsRequired, currentSkill.trim()] }));
      setCurrentSkill('');
    }
  };

  const addRequirement = () => {
    if (currentRequirement.trim() && !task.requirements.includes(currentRequirement.trim())) {
      setTask(p => ({ ...p, requirements: [...p.requirements, currentRequirement.trim()] }));
      setCurrentReq('');
    }
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!task.title.trim() || task.title.length < 5)          e.title       = 'Title must be at least 5 characters';
    if (!task.description.trim() || task.description.length < 20) e.description = 'Please describe your task in at least 20 characters';
    if (!task.category)                                         e.category    = 'Please select a category';
    if (task.budget && parseFloat(task.budget) < 20)           e.budget      = 'Minimum budget is ₵20';
    if (task.deadline < new Date())                            e.deadline    = 'Deadline must be in the future';
    if (task.locationType === 'on-site' && (!task.address.region || !task.address.city))
      e.address = 'Region and city are required for on-site tasks';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) { Alert.alert('Please fix the errors below'); return; }
    setIsSubmitting(true);
    try {
      const taskData = {
        ...task,
        budget:   task.budget ? parseFloat(task.budget) : null,
        deadline: task.deadline.toISOString(),
        media:    [],
      };
      if (task.locationType === 'remote') delete taskData.address;

      const result = await addTask(taskData);
      if (result.status === 200) {
        Alert.alert(
          'Task Posted! 🎉',
          'Taskers can now find and apply for your job.',
          [{ text: 'View My Posts', onPress: () => navigate('MainTabs', { screen: 'PostedTasks' }) }]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to post task. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Failed to post task. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <Header title="Post a Task" showBackButton />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        removeClippedSubviews={false}
      >
        {/* ── Purpose banner ─────────────────────────────────────────── */}
        <View style={s.purposeBanner}>
          <LinearGradient
            colors={[C.primary, '#1A3A7A']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.purposeBannerGrad}
          >
            <View style={s.purposeBannerCircle} />
            <View style={s.purposeBannerContent}>
              <View style={s.purposeBadge}>
                <Text style={s.purposeBadgeText}>FOR CLIENTS</Text>
              </View>
              <Text style={s.purposeTitle}>Need a service?</Text>
              <Text style={s.purposeSub}>
                Describe the service you need below and skilled taskers in your area will apply. You review their profiles and choose the best fit.
              </Text>
              <View style={s.purposeSteps}>
                {[
                  { icon: 'create-outline',   text: 'Fill in your job details' },
                  { icon: 'people-outline',   text: 'Taskers apply with offers'  },
                  { icon: 'checkmark-circle-outline', text: 'You pick and book the best' },
                ].map((step, i) => (
                  <View key={i} style={s.purposeStep}>
                    <View style={s.purposeStepNum}>
                      <Text style={s.purposeStepNumText}>{i + 1}</Text>
                    </View>
                    <Ionicons name={step.icon} size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={s.purposeStepText}>{step.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ── 1. Job Details ──────────────────────────────────────────── */}
        <SectionCard
          title="Job Details"
          description="What do you need help with?"
          icon="document-text-outline"
          accent={C.primaryMid}
        >
          <InputField
            label="Job Title"
            value={task.title}
            onChange={useCallback(t => setField('title', t), [])}
            placeholder="e.g. Fix leaking bathroom pipe, Logo design for my business"
            error={errors.title}
            required
          />
          <InputField
            label="Description"
            value={task.description}
            onChange={useCallback(t => setField('description', t), [])}
            placeholder="Describe exactly what needs to be done. The more detail you provide, the better your applicants will be."
            error={errors.description}
            multiline
            numberOfLines={5}
            required
          />

          {/* Category row */}
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <PickerField
                label="Category"
                selectedValue={task.category}
                onValueChange={val => setTask(p => ({ ...p, category: val, subcategory: '' }))}
                items={CATEGORIES}
                required
              />
              {errors.category && (
                <View style={s.errorRow}>
                  <Ionicons name="alert-circle-outline" size={12} color={C.red} />
                  <Text style={s.errorText}>{errors.category}</Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <PickerField
                label="Subcategory"
                selectedValue={task.subcategory}
                onValueChange={val => setField('subcategory', val)}
                items={task.category ? (SUBCATEGORIES[task.category] || []) : []}
                enabled={!!task.category}
              />
            </View>
          </View>
        </SectionCard>

        {/* ── 2. Budget ──────────────────────────────────────────────── */}
        <SectionCard
          title="Budget"
          description="How much are you willing to pay?"
          icon="cash-outline"
          accent={C.green}
          collapsible
        >
          <InputField
            label="Your Budget (GHS)"
            value={task.budget}
            onChange={useCallback(t => setField('budget', t.replace(/[^0-9.]/g, '')), [])}
            placeholder="Enter amount (e.g. 150)"
            keyboardType="decimal-pad"
            error={errors.budget}
            icon="cash-outline"
          />

          {/* Bidding type 
          <View style={s.fieldGroup}>
            <Text style={s.fieldGroupLabel}>How should taskers respond?</Text>
            <View style={s.biddingRow}>
              {[
                { value: 'open-bid',   label: 'Open Bidding',   desc: 'Taskers send their price',  icon: 'pricetags-outline' },
                { value: 'fixed',      label: 'Fixed Budget',   desc: 'Pay your set amount',        icon: 'lock-closed-outline' },
                { value: 'negotiation',label: 'Negotiable',     desc: 'Discuss price directly',    icon: 'chatbubbles-outline' },
              ].map(opt => {
                const active = task.biddingType === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[s.biddingCard, active && s.biddingCardActive]}
                    onPress={() => setField('biddingType', opt.value)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={opt.icon} size={scale(20)} color={active ? C.primaryMid : C.textMuted} />
                    <Text style={[s.biddingLabel, active && { color: C.primaryMid }]}>{opt.label}</Text>
                    <Text style={s.biddingDesc}>{opt.desc}</Text>
                    {active && <View style={s.biddingCheck}><Ionicons name="checkmark" size={10} color={C.white} /></View>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>*/}

          <View style={s.tipBox}>
            <Ionicons name="bulb-outline" size={14} color={C.gold} />
            <Text style={s.tipBoxText}>
              A fair budget attracts more experienced taskers. Minimum is ₵20.
            </Text>
          </View>
        </SectionCard>

        {/* ── 3. Schedule & Location ─────────────────────────────────── */}
        <SectionCard
          title="When & Where"
          description="Set your deadline and work location"
          icon="location-outline"
          accent={C.gold}
          collapsible
        >
          {/* Deadline */}
          <Text style={s.fieldLabel}>Deadline <Text style={{ color: C.red }}>*</Text></Text>
          <TouchableOpacity style={s.dateBtn} onPress={() => setShowDatePicker(true)} activeOpacity={0.85}>
            <View style={s.dateBtnInner}>
              <View style={s.dateBtnIcon}>
                <Ionicons name="calendar-outline" size={scale(18)} color={C.primaryMid} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.dateBtnLabel}>Task deadline</Text>
                <Text style={s.dateBtnValue}>
                  {task.deadline.toLocaleDateString('en-GH', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={scale(16)} color={C.textMuted} />
            </View>
          </TouchableOpacity>
          {errors.deadline && (
            <View style={s.errorRow}>
              <Ionicons name="alert-circle-outline" size={12} color={C.red} />
              <Text style={s.errorText}>{errors.deadline}</Text>
            </View>
          )}

          {showDatePicker && (
            <DateTimePicker
              value={task.deadline}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) setField('deadline', date);
              }}
            />
          )}

          {/* Location type */}
          <View style={s.fieldGroup}>
            <Text style={s.fieldGroupLabel}>Where will this job take place?</Text>
            <View style={s.locationRow}>
              {[
                { id: 'remote',  label: 'Remote',  sub: 'Done online / anywhere', icon: 'laptop-outline' },
                { id: 'on-site', label: 'On-site', sub: 'At a specific location',  icon: 'location-outline' },
              ].map(opt => {
                const active = task.locationType === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[s.locationCard, active && s.locationCardActive]}
                    onPress={() => setField('locationType', opt.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={opt.icon} size={scale(22)} color={active ? C.primaryMid : C.textMuted} />
                    <Text style={[s.locationCardLabel, active && { color: C.primaryMid }]}>{opt.label}</Text>
                    <Text style={s.locationCardSub}>{opt.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Address fields (on-site only) */}
          {task.locationType === 'on-site' && (
            <View style={s.addressBlock}>
              <View style={s.addressHint}>
                <Ionicons name="information-circle-outline" size={14} color={C.primaryMid} />
                <Text style={s.addressHintText}>
                  Your exact address is only shared with the tasker you hire.
                </Text>
              </View>
              {errors.address && (
                <View style={[s.errorRow, { marginBottom: 8 }]}>
                  <Ionicons name="alert-circle-outline" size={12} color={C.red} />
                  <Text style={s.errorText}>{errors.address}</Text>
                </View>
              )}
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <InputField label="Region" value={task.address.region}
                    onChange={useCallback(t => setAddress('region', t), [])}
                    placeholder="Greater Accra" icon="navigate-outline" />
                </View>
                <View style={{ flex: 1 }}>
                  <InputField label="City" value={task.address.city}
                    onChange={useCallback(t => setAddress('city', t), [])}
                    placeholder="Accra" icon="business-outline" />
                </View>
              </View>
              <InputField label="Suburb / Street" value={task.address.suburb}
                onChange={useCallback(t => setAddress('suburb', t), [])}
                placeholder="e.g. East Legon, Tema Community 5" icon="home-outline" />
            </View>
          )}
        </SectionCard>

        {/* ── 4. Skills & Requirements ───────────────────────────────── */}
        <SectionCard
          title="Skills & Deliverables"
          description="What should applicants know or provide?"
          icon="checkmark-done-outline"
          accent="#7E3AF2"
          collapsible
        >
          {/* Skills */}
          <View style={s.chipSection}>
            <Text style={s.chipSectionTitle}>Skills needed</Text>
            <Text style={s.chipSectionSub}>
              e.g. Plumbing, Graphic Design, Driving licence
            </Text>
            <View style={s.chipInputRow}>
              <TextInput
                style={s.chipInput}
                value={currentSkill}
                onChangeText={setCurrentSkill}
                placeholder="Type a skill…"
                placeholderTextColor={C.textMuted}
                onSubmitEditing={addSkill}
                returnKeyType="done"
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[s.chipAddBtn, !currentSkill.trim() && s.chipAddBtnDisabled]}
                onPress={addSkill}
                disabled={!currentSkill.trim()}
              >
                <Ionicons name="add" size={scale(18)} color={C.white} />
                <Text style={s.chipAddBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
            {task.skillsRequired.length > 0 && (
              <View style={s.chipsWrap}>
                {task.skillsRequired.map((sk, i) => (
                  <Chip key={i} text={sk} onRemove={() => setTask(p => ({ ...p, skillsRequired: p.skillsRequired.filter(x => x !== sk) }))} variant="skill" />
                ))}
              </View>
            )}
          </View>

          <View style={s.sectionDivider} />

          {/* Requirements / Deliverables */}
          <View style={s.chipSection}>
            <Text style={s.chipSectionTitle}>Deliverables</Text>
            <Text style={s.chipSectionSub}>
              What must the tasker provide? e.g. Source files, Written report, 5 photos
            </Text>
            <View style={s.chipInputRow}>
              <TextInput
                style={s.chipInput}
                value={currentRequirement}
                onChangeText={setCurrentReq}
                placeholder="Type a deliverable…"
                placeholderTextColor={C.textMuted}
                onSubmitEditing={addRequirement}
                returnKeyType="done"
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[s.chipAddBtn, { backgroundColor: C.green }, !currentRequirement.trim() && s.chipAddBtnDisabled]}
                onPress={addRequirement}
                disabled={!currentRequirement.trim()}
              >
                <Ionicons name="add" size={scale(18)} color={C.white} />
                <Text style={s.chipAddBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
            {task.requirements.length > 0 && (
              <View style={s.chipsWrap}>
                {task.requirements.map((req, i) => (
                  <Chip key={i} text={req} onRemove={() => setTask(p => ({ ...p, requirements: p.requirements.filter(x => x !== req) }))} variant="requirement" />
                ))}
              </View>
            )}
          </View>
        </SectionCard>

        {/* ── 5. Summary ──────────────────────────────────────────────── */}
        <SectionCard
          title="Review Before Posting"
          description="Check your details one last time"
          icon="eye-outline"
          accent={C.textSecondary}
          collapsible
        >
          <View style={s.summaryGrid}>
            {[
              { label: 'Job title',    value: task.title || '—',                              icon: 'document-text-outline' },
              { label: 'Category',     value: task.category ? `${task.category}${task.subcategory ? ` › ${task.subcategory}` : ''}` : '—', icon: 'grid-outline' },
              { label: 'Budget',       value: task.budget ? `₵${parseFloat(task.budget).toFixed(2)}` : 'Not specified', icon: 'cash-outline' },
              { label: 'Deadline',     value: task.deadline.toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }), icon: 'calendar-outline' },
              { label: 'Location',     value: task.locationType === 'remote' ? 'Remote / Online' : task.address.city ? `${task.address.city}, ${task.address.region}` : 'On-site (address not set)', icon: 'location-outline' },
              { label: 'Bidding',      value: task.biddingType === 'open-bid' ? 'Open Bidding' : task.biddingType === 'fixed' ? 'Fixed Budget' : 'Negotiable', icon: 'pricetags-outline' },
              { label: 'Skills',       value: task.skillsRequired.length > 0 ? task.skillsRequired.join(', ') : 'None specified', icon: 'build-outline' },
              { label: 'Deliverables', value: task.requirements.length > 0 ? `${task.requirements.length} item${task.requirements.length > 1 ? 's' : ''}` : 'None specified', icon: 'checkmark-done-outline' },
            ].map((item, i) => (
              <View key={i} style={[s.summaryRow, i < 7 && s.summaryRowBorder]}>
                <View style={s.summaryIcon}>
                  <Ionicons name={item.icon} size={14} color={C.primaryMid} />
                </View>
                <Text style={s.summaryLabel}>{item.label}</Text>
                <Text style={s.summaryValue} numberOfLines={2}>{item.value}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        {/* ── Submit ──────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.submitBtn, isSubmitting && { opacity: 0.75 }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={[C.primaryMid, C.primary]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.submitGrad}
          >
            {isSubmitting ? (
              <>
                <ActivityIndicator size="small" color={C.white} />
                <Text style={s.submitText}>Posting your task…</Text>
              </>
            ) : (
              <>
                <Ionicons name="send-outline" size={scale(20)} color={C.white} />
                <Text style={s.submitText}>Post Task Publicly</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={s.footer}>
          <Ionicons name="shield-checkmark-outline" size={14} color={C.textMuted} />
          <Text style={s.footerText}>
            Your task will be reviewed before going live.{' '}
            <Text style={{ color: C.primaryMid }}>Terms</Text> &{' '}
            <Text style={{ color: C.primaryMid }}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: C.bg },
  scroll:        { flex: 1, backgroundColor: C.bg },
  scrollContent: { padding: scale(16), paddingBottom: scale(40) },

  // Purpose banner
  purposeBanner: {
    borderRadius: 20, overflow: 'hidden', marginBottom: scale(20),
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22, shadowRadius: 14, elevation: 7,
  },
  purposeBannerGrad: { padding: scale(22), overflow: 'hidden', position: 'relative' },
  purposeBannerCircle: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  purposeBannerContent: { position: 'relative', zIndex: 1 },
  purposeBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)', alignSelf: 'flex-start',
    borderRadius: 20, paddingHorizontal: 11, paddingVertical: 4, marginBottom: 12,
  },
  purposeBadgeText: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.9)', letterSpacing: 1.2 },
  purposeTitle:    { fontSize: scale(22), fontWeight: '800', color: C.white, marginBottom: 6, letterSpacing: -0.4 },
  purposeSub:      { fontSize: scale(13), color: 'rgba(255,255,255,0.78)', lineHeight: 20, marginBottom: 16 },
  purposeSteps:    { gap: 8 },
  purposeStep:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  purposeStepNum: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  purposeStepNumText: { fontSize: 11, fontWeight: '800', color: C.white },
  purposeStepText:    { fontSize: scale(13), color: 'rgba(255,255,255,0.85)', fontWeight: '500', flex: 1 },

  // Section card
  section: {
    backgroundColor: C.surface, borderRadius: 16, marginBottom: scale(14),
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: scale(16), gap: scale(12),
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  sectionIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: scale(15), fontWeight: '700', color: C.textPrimary, marginBottom: 1 },
  sectionDesc:  { fontSize: scale(12), color: C.textMuted, lineHeight: 17 },
  sectionBody:  { padding: scale(16) },

  // Inputs
  inputContainer: { marginBottom: scale(14) },
  inputLabel:     { fontSize: scale(13), fontWeight: '700', color: C.textSecondary, marginBottom: scale(7), letterSpacing: 0.1 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, backgroundColor: C.surface,
    minHeight: scale(50),
  },
  textAreaWrapper: { alignItems: 'flex-start' },
  inputFocused: { borderColor: C.primaryMid, backgroundColor: '#F8FBFF' },
  inputError:   { borderColor: C.red, backgroundColor: C.redLight },
  inputIcon:    { marginLeft: scale(13) },
  textInput: {
    flex: 1, paddingHorizontal: scale(13), paddingVertical: scale(13),
    fontSize: scale(15), color: C.textPrimary,
  },
  textInputWithIcon: { paddingLeft: scale(8) },
  textArea:     { minHeight: scale(110), textAlignVertical: 'top' },
  errorRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  errorText:    { fontSize: scale(12), color: C.red, fontWeight: '500' },
  charCount:    { fontSize: scale(11), color: C.textMuted, textAlign: 'right', marginTop: 4 },

  // Picker
  pickerWrap: {
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, backgroundColor: C.surface, overflow: 'hidden',
  },
  picker: { height: scale(52) },

  // Row
  row: { flexDirection: 'row', gap: scale(10) },

  // Field groups
  fieldGroup:      { marginBottom: scale(16) },
  fieldGroupLabel: { fontSize: scale(13), fontWeight: '700', color: C.textSecondary, marginBottom: scale(10), letterSpacing: 0.1 },
  fieldLabel:      { fontSize: scale(13), fontWeight: '700', color: C.textSecondary, marginBottom: scale(7), letterSpacing: 0.1 },

  // Bidding cards
  biddingRow: { flexDirection: 'row', gap: 8 },
  biddingCard: {
    flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.bg, gap: 4, position: 'relative',
  },
  biddingCardActive: { borderColor: C.primaryMid, backgroundColor: C.primaryGlow },
  biddingLabel:  { fontSize: scale(11), fontWeight: '700', color: C.textSecondary, textAlign: 'center' },
  biddingDesc:   { fontSize: scale(10), color: C.textMuted, textAlign: 'center', lineHeight: 14 },
  biddingCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: C.primaryMid, alignItems: 'center', justifyContent: 'center',
  },

  // Tip box
  tipBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: C.goldLight, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#F0D9A8',
  },
  tipBoxText: { flex: 1, fontSize: scale(12), color: '#7C5C1A', lineHeight: 18, fontWeight: '500' },

  // Date button
  dateBtn: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    backgroundColor: C.surface, marginBottom: scale(14), overflow: 'hidden',
  },
  dateBtnInner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(13), paddingVertical: scale(12), gap: 12,
  },
  dateBtnIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: C.primaryGlow, alignItems: 'center', justifyContent: 'center',
  },
  dateBtnLabel: { fontSize: scale(11), color: C.textMuted, fontWeight: '600', marginBottom: 1 },
  dateBtnValue: { fontSize: scale(14), color: C.textPrimary, fontWeight: '700' },

  // Location cards
  locationRow: { flexDirection: 'row', gap: 10 },
  locationCard: {
    flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.bg, gap: 5,
  },
  locationCardActive: { borderColor: C.primaryMid, backgroundColor: C.primaryGlow },
  locationCardLabel: { fontSize: scale(13), fontWeight: '700', color: C.textSecondary },
  locationCardSub:   { fontSize: scale(11), color: C.textMuted, textAlign: 'center' },

  // Address block
  addressBlock: { marginTop: scale(14) },
  addressHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: C.primaryGlow, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#DBEAFE', marginBottom: 14,
  },
  addressHintText: { flex: 1, fontSize: scale(12), color: C.primary, fontWeight: '500', lineHeight: 17 },

  // Skills / requirements
  chipSection:      { marginBottom: scale(4) },
  chipSectionTitle: { fontSize: scale(14), fontWeight: '700', color: C.textPrimary, marginBottom: 3 },
  chipSectionSub:   { fontSize: scale(12), color: C.textMuted, marginBottom: 10, lineHeight: 17 },
  chipInputRow:     { flexDirection: 'row', gap: 8, marginBottom: 10 },
  chipInput: {
    flex: 1, borderWidth: 1.5, borderColor: C.border, borderRadius: 11,
    paddingHorizontal: 13, paddingVertical: 11,
    fontSize: scale(14), backgroundColor: C.surface, color: C.textPrimary,
  },
  chipAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.primaryMid, paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 11,
  },
  chipAddBtnDisabled: { opacity: 0.45 },
  chipAddBtnText:     { fontSize: scale(13), fontWeight: '700', color: C.white },
  chipsWrap:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 11, paddingVertical: 7,
    borderRadius: 20, gap: 6, marginBottom: 2,
  },
  chipSkill:  { backgroundColor: C.primaryGlow, borderWidth: 1, borderColor: '#DBEAFE' },
  chipReq:    { backgroundColor: C.greenLight,  borderWidth: 1, borderColor: '#BBF7D0' },
  chipText:   { fontSize: scale(12), fontWeight: '600', color: C.textPrimary },
  sectionDivider: { height: 1, backgroundColor: C.borderLight, marginVertical: scale(16) },

  // Summary
  summaryGrid: { gap: 0 },
  summaryRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 10, gap: 10,
  },
  summaryRowBorder: { borderBottomWidth: 1, borderBottomColor: C.borderLight },
  summaryIcon: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: C.primaryGlow, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  summaryLabel: { fontSize: scale(12), color: C.textMuted, fontWeight: '600', width: scale(80), paddingTop: 3 },
  summaryValue: { flex: 1, fontSize: scale(13), color: C.textPrimary, fontWeight: '600', lineHeight: 19 },

  // Submit
  submitBtn: {
    borderRadius: 16, overflow: 'hidden', marginBottom: scale(14),
    shadowColor: C.primaryMid, shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28, shadowRadius: 10, elevation: 7,
  },
  submitGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: scale(17), gap: scale(10),
  },
  submitText: { color: C.white, fontSize: scale(16), fontWeight: '700', letterSpacing: -0.2 },

  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    paddingHorizontal: scale(8), paddingBottom: scale(4),
  },
  footerText: { flex: 1, fontSize: scale(12), color: C.textMuted, lineHeight: 18, textAlign: 'center' },
});

export default CreateTaskScreen;