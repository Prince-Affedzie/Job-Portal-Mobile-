// screens/client/ClientTaskDetailScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Alert, RefreshControl, SafeAreaView, Dimensions,
  Animated, StatusBar, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import Header from '../../component/tasker/Header';
import ReportForm from '../../component/common/reportForm';
import { clientGetTaskInfo, markTaskAsDoneClient } from '../../api/miniTaskApi';
import { startOrGetChatRoom } from '../../api/chatApi';
import { navigate } from '../../services/navigationService';
import LoadingIndicator from '../../component/common/LoadingIndicator';
import RatingModal from '../../component/common/RatingModal';
import { MediaDisplay } from '../../component/tasker/TaskMediaDisplay';
import ClientRefundNoticeCard from '../../component/client/ClientRefundNoticeCard';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - 16 * 2 - 10) / 2;

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:           '#F4F6FB',
  surface:      '#FFFFFF',
  border:       '#E8ECF2',
  borderStrong: '#D1D9E6',
  primary:      '#1A3461',
  primaryLight: '#E8EEF9',
  primaryMid:   '#243460',
  accent:       '#C9891A',
  accentLight:  '#FDF3E0',
  teal:         '#0F766E',
  tealLight:    '#E0F5F2',
  red:          '#DC2626',
  redLight:     '#FEE2E2',
  purple:       '#7C3AED',
  purpleLight:  '#EDE9FE',
  textPrimary:  '#0D1B35',
  textSecondary:'#4A5B7A',
  textMuted:    '#8FA0BE',
  white:        '#FFFFFF',
  overlay:      'rgba(13,27,53,0.72)',
};

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  open:         { color: C.teal,    bg: C.tealLight,   icon: 'radio-button-on-outline',  label: 'Open'        },
  pending:      { color: C.accent,  bg: C.accentLight, icon: 'time-outline',             label: 'Pending'     },
  assigned:     { color: C.primary, bg: C.primaryLight,icon: 'person-circle-outline',    label: 'Assigned'    },
  'in-progress':{ color: C.accent,  bg: C.accentLight, icon: 'construct-outline',        label: 'In Progress' },
  review:       { color: C.purple,  bg: C.purpleLight, icon: 'eye-outline',              label: 'In Review'   },
  completed:    { color: C.teal,    bg: C.tealLight,   icon: 'checkmark-circle-outline', label: 'Completed'   },
  closed:       { color: C.textMuted, bg: C.border,    icon: 'lock-closed-outline',      label: 'Closed'      },
};
function getStatusCfg(s='') { return STATUS_CONFIG[s.toLowerCase()] || { color: C.textMuted, bg: C.border, icon: 'ellipsis-horizontal', label: s }; }

// ─── Animated fade-in ──────────────────────────────────────────────────────────
function FadeIn({ delay=0, children, style }) {
  const op = React.useRef(new Animated.Value(0)).current;
  const ty = React.useRef(new Animated.Value(14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue:1, duration:380, delay, useNativeDriver:true }),
      Animated.spring(ty,  { toValue:0, tension:60, friction:13, delay, useNativeDriver:true }),
    ]).start();
  }, []);
  return <Animated.View style={[style,{opacity:op,transform:[{translateY:ty}]}]}>{children}</Animated.View>;
}

// ─── Section wrapper ───────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, action, iconName, iconColor, children, delay=0, style }) {
  return (
    <FadeIn delay={delay} style={[s.sectionCard, style]}>
      {(title || action) && (
        <View style={s.secHeader}>
          <View style={s.secTitleRow}>
            {iconName && (
              <View style={[s.secIconBox, { backgroundColor: (iconColor||C.primary)+'18' }]}>
                <Ionicons name={iconName} size={15} color={iconColor||C.primary}/>
              </View>
            )}
            <View>
              {title && <Text style={s.secTitle}>{title}</Text>}
              {subtitle && <Text style={s.secSub}>{subtitle}</Text>}
            </View>
          </View>
          {action && (
            <TouchableOpacity onPress={action.onPress} style={s.secAction}>
              <Text style={s.secActionText}>{action.label}</Text>
              <Ionicons name="chevron-forward" size={14} color={C.primary}/>
            </TouchableOpacity>
          )}
        </View>
      )}
      {children}
    </FadeIn>
  );
}

