import { View, Text, SafeAreaView, ScrollView, StyleSheet, Dimensions, TouchableOpacity, RefreshControl } from 'react-native'
import React, { useMemo, useState, useContext, useEffect } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import Ionicons from '@expo/vector-icons/Ionicons'
import { AuthContext } from "../../context/AuthContext" 
import { PosterContext } from '../../context/PosterContext'
import Header from "../../component/tasker/Header";
import { navigate } from '../../services/navigationService'
import LoadingIndicator from '../../component/common/LoadingIndicator'

const { width } = Dimensions.get('window')

export default function DashboardScreen() {
    const { user } = useContext(AuthContext)
    const { postedTasks, loading, loadPostedTasks, payments, fetchPayments } = useContext(PosterContext)
    const [refreshing, setRefreshing] = useState(false)

    const onRefresh = async () => {
        setRefreshing(true)
        await loadPostedTasks(user.id)
        setRefreshing(false)
    }

    useEffect(() => {
        loadPostedTasks()
        fetchPayments()
    }, [])

    // TRUTHFUL Statistics - Only what poster actually needs to act on
    const dashboardStats = useMemo(() => {
        if (!postedTasks || postedTasks.length === 0) {
            return {
                totalTasks: 0,
                requiresMyAction: 0,
                awaitingMyReview: 0,
                inProgress: 0,
                completedThisWeek: 0,
                totalSpent: 0,
                inEscrow: 0
            }
        }

        const totalTasks = postedTasks.length
        
        // WHAT ACTUALLY REQUIRES POSTER'S ATTENTION:
        const requiresMyAction = postedTasks.filter(task => 
            task.status === 'Review' || // Needs to review submission
            (task.status === 'Assigned' && task.assignmentAccepted) // Tasker is working, poster can monitor
        ).length

        const awaitingMyReview = postedTasks.filter(task => 
            task.status === 'Review'
        ).length

        const inProgress = postedTasks.filter(task => 
            task.status === 'In-progress' || 
            (task.status === 'Assigned' && task.assignmentAccepted)
        ).length

        const completedThisWeek = postedTasks.filter(task => {
            if (task.status !== 'Completed') return false
            const completionDate = new Date(task.updatedAt || task.createdAt)
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            return completionDate > oneWeekAgo
        }).length

        const totalSpent = payments
            .filter(payment => payment.status === 'completed')
            .reduce((sum, payment) => sum + (payment.amount || 0), 0)

        const inEscrow = payments
            .filter(payment => payment.status === 'in_escrow')
            .reduce((sum, payment) => sum + (payment.amount || 0), 0)

        return {
            totalTasks,
            requiresMyAction,
            awaitingMyReview,
            inProgress,
            completedThisWeek,
            totalSpent,
            inEscrow
        }
    }, [postedTasks, payments])

    // ACTUAL PRIORITY ITEMS - Only what poster needs to DO
    const priorityActions = useMemo(() => {
        if (!postedTasks) return []
        
        const actions = []

        // 1. Tasks waiting for review (MOST IMPORTANT - poster must act)
        postedTasks.forEach(task => {
            if (task.status === 'Review') {
                actions.push({
                    id: task._id + '_review',
                    type: 'review',
                    title: 'Review Submission',
                    taskTitle: task.title,
                    taskId: task._id,
                    priority: 'high',
                    description: 'Awaiting your approval',
                    icon: 'document-text-outline',
                    color: '#EF4444',
                    timestamp: task.updatedAt
                })
            }
        })

        // 2. Tasks with approaching deadlines (monitoring, not action)
        postedTasks.forEach(task => {
            if (task.deadline && !['Completed', 'Closed'].includes(task.status)) {
                const deadline = new Date(task.deadline)
                const now = new Date()
                const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
                
                if (daysUntilDeadline <= 2) {
                    actions.push({
                        id: task._id + '_deadline',
                        type: 'deadline',
                        title: 'Deadline Approaching',
                        taskTitle: task.title,
                        taskId: task._id,
                        priority: daysUntilDeadline === 1 ? 'high' : 'medium',
                        description: `${daysUntilDeadline} day${daysUntilDeadline === 1 ? '' : 's'} left`,
                        icon: 'calendar-outline',
                        color: '#F59E0B',
                        timestamp: task.deadline
                    })
                }
            }
        })

        // 3. Recently assigned tasks (just for info)
        postedTasks.forEach(task => {
            if (task.status === 'Assigned' && !task.assignmentAccepted) {
                actions.push({
                    id: task._id + '_assigned',
                    type: 'assigned',
                    title: 'Task Assigned',
                    taskTitle: task.title,
                    taskId: task._id,
                    priority: 'low',
                    description: 'Waiting for tasker acceptance',
                    icon: 'person-outline',
                    color: '#6366F1',
                    timestamp: task.updatedAt
                })
            }
        })

        return actions
            .sort((a, b) => {
                // Sort by priority: high > medium > low, then by timestamp
                const priorityOrder = { high: 3, medium: 2, low: 1 }
                return priorityOrder[b.priority] - priorityOrder[a.priority] || 
                       new Date(b.timestamp) - new Date(a.timestamp)
            })
            .slice(0, 5) // Limit to 5 most important
    }, [postedTasks])

    // CLEAR Navigation - Each button goes to the RIGHT place
    const quickActions = [
        {
            id: 'post-task',
            title: 'Post New Task',
            icon: 'add-circle-outline',
            color: ['#6366F1', '#4F46E5'],
            description: 'Create a new task',
            screen: 'CreateTask'
        },
        {
            id: 'my-tasks',
            title: 'My Tasks',
            icon: 'briefcase-outline',
            color: ['#10B981', '#059669'],
            description: 'View all your tasks',
            screen: 'PostedTasks'
        },
        {
            id: 'review',
            title: 'Review Work',
            icon: 'document-text-outline',
            color: ['#F59E0B', '#D97706'],
            description: `${dashboardStats.awaitingMyReview} to review`,
            screen: 'PostedTasks',
            params: { filter: 'review' }
        },
        {
            id: 'payments',
            title: 'Payments',
            icon: 'wallet-outline',
            color: ['#8B5CF6', '#7C3AED'],
            description: `GHS ${dashboardStats.inEscrow} in escrow`,
            screen: 'Payments'
        }
    ]

    const handleQuickActionPress = (action) => {
        if (action.params) {
            navigate(action.screen, action.params)
        } else {
            navigate(action.screen)
        }
    }

    const handlePriorityActionPress = (action) => {
        // Each priority item goes to the RIGHT screen with the RIGHT context
        switch (action.type) {
            case 'review':
                navigate('ClientTaskDetail', { 
                    taskId: action.taskId,
                    focus: 'submissions'
                })
                break
            case 'deadline':
            case 'assigned':
                navigate('ClientTaskDetail', { 
                    taskId: action.taskId 
                })
                break
            default:
                navigate('PostedTasks')
        }
    }

    const getPriorityIcon = (priority) => {
        switch (priority) {
            case 'high': return { icon: 'alert-circle', color: '#EF4444' }
            case 'medium': return { icon: 'time-outline', color: '#F59E0B' }
            case 'low': return { icon: 'information-circle', color: '#6366F1' }
            default: return { icon: 'help-circle', color: '#6B7280' }
        }
    }

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <Header title="Dashboard" />
                <LoadingIndicator text='Loading your Dashboard'/>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            <Header title="Dashboard" />
            <ScrollView 
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh}
                        colors={['#6366F1']}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* TRUTHFUL Welcome Section */}
                <View style={styles.welcomeSection}>
                    <LinearGradient
                        colors={['#1A1F3B', '#2D325D', '#4A4F8C']}
                        style={styles.welcomeGradient}
                    >
                        <View style={styles.welcomeHeader}>
                            <View>
                                <Text style={styles.welcomeGreeting}>
                                    Hello, {user?.name || "Client"}!
                                </Text>
                                <Text style={styles.welcomeSubtitle}>
                                    {dashboardStats.requiresMyAction > 0 
                                        ? `${dashboardStats.requiresMyAction} tasks need your attention`
                                        : "All tasks are running smoothly"
                                    }
                                </Text>
                            </View>
                        </View>
                        
                        {/* CLEAR Quick Stats */}
                        <View style={styles.quickStats}>
                            <View style={styles.quickStat}>
                                <Text style={styles.quickStatValue}>{dashboardStats.totalTasks}</Text>
                                <Text style={styles.quickStatLabel}>Total Tasks</Text>
                            </View>
                            <View />
                            <View style={styles.quickStat}>
                                <Text style={styles.quickStatValue}>{dashboardStats.requiresMyAction}</Text>
                                <Text style={styles.quickStatLabel}>Action Needed</Text>
                            </View>
                            <View  />
                            <View style={styles.quickStat}>
                                <Text style={styles.quickStatValue}>{dashboardStats.inProgress}</Text>
                                <Text style={styles.quickStatLabel}>In Progress</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* ACTION-ORIENTED Metrics */}
                <View style={styles.metricsSection}>
                    <View style={styles.metricsGrid}>
                        
                        <TouchableOpacity 
                            style={[styles.metricCard, styles.actionCard1]}
                            onPress={() => navigate('PostedTasks', { filter: 'review' })}
                        >
                            <View style={[styles.metricIcon, { backgroundColor: '#FEF2F2' }]}>
                                <Ionicons name="document-text-outline" size={24} color="#EF4444" />
                            </View>
                            <Text style={styles.metricValue}>{dashboardStats.awaitingMyReview}</Text>
                            <Text style={styles.metricLabel}>Awaiting your Review</Text>
                            <Text style={styles.metricSubtitle}>Needs your action</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.metricCard, styles.progressCard]}
                            onPress={() => navigate('PostedTasks', { filter: 'in-progress' })}
                        >
                            <View style={[styles.metricIcon, { backgroundColor: '#EFF6FF' }]}>
                                <Ionicons name="play-circle-outline" size={24} color="#3B82F6" />
                            </View>
                            <Text style={styles.metricValue}>{dashboardStats.inProgress}</Text>
                            <Text style={styles.metricLabel}>In Progress</Text>
                            <Text style={styles.metricSubtitle}>Being worked on</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.metricCard, styles.successCard]}
                        >
                            <View style={[styles.metricIcon, { backgroundColor: '#F0FDF4' }]}>
                                <Ionicons name="checkmark-done" size={24} color="#10B981" />
                            </View>
                            <Text style={styles.metricValue}>{dashboardStats.completedThisWeek}</Text>
                            <Text style={styles.metricLabel}>Completed</Text>
                            <Text style={styles.metricSubtitle}>This week</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.metricCard, styles.financeCard]}
                            onPress={() => navigate('Payments')}
                        >
                            <View style={[styles.metricIcon, { backgroundColor: '#F8FAFC' }]}>
                                <Ionicons name="wallet-outline" size={24} color="#6B7280" />
                            </View>
                            <Text style={styles.metricValue}>GHS {dashboardStats.inEscrow}</Text>
                            <Text style={styles.metricLabel}>In Escrow</Text>
                            <Text style={styles.metricSubtitle}>Funds held</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* CLEAR Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        {quickActions.map((action) => (
                            <TouchableOpacity 
                                key={action.id} 
                                style={styles.actionCard}
                                onPress={() => handleQuickActionPress(action)}
                            >
                                <LinearGradient
                                    colors={action.color}
                                    style={styles.actionIcon}
                                >
                                    <Ionicons name={action.icon} size={24} color="#fff" />
                                </LinearGradient>
                                <View style={styles.actionContent}>
                                    <Text style={styles.actionText}>{action.title}</Text>
                                    <Text style={styles.actionDescription}>{action.description}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* TRUTHFUL Priority Actions - Only what poster NEEDS to do */}
                {priorityActions.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Priority Actions</Text>
                            <Text style={styles.sectionSubtitle}>
                                {priorityActions.filter(a => a.priority === 'high').length} require immediate attention
                            </Text>
                        </View>
                        <View style={styles.priorityList}>
                            {priorityActions.map((action) => {
                                const priorityIcon = getPriorityIcon(action.priority)
                                return (
                                    <TouchableOpacity 
                                        key={action.id}
                                        style={[
                                            styles.priorityItem,
                                            action.priority === 'high' && styles.priorityItemHigh
                                        ]}
                                        onPress={() => handlePriorityActionPress(action)}
                                    >
                                        <View style={[styles.priorityIcon, { backgroundColor: priorityIcon.color + '20' }]}>
                                            <Ionicons name={priorityIcon.icon} size={16} color={priorityIcon.color} />
                                        </View>
                                        <View style={styles.priorityContent}>
                                            <Text style={styles.priorityTitle}>{action.title}</Text>
                                            <Text style={styles.priorityTask} numberOfLines={1}>
                                                {action.taskTitle}
                                            </Text>
                                            <Text style={styles.priorityDescription}>{action.description}</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                                    </TouchableOpacity>
                                )
                            })}
                        </View>
                    </View>
                )}

                {/* HONEST Empty State */}
                {dashboardStats.totalTasks === 0 && (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIllustration}>
                            <Ionicons name="rocket-outline" size={60} color="#6366F1" />
                        </View>
                        <Text style={styles.emptyTitle}>Ready to get started?</Text>
                        <Text style={styles.emptyDescription}>
                            Post your first task and find skilled professionals to help you get things done
                        </Text>
                        <TouchableOpacity 
                            style={styles.primaryButton}
                            onPress={() => navigate('CreateTask')}
                        >
                            <Ionicons name="add" size={20} color="#FFFFFF" />
                            <Text style={styles.primaryButtonText}>Post Your First Task</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Everything running smoothly state */}
                {dashboardStats.totalTasks > 0 && priorityActions.length === 0 && (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIllustration}>
                            <Ionicons name="checkmark-circle" size={60} color="#10B981" />
                        </View>
                        <Text style={styles.emptyTitle}>All caught up!</Text>
                        <Text style={styles.emptyDescription}>
                            All your tasks are progressing smoothly. No immediate actions needed.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollView: {
        flex: 1,
    },
    
    welcomeSection: {
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 28,
        overflow: 'hidden',
    },
    welcomeGradient: {
        padding: 24,
    },
    welcomeHeader: {
        marginBottom: 20,
    },
    welcomeGreeting: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    welcomeSubtitle: {
        fontSize: 16,
        color: '#E0E7FF',
    },
    quickStats: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 16,
    },
    quickStat: {
        flex: 1,
        alignItems: 'center',
    },
    quickStatValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    quickStatLabel: {
        fontSize: 12,
        color: '#E0E7FF',
    },
    quickStatDivider: {
        width: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    metricsSection: {
        padding: 16,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    metricCard: {
        flex: 1,
        minWidth: (width - 52) / 2,
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    actionCard1: {
        borderLeftWidth: 4,
        borderLeftColor: '#EF4444',
    },
    progressCard: {
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6',
    },
    successCard: {
        borderLeftWidth: 4,
        borderLeftColor: '#10B981',
    },
    financeCard: {
        borderLeftWidth: 4,
        borderLeftColor: '#6B7280',
    },
    metricIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    metricValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    metricLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 2,
    },
    metricSubtitle: {
        fontSize: 12,
        color: '#6B7280',
    },
    section: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        marginTop: 8,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#6B7280',
    },
    actionsGrid: {
        gap: 12,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    actionIcon: {
        width: 50,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    actionContent: {
        flex: 1,
    },
    actionText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    actionDescription: {
        fontSize: 14,
        color: '#6B7280',
    },
    priorityList: {
        gap: 12,
    },
    priorityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    priorityItemHigh: {
        borderColor: '#FECACA',
        backgroundColor: '#FEF2F2',
    },
    priorityIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    priorityContent: {
        flex: 1,
    },
    priorityTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    priorityTask: {
        fontSize: 13,
        color: '#374151',
        marginBottom: 2,
    },
    priorityDescription: {
        fontSize: 12,
        color: '#6B7280',
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#FFFFFF',
        margin: 16,
        borderRadius: 16,
    },
    emptyIllustration: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyDescription: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#6366F1',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
})

