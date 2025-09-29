import { View, Text, ScrollView, StyleSheet,Dimensions,TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useMemo, useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { CircularProgress } from 'react-native-circular-progress';
import { StarRatingDisplay } from 'react-native-star-rating-widget';
import Fontisto from '@expo/vector-icons/Fontisto';


const width = Dimensions.get('window').width

export default function DashboardScreen() {
    const user = 'User';
    const totalTasks = 12;
    const completedTasks = 2;
    const progressPercentage = (completedTasks / totalTasks) * 100;
    const all = 12;

const [tab, setTab] = useState('all'); // 'all' | 'active' | 'review' | 'in_progress'

const jobs = [
  { id: '1', title: 'Home Cleaning', budget: 300, applicants: 2, assignedTo: 'Adwoa Yeboah', status: 'in_progress', updatedAt: '9 days ago' },
  { id: '2', title: 'Website Redesigning', budget: 500, applicants: 0, assignedTo: null,            status: 'active',       updatedAt: 'yesterday' },
  { id: '3', title: 'Transcribe 10-Minute Audio', budget: 100, applicants: 1, assignedTo: 'Mike Obiri', status: 'in_progress', updatedAt: '27 days ago' },
  { id: '4', title: 'Logo Touch-Up', budget: 120, applicants: 4, assignedTo: 'Not assigned', status: 'review', updatedAt: '2 days ago' },
];

const counts = useMemo(() => ({
  all: jobs.length,
  active: jobs.filter(j => j.status === 'active').length,
  review: jobs.filter(j => j.status === 'review').length,
  in_progress: jobs.filter(j => j.status === 'in_progress').length,
}), [jobs]);

const filtered = useMemo(() => (
  tab === 'all' ? jobs : jobs.filter(j => j.status === tab)
), [tab, jobs]);

const statusStyles = {
  active:      { chipBg: '#d1fae5', chipText: '#065f46', iconBg: '#e8fff3', dot: '#10b981', label: 'Active' },
  review:      { chipBg: '#ffe8d6', chipText: '#994600', iconBg: '#fff1e6', dot: '#f59e0b', label: 'Review' },
  in_progress: { chipBg: '#ffedd5', chipText: '#9a3412', iconBg: '#fff3e6', dot: '#f97316', label: 'In Progress' },
};

const StatusPill = ({ status, label }) => {
  const s = statusStyles[status] || statusStyles.active;
  return (
    <View style={[styles.pill, { backgroundColor: s.chipBg }]}>
      <Ionicons
        name={status === 'active' ? 'checkmark-circle' : status === 'review' ? 'alert-circle' : 'play'}
        size={14}
        color={s.chipText}
        style={{ marginRight: 6 }}
      />
      <Text style={[styles.pillText, { color: s.chipText }]}>{label}</Text>
    </View>
  );
};



    return (
        <SafeAreaView>
            <ScrollView style={styles.scroll}>
                <LinearGradient
                    style={styles.welcomeContainer}
                    colors={['#09287eff','#226be0ff']}
                    start={{x:1,y:1}}
                    end={{x:0,y:0}}
                >
                    <Text style={styles.welcomeText}>Welcome back, {user}</Text>
                    <Text style={styles.subText}>You have 4 active tasks and 6 in progress</Text>
                    
                    {/* Progress Bar Section */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressText}>Task Completion</Text>
                            <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
                        </View>
                        
                        {/* Progress Bar */}
                        <View style={styles.progressBarBackground}>
                            <LinearGradient
                                style={[styles.progressBarFill, { width: `${progressPercentage}%` }]}
                                colors={['#4CD964', '#5DE24C']}
                                start={{x:0,y:0}}
                                end={{x:1,y:0}}
                            />
                        </View>
                        
                        <View style={styles.progressStats}>
                            <Text style={styles.progressStatText}>{completedTasks} completed</Text>
                            <Text style={styles.progressStatText}>{totalTasks} total tasks</Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Rest of your existing code remains the same */}
                <View style={styles.qucikActionContainer}>
                    <Text style={styles.quickActionText}>Quick Actions</Text>
                    {/* group Tile*/}
                    <View style= {styles.groupTiles}>
                        <TouchableOpacity style={styles.tile}>
                            <LinearGradient
                                style={styles.addIcon}
                                colors={['#09287eff','#287affff']}
                                start={{x:1,y:1}}
                                end={{x:0,y:0}}
                                >

                                <FontAwesome6 name="add" size={30} color="white" />
                            </LinearGradient>
                            <Text style={styles.tileText}>Post New Task</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.tile}>
                            <LinearGradient
                                style={styles.addIcon}
                                colors={['#0c5627ff','#2be06eff']}
                                start={{x:1,y:1}}
                                end={{x:0,y:0}}
                                >
                                <Ionicons name="checkmark-sharp" size={30} color="white" />
                            </LinearGradient>
                            <Text style={styles.tileText}>Review Submissions</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.tile}>
                            <LinearGradient
                                style={styles.addIcon}
                                colors={['#3f1d5eff','#c07efeff']}
                                start={{x:1,y:1}}
                                end={{x:0,y:0}}
                                >
                                <Ionicons name="chatbubbles-sharp" size={30} color="white" />
                            </LinearGradient>
                            <Text style={styles.tileText}>Message Taskers</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                    <TouchableOpacity style={styles.taskContainer}>
                        <View style={styles.taskCol}>
                            <Text style={styles.taskHeader}>Active Tasks</Text>
                            <Text style={styles.taskMiddle}>4</Text>
                            <Text style={styles.taskFooter}>+2 from last week</Text>
                        </View>
                        <View style={styles.taskIcon}>
                            <FontAwesome6 name="list" size={18} color="#226be0ff" />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.taskContainer}>
                        <View style={styles.taskCol}>
                            <Text style={styles.taskHeader}>In Progress</Text>
                            <Text style={styles.taskMiddle}>4</Text>
                            <Text style={styles.taskFooter}>+2 from last week</Text>
                        </View>
                        <View style={styles.progressIcon}>
                            <MaterialCommunityIcons name="progress-clock" size={18} color="#c5a800ff" />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.taskContainer}>
                        <View style={styles.taskCol}>
                            <Text style={styles.taskHeader}>Pending Review</Text>
                            <Text style={styles.taskMiddle}>4</Text>
                            <Text style={styles.taskFooter}>+2 from last week</Text>
                        </View>
                        <View style={styles.pendingIcon}>
                            <FontAwesome5 name="exclamation" size={18} color="#f88000ff" />
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.taskContainer}>
                        <View style={styles.taskCol}>
                            <Text style={styles.taskHeader}>Total spent</Text>
                            <Text style={styles.taskMiddle}>4</Text>
                            <Text style={styles.taskFooter}>+2 from last week</Text>
                        </View>
                        <View style={styles.totalIcon}>
                            <FontAwesome5 name="money-bill-wave" size={18} color="#008122ff" />
                        </View>
                    </TouchableOpacity>
                    
                    {/* Micro Jobs */}
                    <View style={styles.microWrap}>
                    <Text style={styles.microTitle}>Your Micro Jobs</Text>

                    <View style={styles.tabsRow}>
                        {[
                        { key: 'all',         label: `All (${counts.all})` },
                        { key: 'active',      label: `Active (${counts.active})` },
                        { key: 'review',      label: `Review (${counts.review})` },
                        { key: 'in_progress', label: `In-Progress (${counts.in_progress})` },
                        ].map(t => {
                        const isActive = tab === t.key;
                        return (
                            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
                            style={[styles.tabBtn, isActive && styles.tabBtnActive]}>
                            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{t.label}</Text>
                            </TouchableOpacity>
                        );
                        })}
                    </View>

                    {filtered.map(job => {
                        const s = statusStyles[job.status] || statusStyles.active;
                        return (
                        <TouchableOpacity key={job.id} style={styles.jobCard}>
                            <View style={styles.jobHeaderRow}>
                            <View style={[styles.iconCircle, { backgroundColor: s.iconBg }]}>
                                <FontAwesome5 name="briefcase" size={16} color={s.dot} />
                            </View>
                            <Text numberOfLines={1} style={styles.jobTitle}>{job.title}</Text>
                            </View>

                            <View style={styles.metaRow}>
                            <Text style={styles.metaText}>{job.budget}</Text>
                            <View style={styles.dot}/>
                            <Text style={styles.metaText}>{job.applicants} applicants</Text>
                            </View>

                            <Text style={styles.assignedText}>
                            Assigned to: {job.assignedTo ?? 'Not assigned'}
                            </Text>

                            <View style={styles.statusRow}>
                            <StatusPill status={job.status} label={s.label} />
                            </View>

                            <Text style={styles.timeAgo}>{job.updatedAt}</Text>
                        </TouchableOpacity>
                        );
                    })}
                    </View>
                    <View style={styles.performanceContainer}>
                        <Text style={styles.performanceHeader}>Performance Insights</Text>
                        <View style={styles.circularProgressContainer}>
                            <CircularProgress
                            size={220}
                            width={15}
                            fill={90} // Percentage fill
                            tintColor="#6f35a5ff"
                            backgroundColor="#c2c2c2ff"
                            onAnimationComplete={() => console.log('onAnimationComplete')}
                            rotation={0}
                            lineCap='round'
                            
                            />
                            <View style={styles.progressInner}>
                                <Text style={styles.progressInnerText}>90%</Text>
                                <Text style={styles.progressInnerSub}>Completion Rate</Text>
                            </View>
                        </View>
                        <View style= {styles.starContainer}>
                            <StarRatingDisplay rating={4.5} starSize={45} color="#f59e0b" />
                            <Text style={styles.progressInnerText}>4.5/5</Text>
                            <Text style={styles.progressInnerSub}>Tasker Satisfaction</Text>
                        </View>
                        <View style={styles.response}>
                            <Fontisto name="stopwatch" size={50} color="#008122ff" style={{padding:5}} />
                            <View style={{height:10}}/>
                            <Text style={styles.progressInnerText}>2.4h</Text>
                            <Text style={styles.progressInnerSub}>Average Response Time</Text>
                        </View>
                        <View style={styles.line}/>
                        <Text style={styles.update}>Updated 2 hours ago</Text>
                    </View>

            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    scroll:{
        marginBottom:-35,
    },
    welcomeContainer:{
        marginHorizontal:20,
        flex:1,
        backgroundColor:'blue',
        height:220, // Increased height to accommodate progress bar
        borderRadius: 20,
        padding:20,
        elevation:5,
        justifyContent:'space-around'
    },
    subText:{
        color:'white',
        fontSize:16,
        marginBottom:10
    },
    welcomeText:{
        color:'white',
        fontSize:22,
        fontWeight:'bold',
        marginBottom:10
    },
    // Progress Bar Styles
    progressContainer: {
        marginTop: 10,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    progressPercentage: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    progressBarBackground: {
        width: '100%',
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    progressStatText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12,
    },
    quickActionText:{
        marginTop:20,
        fontSize:22,
        fontWeight:'bold',
        marginBottom:10,
    },
    qucikActionContainer:{
        margin:20,
        flex:1,
    },
    groupTiles:{
        flexDirection:'row',
    },
    tile:{
        flex:1,
        height:120,
        borderRadius:20,
        padding:10,
        justifyContent:'center',
        alignItems:'center',
        justifyContent:'space-between'
    },
    tileText:{
        color:'#434343ff',
        fontWeight:'bold',
        fontSize: 15,
        textAlign:'center'
    },
    addIcon:{
        paddingVertical:10,
        paddingHorizontal:12,
        backgroundColor:'#226be0ff',
        borderRadius:60
    },
    reviewIcon:{
        paddingVertical:10,
        paddingHorizontal:12,
        borderRadius:60
    },
    messageIcon:{
        paddingVertical:10,
        paddingHorizontal:12,
        borderRadius:60
    },
    taskContainer:{
        flexDirection:"row",
        justifyContent:'space-between',
        padding:20,
        marginVertical:10,
        marginHorizontal:20,
        flex:1,
        backgroundColor:'white',
        height:140,
        borderRadius:20,
        elevation:3,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 2.84,
    },
    taskHeader:{
        fontSize:16,
        fontWeight:'bold',
        color:'#434343ff'
    },
    taskMiddle:{
        fontSize:30,
        fontWeight:'700'
    },
    taskFooter:{
        color:'#17833fff'
    },
    taskCol:{
        justifyContent:'space-around'
    },
    taskIcon:{
        backgroundColor:'#dce9fdff',
        height:40,
        width:40,
        borderRadius:30,
        alignItems:'center',
        justifyContent:'center'
    },
    progressIcon:{
        backgroundColor:'#faf5d9ff',
        height:40,
        width:40,
        borderRadius:30,
        alignItems:'center',
        justifyContent:'center'
    },
    pendingIcon:{
        backgroundColor:'#ffe5caff',
        height:40,
        width:40,
        borderRadius:30,
        alignItems:'center',
        justifyContent:'center'
    },
    totalIcon:{
        backgroundColor:'#b7f4c7ff',
        height:40,
        width:40,
        borderRadius:30,
        alignItems:'center',
        justifyContent:'center'
    },
    microWrap: {
    margin: 20,
    marginBottom: 24,
    marginTop:30
    },
    microTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    },
    tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    },
    tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#d5dcf2ff',
    },
    tabBtnActive: {
    backgroundColor: '#7caae5ff',
    //borderColor:'#1d4ed8',
    //borderWidth:2
    },
    tabText: {
    color: '#475569',
    fontWeight: '600',
    },
    tabTextActive: {
    color: '#0033bfff',
    },

    jobCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    },
    jobHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 10,
    },
    iconCircle: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    },
    jobTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    },
    metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 6,
    },
    metaText: {
    color: '#6b7280',
    fontSize: 13,
    },
    dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    marginHorizontal: 8,
    },
    assignedText: {
    color: '#6b7280',
    marginBottom: 10,
    },
    statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    },
    pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 999,
    },
    pillText: {
    fontWeight: '600',
    fontSize: 13,
    },
    timeAgo: {
    color: '#9ca3af',
    fontSize: 12,
    },
    performanceContainer: {
        backgroundColor: 'white',
        margin: 20,
        padding: 20,
        borderRadius: 20,
        elevation: 3,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    performanceHeader:{
        marginBottom:40,
        fontSize:22,
        fontWeight: '700',
        color: '#111827',
    },
    circularProgressContainer:{
        alignItems:'center',
    },
    progressInner:{
        position:'absolute',
        alignItems:'center',
        alignContent:'center',
        justifyContent:'center',
        height:220
    },
    progressInnerText:{
        fontSize:'30',
        fontWeight:'800',
        //color:'#6f35a5ff'
    },
    progressInnerSub:{
        fontSize:16,
        fontWeight:'bold'
    },
    starContainer:{
        alignItems:'center',
        marginTop:60
    },
    response:{
        marginTop:60,
        alignItems:'center'
    },
    line:{
        margin:10,
        flex:1,
        borderBottomColor:'#cecacaff',
        borderBottomWidth: 1.5,
    },
    update:{
        margin:10,
        fontSize:15,
        fontWeight:'500',
        color:'#3e3e3eff'
    }
});