// ─── Info stat tile ────────────────────────────────────────────────────────────
function StatTile({ icon, iconColor, iconBg, label, value, sub }) {
  return (
    <View style={s.statTile}>
      <View style={[s.statIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor}/>
      </View>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
      {sub ? <Text style={s.statSub} numberOfLines={2}>{sub}</Text> : null}
    </View>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
const ClientTaskDetailScreen = ({ route, navigation }) => {
  const { taskId } = route.params;

  const [task,               setTask]               = useState(null);
  const [loading,            setLoading]            = useState(true);
  const [refreshing,         setRefreshing]         = useState(false);
  const [ratingModal,        setRatingModal]        = useState(false);
  const [showReport,         setShowReport]         = useState(false);

  const loadTask = useCallback(async () => {
    try {
      setLoading(true);
      const res = await clientGetTaskInfo(taskId);
      if (res.status === 200) setTask(res.data);
      else { Alert.alert('Error', 'Task not found'); navigation.goBack(); }
    } catch { Alert.alert('Error', 'Failed to load task details'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [taskId]);

  useEffect(() => { loadTask(); }, []);

  const handleMessage = async () => {
    if (!task?.assignedTo?._id) return;
    try {
      const res = await startOrGetChatRoom({ userId2: task.assignedTo.userId._id, jobId: task._id });
      if (res.status === 200) navigate('ChatWindow', { roomId: res.data._id });
    } catch { Alert.alert('Error', 'Failed to start chat'); }
  };

  const handleMarkDone = () => {
    Alert.alert('Mark as Done', 'This will release payment to the tasker. Proceed?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm & Release', onPress: async () => {
        const res = await markTaskAsDoneClient(taskId);
        if (res.status === 200) {
          Alert.alert('Done!', 'Task marked as completed.');
          setTimeout(() => setRatingModal(true), 800);
          loadTask();
        }
      }},
    ]);
  };

  // Derived flags
  const isAssigned       = task?.assignedTo && !['Open','Pending'].includes(task?.status);
  const isInProgress     = ['Assigned','In-progress','Review'].includes(task?.status);
  const isCompleted      = task?.status?.toLowerCase() === 'completed';
  const canMarkDone      = isInProgress && !isCompleted && !task?.markedDoneByEmployer;
  const canMessage       = isAssigned && !isCompleted;
  const canViewSubs      = isAssigned;
  const canEdit          = ['Open','Pending'].includes(task?.status);

  const statusCfg = getStatusCfg(task?.status || '');
  const location  = task?.locationType === 'on-site'
    ? [task?.address?.city, task?.address?.region].filter(Boolean).join(', ') || 'On-site'
    : 'Remote';
  const deadline  = task?.deadline ? moment(task.deadline).format('MMM D, YYYY') : '—';
  const deadlineRel = task?.deadline ? moment(task.deadline).fromNow() : '';
  const isOverdue = task?.deadline && moment().isAfter(task.deadline) && !isCompleted;

  // ── Loading / not found ────────────────────────────────────────────────────
  if (loading && !refreshing) return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content"/>
      <Header title="Task Details" showBackButton/>
      <LoadingIndicator text="Loading task details…"/>
    </SafeAreaView>
  );

  if (!task) return (
    <SafeAreaView style={s.container}>
      <Header title="Task Details" showBackButton/>
      <View style={s.emptyWrap}>
        <View style={s.emptyIconCircle}>
          <Ionicons name="briefcase-outline" size={40} color={C.textMuted}/>
        </View>
        <Text style={s.emptyTitle}>Task Not Found</Text>
        <Text style={s.emptySub}>This task may have been deleted or is no longer available.</Text>
        <TouchableOpacity style={s.emptyBtn} onPress={()=>navigation.goBack()}>
          <Text style={s.emptyBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="dark-content"/>
      <Header title={task.title} showBackButton/>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);loadTask();}} colors={[C.primary]}/>}
      >

        {/* ── Hero card ──────────────────────────────────────────────────── */}
        <FadeIn delay={0}>
          <View style={s.heroCard}>
            {/* Status pill + dates */}
            <View style={s.heroTopRow}>
              <View style={[s.statusPill, {backgroundColor:statusCfg.bg}]}>
                <Ionicons name={statusCfg.icon} size={13} color={statusCfg.color}/>
                <Text style={[s.statusPillText, {color:statusCfg.color}]}>{statusCfg.label}</Text>
              </View>
              <Text style={s.heroMeta}>Posted {moment(task.createdAt).format('MMM D, YYYY')}</Text>
            </View>

            <Text style={s.heroTitle}>{task.title}</Text>

            {/* Deadline row */}
            <View style={[s.deadlineRow, isOverdue && s.deadlineRowOverdue]}>
              <Ionicons name="calendar-outline" size={14} color={isOverdue ? C.red : C.textMuted}/>
              <Text style={[s.deadlineTxt, isOverdue && {color:C.red}]}>
                Due {deadline} · {isOverdue ? 'Overdue' : deadlineRel}
              </Text>
            </View>
          </View>
        </FadeIn>

        {/* ── Stats grid ────────────────────────────────────────────────── */}
        <FadeIn delay={60}>
          <View style={s.statsGrid}>
            <StatTile
              icon="cash-outline" iconColor={C.teal} iconBg={C.tealLight}
              label="Budget" value={`₵${task.budget}`} sub="Fixed price"
            />
            <StatTile
              icon="location-outline" iconColor={C.primary} iconBg={C.primaryLight}
              label="Location" value={task.locationType === 'on-site' ? 'On-site' : 'Remote'} sub={location}
            />
            <StatTile
              icon="people-outline" iconColor={C.purple} iconBg={C.purpleLight}
              label="Bids" value={task.applicants?.length || 0}
              sub={task.applicants?.length > 0 ? `${task.applicants.length} received` : 'No bids yet'}
            />
            <StatTile
              icon="time-outline" iconColor={C.accent} iconBg={C.accentLight}
              label="Deadline" value={deadline} sub={isOverdue ? '⚠ Overdue' : deadlineRel}
            />
          </View>
        </FadeIn>

        {/* ── Description ───────────────────────────────────────────────── */}
        <SectionCard title="Description" iconName="document-text-outline" iconColor={C.primary} delay={80}>
          <Text style={s.description}>{task.description}</Text>
          {task.media?.length > 0 && (
            <View style={{marginTop:12}}>
              <MediaDisplay media={task.media}/>
            </View>
          )}
        </SectionCard>

        {/* ── Assigned Tasker ───────────────────────────────────────────── */}
        {isAssigned && task.assignedTo && (
          <SectionCard title="Assigned Tasker" iconName="person-circle-outline" iconColor={C.teal} delay={110}>
            <TouchableOpacity
              style={s.taskerRow}
              onPress={()=>navigate('ApplicantProfile',{taskerId:task.assignedTo._id})}
              activeOpacity={0.85}
            >
              <View style={s.taskerAvatarWrap}>
                {task.assignedTo.brandBanner
                  ? <Image source={{uri:task.assignedTo.brandBanner}} style={s.taskerAvatar}/>
                  : <LinearGradient colors={[C.primaryMid,C.primary]} style={s.taskerAvatar}>
                      <Text style={s.taskerAvatarInit}>{task.assignedTo.name?.[0]?.toUpperCase()||'T'}</Text>
                    </LinearGradient>
                }
                <View style={s.taskerOnlineDot}/>
              </View>

              <View style={s.taskerInfo}>
                <Text style={s.taskerName}>{task.assignedTo.businessName}</Text>
                {task.assignedTo.userId.phone && <Text style={s.taskerPhone}>{task.assignedTo.userId.phone}</Text>}
                <View style={s.taskerStatRow}>
                  <View style={s.taskerStat}>
                    <Ionicons name="star" size={13} color={C.accent}/>
                    <Text style={s.taskerStatTxt}>{task.assignedTo.rating?.toFixed(1)||'New'}</Text>
                  </View>
                  <View style={s.taskerStat}>
                    <Ionicons name="checkmark-circle" size={13} color={C.teal}/>
                    <Text style={s.taskerStatTxt}>{task.assignedTo.completedTasks||0} done</Text>
                  </View>
                </View>
              </View>
              <View style={s.taskerChevron}>
                <Ionicons name="chevron-forward" size={18} color={C.textMuted}/>
              </View>
            </TouchableOpacity>
          </SectionCard>
        )}

        {/* ── Requirements & Skills ─────────────────────────────────────── */}
        <SectionCard title="Requirements" iconName="list-outline" iconColor={C.purple} delay={130}>
          {(task.requirements||[]).length > 0
            ? task.requirements.map((r,i) => (
                <View key={i} style={s.reqRow}>
                  <View style={s.reqDot}><Ionicons name="checkmark" size={11} color={C.teal}/></View>
                  <Text style={s.reqText}>{r}</Text>
                </View>
              ))
            : <Text style={s.placeholder}>No specific requirements listed.</Text>
          }

          {task.skillsRequired?.length > 0 && (
            <>
              <View style={s.skillsHeader}>
                <Ionicons name="code-slash-outline" size={14} color={C.primary}/>
                <Text style={s.skillsTitle}>Required Skills</Text>
              </View>
              <View style={s.skillsRow}>
                {task.skillsRequired.map((sk,i) => (
                  <View key={i} style={s.skillPill}>
                    <Text style={s.skillTxt}>{sk}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </SectionCard>

        {/* ── Bids preview ──────────────────────────────────────────────── */}
        {task.applicants?.length > 0 && !isCompleted && (
          <SectionCard
            title="Bids"
            subtitle={`${task.applicants.length} bid${task.applicants.length!==1?'s':''} received`}
            iconName="people-outline" iconColor={C.purple}
            action={{ label:'View all', onPress:()=>navigation.navigate('TaskApplicants',{taskId:task._id,task,assignedTo:task.assignedTo}) }}
            delay={150}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.bidsRow}>
              {task.applicants.slice(0,6).map((b,i) => (
                <View key={i} style={s.bidderCard}>
                  <View style={s.bidderAvatar}>
                    {b.profileImage
                      ? <Image source={{uri:b.profileImage}} style={s.bidderAvatarImg}/>
                      : <Text style={s.bidderInit}>{b.name?.[0]?.toUpperCase()||'A'}</Text>
                    }
                  </View>
                  <Text style={s.bidderName} numberOfLines={1}>{b.name||'Bidder'}</Text>
                  {b.appliedDate && <Text style={s.bidderTime}>{moment(b.appliedDate).fromNow()}</Text>}
                </View>
              ))}
              {task.applicants.length > 6 && (
                <TouchableOpacity
                  style={s.moreBidders}
                  onPress={()=>navigation.navigate('TaskApplicants',{taskId:task._id,task,assignedTo:task.assignedTo})}
                >
                  <Text style={s.moreBiddersTxt}>+{task.applicants.length-6}</Text>
                  <Text style={s.moreBiddersSub}>more</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </SectionCard>
        )}

        {/* ── Completion progress ───────────────────────────────────────── */}
        {isInProgress && (
          <SectionCard title="Completion Progress" iconName="flag-outline" iconColor={C.accent} delay={170}>
            {/* Step 1 — Client */}
            <View style={s.progressStep}>
              <View style={[s.progressDot, task.markedDoneByEmployer && s.progressDotDone]}>
                {task.markedDoneByEmployer
                  ? <Ionicons name="checkmark" size={12} color={C.white}/>
                  : <View style={s.progressDotInner}/>
                }
              </View>
              <View style={s.progressConnector}>
                <View style={[s.progressLine, task.markedDoneByEmployer && s.progressLineDone]}/>
              </View>
              <View style={s.progressContent}>
                <Text style={[s.progressLabel, task.markedDoneByEmployer && {color:C.teal}]}>
                  You marked as done
                </Text>
                {task.employerDoneAt
                  ? <Text style={s.progressTime}>{moment(task.employerDoneAt).format('MMM D, h:mm A')}</Text>
                  : <Text style={s.progressPending}>Pending your confirmation</Text>
                }
              </View>
            </View>

            {/* Step 2 — Tasker */}
            <View style={[s.progressStep, {marginTop:0}]}>
              <View style={[s.progressDot, task.markedDoneByTasker && s.progressDotDone]}>
                {task.markedDoneByTasker
                  ? <Ionicons name="checkmark" size={12} color={C.white}/>
                  : <View style={s.progressDotInner}/>
                }
              </View>
              <View style={s.progressContent}>
                <Text style={[s.progressLabel, task.markedDoneByTasker && {color:C.teal}]}>
                  Tasker marked as done
                </Text>
                {task.taskerDoneAt
                  ? <Text style={s.progressTime}>{moment(task.taskerDoneAt).format('MMM D, h:mm A')}</Text>
                  : <Text style={s.progressPending}>Awaiting tasker confirmation</Text>
                }
              </View>
            </View>

            {/* Both done banner */}
            {task.markedDoneByEmployer && task.markedDoneByTasker && (
              <View style={s.completedBanner}>
                <Ionicons name="checkmark-done-circle" size={20} color={C.teal}/>
                <Text style={s.completedBannerTxt}>Task completed successfully!</Text>
              </View>
            )}
          </SectionCard>
        )}

        <ClientRefundNoticeCard task={task} isTaskOwner={true}/>

        <View style={{height:160}}/>
      </ScrollView>

      {/* ── Bottom action bar ──────────────────────────────────────────── */}
      <View style={s.actionBar}>
        {/* Primary CTA buttons */}
        <View style={s.primaryRow}>
          {canMessage && (
            <TouchableOpacity style={[s.ctaBtn, s.ctaMessage]} onPress={handleMessage} activeOpacity={0.88}>
              <Ionicons name="chatbubble-ellipses" size={18} color={C.white}/>
              <Text style={s.ctaBtnTxt}>Message Tasker</Text>
            </TouchableOpacity>
          )}
          {canMarkDone && (
            <TouchableOpacity style={[s.ctaBtn, s.ctaDone]} onPress={handleMarkDone} activeOpacity={0.88}>
              <Ionicons name="checkmark-done" size={18} color={C.white}/>
              <Text style={s.ctaBtnTxt}>Mark as Completed</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Secondary icon actions */}
        <View style={s.secondaryRow}>
          {canEdit && (
            <TouchableOpacity style={s.iconAction} onPress={()=>navigate('EditTask',{taskId,task})}>
              <View style={[s.iconActionBox,{backgroundColor:C.primaryLight}]}>
                <Ionicons name="create-outline" size={20} color={C.primary}/>
              </View>
              <Text style={s.iconActionLabel}>Edit</Text>
            </TouchableOpacity>
          )}
          {task.applicants?.length > 0 && !isCompleted && (
            <TouchableOpacity style={s.iconAction} onPress={()=>navigation.navigate('TaskApplicants',{taskId:task._id,task,assignedTo:task.assignedTo})}>
              <View style={[s.iconActionBox,{backgroundColor:C.purpleLight}]}>
                <Ionicons name="people-outline" size={20} color={C.purple}/>
                {task.applicants.length > 0 && (
                  <View style={s.iconBadge}><Text style={s.iconBadgeTxt}>{task.applicants.length}</Text></View>
                )}
              </View>
              <Text style={s.iconActionLabel}>Bids</Text>
            </TouchableOpacity>
          )}
          {canViewSubs && (
            <TouchableOpacity style={s.iconAction} onPress={()=>navigation.navigate('TaskSubmissions',{taskId:task._id,taskTitle:task.title})}>
              <View style={[s.iconActionBox,{backgroundColor:C.tealLight}]}>
                <Ionicons name="document-attach-outline" size={20} color={C.teal}/>
              </View>
              <Text style={s.iconActionLabel}>Submissions</Text>
            </TouchableOpacity>
          )}
          {isInProgress && (
            <TouchableOpacity style={s.iconAction} onPress={()=>setShowReport(true)}>
              <View style={[s.iconActionBox,{backgroundColor:C.redLight}]}>
                <Ionicons name="flag-outline" size={20} color={C.red}/>
              </View>
              <Text style={[s.iconActionLabel,{color:C.red}]}>Report</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ReportForm
        isVisible={showReport}
        onClose={()=>setShowReport(false)}
        reportedUserId={task.assignedTo._id}
        taskId={task._id}
        taskTitle={task.title.substring(0, 40)}
        onReportSubmitted={()=>Alert.alert('Submitted','Your report has been submitted.')}
      />

      <RatingModal
        visible={ratingModal}
        onClose={()=>setRatingModal(false)}
        userId={task.assignedTo?._id}
        userName={task.assignedTo?.name}
        userRole="tasker"
      />
    </SafeAreaView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex:1, backgroundColor:C.bg },
  scroll:    { paddingBottom:20 },

  // Empty state
  emptyWrap:       { flex:1, alignItems:'center', justifyContent:'center', padding:40 },
  emptyIconCircle: { width:88, height:88, borderRadius:44, backgroundColor:C.border, alignItems:'center', justifyContent:'center', marginBottom:20 },
  emptyTitle:      { fontSize:20, fontWeight:'800', color:C.textPrimary, marginBottom:8, textAlign:'center' },
  emptySub:        { fontSize:14, color:C.textSecondary, textAlign:'center', lineHeight:21, marginBottom:24 },
  emptyBtn:        { backgroundColor:C.primary, paddingHorizontal:28, paddingVertical:14, borderRadius:14 },
  emptyBtnText:    { color:C.white, fontSize:15, fontWeight:'700' },

  // Hero card
  heroCard: {
    backgroundColor:C.surface, margin:16, marginBottom:10,
    borderRadius:20, padding:20,
    borderWidth:1, borderColor:C.border,
    shadowColor:'#1A3461', shadowOffset:{width:0,height:4}, shadowOpacity:0.08, shadowRadius:14, elevation:5,
  },
  heroTopRow:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  statusPill:    { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:12, paddingVertical:6, borderRadius:20 },
  statusPillText:{ fontSize:12, fontWeight:'700', letterSpacing:0.2 },
  heroMeta:      { fontSize:12, color:C.textMuted },
  heroTitle:     { fontSize:22, fontWeight:'800', color:C.textPrimary, lineHeight:30, marginBottom:10 },
  deadlineRow:   { flexDirection:'row', alignItems:'center', gap:6, paddingVertical:8, paddingHorizontal:12, borderRadius:10, backgroundColor:C.bg },
  deadlineRowOverdue: { backgroundColor:C.redLight },
  deadlineTxt:   { fontSize:13, color:C.textMuted, fontWeight:'500' },

  // Stats grid
  statsGrid: {
    flexDirection:'row', flexWrap:'wrap',
    paddingHorizontal:16, gap:10, marginBottom:10,
  },
  statTile: {
    width:CARD_W, backgroundColor:C.surface,
    borderRadius:16, padding:14,
    borderWidth:1, borderColor:C.border,
    shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.04, shadowRadius:8, elevation:2,
  },
  statIconBox: { width:36, height:36, borderRadius:11, alignItems:'center', justifyContent:'center', marginBottom:10 },
  statLabel:   { fontSize:11, fontWeight:'700', color:C.textMuted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 },
  statValue:   { fontSize:18, fontWeight:'800', color:C.textPrimary, marginBottom:3 },
  statSub:     { fontSize:11, color:C.textMuted, lineHeight:15 },

  // Section card
  sectionCard: {
    backgroundColor:C.surface, marginHorizontal:16, marginBottom:10,
    borderRadius:18, padding:18,
    borderWidth:1, borderColor:C.border,
    shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.04, shadowRadius:8, elevation:2,
  },
  secHeader:   { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:16, paddingBottom:14, borderBottomWidth:1, borderBottomColor:C.border },
  secTitleRow: { flexDirection:'row', alignItems:'center', gap:10 },
  secIconBox:  { width:30, height:30, borderRadius:9, alignItems:'center', justifyContent:'center' },
  secTitle:    { fontSize:15, fontWeight:'800', color:C.textPrimary },
  secSub:      { fontSize:12, color:C.textMuted, marginTop:1 },
  secAction:   { flexDirection:'row', alignItems:'center', gap:3 },
  secActionText:{ fontSize:13, color:C.primary, fontWeight:'600' },

  // Description
  description: { fontSize:15, color:C.textSecondary, lineHeight:24 },
  placeholder: { fontSize:14, color:C.textMuted, fontStyle:'italic' },

  // Tasker
  taskerRow:       { flexDirection:'row', alignItems:'center', gap:14, padding:4 },
  taskerAvatarWrap:{ position:'relative' },
  taskerAvatar:    { width:60, height:60, borderRadius:30, justifyContent:'center', alignItems:'center' },
  taskerAvatarInit:{ color:C.white, fontSize:24, fontWeight:'700' },
  taskerOnlineDot: { position:'absolute', bottom:2, right:2, width:14, height:14, borderRadius:7, backgroundColor:C.teal, borderWidth:2, borderColor:C.white },
  taskerInfo:      { flex:1 },
  taskerName:      { fontSize:16, fontWeight:'700', color:C.textPrimary, marginBottom:2 },
  taskerPhone:     { fontSize:13, color:C.textSecondary, marginBottom:6 },
  taskerStatRow:   { flexDirection:'row', gap:14 },
  taskerStat:      { flexDirection:'row', alignItems:'center', gap:4 },
  taskerStatTxt:   { fontSize:13, color:C.textSecondary },
  taskerChevron:   { width:32, height:32, borderRadius:8, backgroundColor:C.bg, alignItems:'center', justifyContent:'center' },

  // Requirements
  reqRow:      { flexDirection:'row', alignItems:'flex-start', gap:10, marginBottom:10 },
  reqDot:      { width:22, height:22, borderRadius:11, backgroundColor:C.tealLight, alignItems:'center', justifyContent:'center', marginTop:1 },
  reqText:     { flex:1, fontSize:14, color:C.textSecondary, lineHeight:21 },
  skillsHeader:{ flexDirection:'row', alignItems:'center', gap:7, marginTop:18, marginBottom:10, paddingTop:14, borderTopWidth:1, borderTopColor:C.border },
  skillsTitle: { fontSize:13, fontWeight:'700', color:C.textPrimary },
  skillsRow:   { flexDirection:'row', flexWrap:'wrap', gap:8 },
  skillPill:   { backgroundColor:C.primaryLight, paddingHorizontal:13, paddingVertical:6, borderRadius:20, borderWidth:1, borderColor:C.primary+'25' },
  skillTxt:    { fontSize:12, color:C.primary, fontWeight:'600' },

  // Bids
  bidsRow:     { paddingVertical:4, gap:14, flexDirection:'row' },
  bidderCard:  { alignItems:'center', width:72 },
  bidderAvatar:{ width:52, height:52, borderRadius:26, backgroundColor:C.primaryLight, justifyContent:'center', alignItems:'center', marginBottom:6, overflow:'hidden' },
  bidderAvatarImg:{ width:52, height:52, borderRadius:26 },
  bidderInit:  { color:C.primary, fontSize:18, fontWeight:'700' },
  bidderName:  { fontSize:12, fontWeight:'600', color:C.textSecondary, textAlign:'center', marginBottom:2 },
  bidderTime:  { fontSize:10, color:C.textMuted, textAlign:'center' },
  moreBidders: { width:72, height:52, borderRadius:14, backgroundColor:C.bg, justifyContent:'center', alignItems:'center', borderWidth:1, borderColor:C.borderStrong, borderStyle:'dashed', marginTop:0 },
  moreBiddersTxt:{ fontSize:14, fontWeight:'800', color:C.textSecondary },
  moreBiddersSub:{ fontSize:10, color:C.textMuted },

  // Progress
  progressStep:    { flexDirection:'row', alignItems:'flex-start', gap:12, marginBottom:16 },
  progressDot:     { width:28, height:28, borderRadius:14, backgroundColor:C.border, alignItems:'center', justifyContent:'center', marginTop:2 },
  progressDotDone: { backgroundColor:C.teal },
  progressDotInner:{ width:10, height:10, borderRadius:5, backgroundColor:C.textMuted },
  progressConnector:{ position:'absolute', left:13, top:30, bottom:-16, width:2, zIndex:0 },
  progressLine:    { flex:1, width:2, backgroundColor:C.border },
  progressLineDone:{ backgroundColor:C.teal },
  progressContent: { flex:1 },
  progressLabel:   { fontSize:14, fontWeight:'700', color:C.textSecondary, marginBottom:3 },
  progressTime:    { fontSize:12, color:C.textMuted },
  progressPending: { fontSize:12, color:C.textMuted, fontStyle:'italic' },
  completedBanner: { flexDirection:'row', alignItems:'center', gap:10, backgroundColor:C.tealLight, padding:14, borderRadius:12, marginTop:8 },
  completedBannerTxt:{ fontSize:14, fontWeight:'700', color:C.teal },

  // Action bar
  actionBar: {
    position:'absolute', bottom:30, left:0, right:0,
    backgroundColor:C.surface,
    paddingHorizontal:16, paddingTop:14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth:1, borderTopColor:C.border,
    shadowColor:'#000', shadowOffset:{width:0,height:-4}, shadowOpacity:0.09, shadowRadius:12, elevation:12,
  },
  primaryRow: { gap:10, marginBottom:14 },
  ctaBtn:     { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, paddingVertical:15, borderRadius:14 },
  ctaMessage: { backgroundColor:C.primary, shadowColor:C.primary, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:8, elevation:5 },
  ctaDone:    { backgroundColor:C.teal, shadowColor:C.teal, shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:8, elevation:5 },
  ctaBtnTxt:  { color:C.white, fontSize:15, fontWeight:'700' },

  secondaryRow: { flexDirection:'row', justifyContent:'space-around' },
  iconAction:   { alignItems:'center', gap:5 },
  iconActionBox:{ width:44, height:44, borderRadius:13, alignItems:'center', justifyContent:'center', position:'relative' },
  iconActionLabel:{ fontSize:11, fontWeight:'600', color:C.textSecondary },
  iconBadge:    { position:'absolute', top:-5, right:-5, backgroundColor:C.red, borderRadius:9, minWidth:18, height:18, alignItems:'center', justifyContent:'center', paddingHorizontal:4, borderWidth:2, borderColor:C.white },
  iconBadgeTxt: { fontSize:9, fontWeight:'800', color:C.white },
});

export default ClientTaskDetailScreen;