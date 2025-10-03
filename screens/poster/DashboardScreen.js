import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity, RefreshControl ,ActivityIndicator} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
    const { postedTasks, loading, loadPostedTasks } = useContext(PosterContext)
    const [refreshing, setRefreshing] = useState(false)

    // Refresh function
    const onRefresh = async () => {
        setRefreshing(true)
        await loadPostedTasks(user.id)
        setRefreshing(false)
    }

    useEffect(() => {
        loadPostedTasks()
    }, [])

    // Enhanced statistics calculation
    const dashboardStats = useMemo(() => {
        if (!postedTasks || postedTasks.length === 0) {
            return {
                totalTasks: 0,
                completedTasks: 0,
                activeTasks: 0,
                inProgressTasks: 0,
                reviewTasks: 0,
                assignedTasks: 0,
                totalSpent: 0,
                successRate: 0,
                monthlySpending: 0,
                urgentTasks: 0,
                avgTaskValue: 0
            }
        }

        const totalTasks = postedTasks.length
        const completedTasks = postedTasks.filter(task => task.status === 'Completed').length
        const activeTasks = postedTasks.filter(task => ['Open', 'Pending'].includes(task.status)).length
        const inProgressTasks = postedTasks.filter(task => task.status === 'In-progress').length
        const reviewTasks = postedTasks.filter(task => task.status === 'Review').length
        const assignedTasks = postedTasks.filter(task => task.status === 'Assigned').length
        
        // Calculate urgent tasks (deadline within 2 days)
        const urgentTasks = postedTasks.filter(task => {
            if (!task.deadline) return false
            const deadline = new Date(task.deadline)
            const now = new Date()
            const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
            return daysUntilDeadline <= 2 && !['Completed', 'Closed'].includes(task.status)
        }).length

        const totalSpent = postedTasks
            .filter(task => task.status === 'Completed')
            .reduce((sum, task) => sum + (task.budget || 0), 0)

        const monthlySpending = postedTasks
            .filter(task => {
                if (task.status !== 'Completed') return false
                const completionDate = new Date(task.updatedAt || task.createdAt)
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                return completionDate > thirtyDaysAgo
            })
            .reduce((sum, task) => sum + (task.budget || 0), 0)

        const successRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        const avgTaskValue = completedTasks > 0 ? Math.round(totalSpent / completedTasks) : 0

        return {
            totalTasks,
            completedTasks,
            activeTasks,
            inProgressTasks,
            reviewTasks,
            assignedTasks,
            totalSpent,
            monthlySpending,
            successRate,
            urgentTasks,
            avgTaskValue
        }
    }, [postedTasks])

    // Navigation handler for quick actions
    const handleQuickActionPress = (action) => {
        if (action.navigation) {
            if (action.navigation.navigator) {
                // Nested navigation: Navigate to tab -> then to screen within that stack
                navigate(action.navigation.navigator, {
                    screen: action.navigation.screen,
                    params: action.navigation.params
                });
            } else {
                // Direct screen navigation (same navigator)
                navigate(action.navigation.screen, action.navigation.params);
            }
        } else {
            // Fallback to direct navigation (for backward compatibility)
            navigate(action.screen);
        }
    }

    // Quick actions with nested navigation support
    const quickActions = [
        {
            id: 1,
            title: 'Post New Task',
            icon: 'add-circle-outline',
            color: ['#1A1F3B', '#2D325D'],
            description: 'Create a new task',
            navigation: {
                navigator: 'PostedTasks', // Tab navigator name
                screen: 'CreateTask' // Screen inside the PostedTasksStack
            }
        },
        /*{
            id: 2,
            title: 'Review Work',
            icon: 'document-text-outline',
            color: ['#059669', '#10B981'],
            description: 'Check submissions',
            navigation: {
                navigator: 'PostedTasks', // Tab navigator name
                screen: 'PostedTasksList' // Navigate to tasks list for now (Submissions screen doesn't exist)
            }
        },*/
        {
            id: 3,
            title: 'Messages',
            icon: 'chatbubble-ellipses-outline',
            color: ['#7C3AED', '#8B5CF6'],
            description: 'Chat with taskers',
            navigation: {
                screen: 'Chat' // Direct screen navigation (if it exists in root)
            }
        },
        {
            id: 4,
            title: 'My Tasks',
            icon: 'briefcase-outline',
            color: ['#DC2626', '#EF4444'],
            description: 'View all tasks',
            navigation: {
                navigator: 'PostedTasks', // Tab navigator name
                screen: 'PostedTasksList' // Initial screen of PostedTasksStack
            }
        }
    ]

    // Priority tasks that need attention
    const priorityTasks = useMemo(() => {
        if (!postedTasks) return []
        
        return postedTasks
            .filter(task => {
                // Tasks that need immediate attention
                if (task.status === 'Review') return true
                if (task.status === 'Assigned' && !task.assignmentAccepted) return true
                
                // Urgent deadlines
                if (task.deadline) {
                    const deadline = new Date(task.deadline)
                    const now = new Date()
                    const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
                    return daysUntilDeadline <= 2 && !['Completed', 'Closed'].includes(task.status)
                }
                return false
            })
            .slice(0, 3)
    }, [postedTasks])

    const getPriorityIcon = (task) => {
        if (task.status === 'Review') return { icon: 'alert-circle', color: '#F59E0B' }
        if (!task.assignmentAccepted && task.status === 'Assigned') return { icon: 'time-outline', color: '#6366F1' }
        return { icon: 'flag-outline', color: '#EF4444' }
    }

    const getPriorityText = (task) => {
        if (task.status === 'Review') return 'Needs Review'
        if (!task.assignmentAccepted && task.status === 'Assigned') return 'Pending Acceptance'
        return 'Urgent Deadline'
    }

    // Navigation handler for task details with nested navigation
    const handleTaskDetailPress = (taskId) => {
        navigate('PostedTasks', {
            screen: 'ClientTaskDetail',
            params: { taskId }
        });
    }

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
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
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Welcome Section */}
                <View style={styles.welcomeSection}>
                    <View style={styles.welcomeContent}>
                        <View>
                            <Text style={styles.welcomeText}>Welcome back, {user?.name || "Client"}!<Text> 👋</Text></Text>
                            <Text style={styles.subtitle}>
                                {dashboardStats.totalTasks === 0 
                                    ? "Ready to post your first task?" 
                                    : `You have ${dashboardStats.activeTasks} active tasks and ${dashboardStats.urgentTasks} need attention`
                                }
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Key Metrics Grid */}
                <View style={styles.metricsSection}>
                    <View style={styles.metricsGrid}>
                        <TouchableOpacity 
                            style={[styles.metricCard, styles.primaryCard]}
                            onPress={() => navigate('PostedTasks')}
                        >
                            <View style={styles.metricIcon}>
                                <Ionicons name="briefcase-outline" size={24} color="#6366F1" />
                            </View>
                            <Text style={styles.metricValue}>{dashboardStats.totalTasks}</Text>
                            <Text style={styles.metricLabel}>Total Tasks</Text>
                            <Text style={styles.metricTrend}>
                                {dashboardStats.activeTasks} active • {dashboardStats.completedTasks} completed
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.metricCard, styles.successCard]}
                            onPress={() => navigate('PostedTasks')}
                        >
                            <View style={styles.metricIcon}>
                                <Ionicons name="checkmark-done" size={24} color="#10B981" />
                            </View>
                            <Text style={styles.metricValue}>{dashboardStats.successRate}%</Text>
                            <Text style={styles.metricLabel}>Success Rate</Text>
                            <Text style={styles.metricTrend}>
                                {dashboardStats.completedTasks} completed successfully
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.metricCard, styles.warningCard]}
                        >
                            <View style={styles.metricIcon}>
                                <Ionicons name="alert-circle" size={24} color="#F59E0B" />
                            </View>
                            <Text style={styles.metricValue}>{dashboardStats.urgentTasks}</Text>
                            <Text style={styles.metricLabel}>Need Attention</Text>
                            <Text style={styles.metricTrend}>
                                {dashboardStats.reviewTasks} to review
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.metricCard, styles.infoCard]}
                        >
                            <View style={styles.metricIcon}>
                                <Ionicons name="cash-outline" size={24} color="#3B82F6" />
                            </View>
                            <Text style={styles.metricValue}>GHS {dashboardStats.monthlySpending}</Text>
                            <Text style={styles.metricLabel}>This Month</Text>
                            <Text style={styles.metricTrend}>
                                GHS {dashboardStats.totalSpent} total spent
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Quick Actions */}
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
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Ionicons name={action.icon} size={24} color="#fff" />
                                </LinearGradient>
                                <View style={styles.actionContent}>
                                    <Text style={styles.actionText}>{action.title}</Text>
                                    <Text style={styles.actionDescription}>{action.description}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Priority Tasks */}
                {priorityTasks.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Priority Tasks</Text>
                            <TouchableOpacity onPress={() => navigate('PostedTasks')}>
                                <Text style={styles.seeAllText}>View All</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.priorityList}>
                            {priorityTasks.map((task) => {
                                const priority = getPriorityIcon(task)
                                return (
                                    <TouchableOpacity 
                                        key={task._id}
                                        style={styles.priorityItem}
                                        onPress={() => handleTaskDetailPress(task._id)}
                                    >
                                        <View style={[styles.priorityIcon, { backgroundColor: priority.color + '20' }]}>
                                            <Ionicons name={priority.icon} size={16} color={priority.color} />
                                        </View>
                                        <View style={styles.priorityContent}>
                                            <Text style={styles.priorityTitle} numberOfLines={1}>
                                                {task.title}
                                            </Text>
                                            <Text style={styles.priorityType} numberOfLines={1}>
                                                {getPriorityText(task)}
                                            </Text>
                                        </View>
                                        <View style={styles.priorityMeta}>
                                            <Text style={styles.priorityBudget}>GHS {task.budget}</Text>
                                            <Text style={styles.priorityTime}>
                                                {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>
                    </View>
                )}

                {/* Recent Activity */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Activity</Text>
                        <TouchableOpacity onPress={() => navigate('PostedTasks')}>
                            <Text style={styles.seeAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.activityList}>
                        {postedTasks && postedTasks.slice(0, 4).map((task) => (
                            <TouchableOpacity 
                                key={task._id}
                                style={styles.activityItem}
                                onPress={() => handleTaskDetailPress(task._id)}
                            >
                                <View style={[
                                    styles.activityStatus,
                                    { backgroundColor: 
                                        task.status === 'Completed' ? '#10B98120' :
                                        task.status === 'In-progress' ? '#6366F120' :
                                        task.status === 'Review' ? '#F59E0B20' : '#6B728020'
                                    }
                                ]}>
                                    <Ionicons 
                                        name={
                                            task.status === 'Completed' ? 'checkmark-circle' :
                                            task.status === 'In-progress' ? 'play-circle' :
                                            task.status === 'Review' ? 'alert-circle' : 'time-outline'
                                        } 
                                        size={16} 
                                        color={
                                            task.status === 'Completed' ? '#10B981' :
                                            task.status === 'In-progress' ? '#6366F1' :
                                            task.status === 'Review' ? '#F59E0B' : '#6B7280'
                                        } 
                                    />
                                </View>
                                <View style={styles.activityContent}>
                                    <Text style={styles.activityTitle} numberOfLines={1}>
                                        {task.title}
                                    </Text>
                                    <Text style={styles.activityMeta}>
                                        {task.category} • GHS {task.budget}
                                    </Text>
                                </View>
                                <Text style={styles.activityTime}>
                                    {new Date(task.updatedAt).toLocaleDateString()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Empty State for New Users */}
                {dashboardStats.totalTasks === 0 && (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIllustration}>
                            <Ionicons name="rocket-outline" size={60} color="#6366F1" />
                        </View>
                        <Text style={styles.emptyTitle}>Ready to get started?</Text>
                        <Text style={styles.emptyDescription}>
                            Post your first task and find skilled taskers to help you get things done
                        </Text>
                        <TouchableOpacity 
                            style={styles.primaryButton}
                            onPress={() => handleQuickActionPress(quickActions[0])} // Use the first quick action (Post New Task)
                        >
                            <Ionicons name="add" size={20} color="#FFFFFF" />
                            <Text style={styles.primaryButtonText}>Post Your First Task</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

// Your existing styles remain the same...
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    loadingContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#6B7280',
    },
    welcomeSection: {
        padding: 20,
        backgroundColor: '#4F46E5',
        marginHorizontal:10,
        borderRadius:20,
    },
    welcomeContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFF',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#FFFF',
        lineHeight: 22,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#6366F1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    metricsSection: {
        padding: 20,
        paddingBottom:0,
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
    padding: 3, 
    borderRadius: 12, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 6, 
    elevation: 1, 
},
primaryCard: {
    borderLeftWidth: 3, 
    borderLeftColor: '#6366F1',
},
successCard: {
    borderLeftWidth: 3, 
    borderLeftColor: '#10B981',
},
warningCard: {
    borderLeftWidth: 3, 
    borderLeftColor: '#F59E0B',
},
infoCard: {
    borderLeftWidth: 3, 
    borderLeftColor: '#3B82F6',
},
    metricIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    metricValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    metricLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 4,
    },
    metricTrend: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    section: {
        padding: 20,
        backgroundColor: '#FFFFFF',
        marginTop: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    seeAllText: {
        fontSize: 14,
        color: '#6366F1',
        fontWeight: '600',
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
        borderLeftWidth: 4,
        borderLeftColor: '#EF4444',
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
    priorityType: {
        fontSize: 12,
        color: '#EF4444',
        fontWeight: '500',
    },
    priorityMeta: {
        alignItems: 'flex-end',
    },
    priorityBudget: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    priorityTime: {
        fontSize: 12,
        color: '#6B7280',
    },
    activityList: {
        gap: 12,
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
    },
    activityStatus: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    activityContent: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 2,
    },
    activityMeta: {
        fontSize: 12,
        color: '#6B7280',
    },
    activityTime: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#FFFFFF',
        margin: 20,
        borderRadius: 16,
    },
    emptyIllustration: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#EEF2FF',
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