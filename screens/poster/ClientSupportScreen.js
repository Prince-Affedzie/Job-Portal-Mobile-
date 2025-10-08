import React, { useState } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Linking, 
  StyleSheet, 
  LayoutAnimation, 
  Platform, 
  UIManager,
  Alert,
  TextInput,
  ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import Header from "../../component/tasker/Header";
import { SafeAreaView } from "react-native-safe-area-context";

// Enable smooth animation for accordion on Android
if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental &&
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const EmployerHelpSupportScreen = () => {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const faqCategories = [
    { id: "all", label: "All Topics" },
    { id: "posting", label: "Posting Tasks" },
    { id: "hiring", label: "Hiring" },
    { id: "payments", label: "Payments" },
    { id: "management", label: "Task Management" },
  ];

  const faqs = [
  {
    question: "When do I need to pay for a task?",
    answer: "Payment is initiated when you assign a tasker to start work. Funds are held securely in escrow and only released to the tasker once you approve the completed work. This ensures the tasker is committed and you're protected.",
    category: "payments"
  },
  {
    question: "Can I get a refund if I cancel a task?",
    answer:  "Yes, full refunds are available if you cancel before a tasker starts work. If work has already begun, you'll receive a partial refund based on the work completed, In such situations Contact support to guide you through the process. ",
    category: "payments"
  },
  {
    question: "At what stage can I cancel a task?",
    answer: "You can cancel at any stage: before hiring, after hiring but before work starts, or during work. However, cancellation fees may apply if work has begun. Early cancellation is always free if no tasker has been assigned yet.",
    category: "management"
  },
  {
    question: "Can I reassign a task to a different tasker?",
    answer: "Yes, but only if the current tasker hasn't started substantial work. To reassign, when work has already begun, reach to our support team to help mediate the process. then you can hire a new tasker..",
    category: "management"
  },
  {
    question: "What happens if a tasker doesn't complete the work on time?",
    answer: "If a tasker misses the deadline, you can request an extension or do a report. The escrowed funds remain secure, and you can either hire a new tasker or get a full refund. Report delays to support for assistance.",
    category: "management"
  },
  /*{
    question: "How many revisions am I entitled to?",
    answer: "You're entitled to 2 free revisions as part of the standard service. Additional revisions may require renegotiating the budget with the tasker. Clear communication upfront about expectations helps minimize revision needs.",
    category: "management"
  },
  {
    question: "What's the difference between a task and a project?",
    answer: "Tasks are one-off assignments with clear deliverables, while projects involve multiple phases or ongoing work. For complex projects, consider breaking them into smaller tasks or using our project management features.",
    category: "posting"
  },
  {
    question: "Can I hire the same tasker for multiple tasks?",
    answer: "Absolutely! Once you find a reliable tasker, you can directly invite them to new tasks or create a ongoing working relationship. Many clients build long-term partnerships with trusted taskers through our platform.",
    category: "hiring"
  },*/
  {
    question: "What if the tasker's work doesn't meet my expectations?",
    answer: "First, provide specific feedback through the submissions/revision system. If issues persist, contact support for mediation. We can help negotiate a solution, partial payment based on work completed, or reassignment to another tasker.",
    category: "management"
  },
  {
    question: "How do I know if a tasker is qualified?",
    answer: "Check their profile for: ratings & reviews, completed tasks count, response rate, and portfolio samples. Verified taskers have additional identity verification.",
    category: "hiring"
  },

  {
    question: "Can I change the task budget after posting?",
    answer: "Changing a budget by editing it after the task have been assigned won't take effect. To adjust budget, go to task details → Edit → Update budget.",
    category: "posting"
  },

  {
    question: "What payment information is safe to share?",
    answer: "Never share bank details, passwords, or personal identification outside the platform. All payments should go through our secure system. Use in-app messaging for all communications and file sharing for sensitive documents.",
    category: "payments"
  },
  {
    question: "How long does it take to find a tasker?",
    answer: "Most tasks receive applications within 24 hours. Urgent tasks or those with clear requirements and competitive budgets typically get faster responses.",
    category: "hiring"
  },
  {
    question: "What if I need to pause a task temporarily?",
    answer: "You can put a task on hold by communicating with your tasker and updating the deadline. For longer pauses, consider canceling and reposting later. Keep in mind taskers may move on to other projects during extended pauses.",
    category: "management"
  },
  {
    question: "What's the best way to communicate with taskers?",
    answer: "Use our in-app messaging for all communications. This keeps everything documented for dispute resolution and ensures both parties are protected. Avoid moving conversations to external platforms until work is completed.",
    category: "management"
  },
  
  {
    question: "Can I hire multiple taskers for the same task?",
    answer: "For most tasks, you can hire only one tasker. However, for large projects you can break it into sub-tasks and hire different specialists. Coordinate carefully to ensure smooth collaboration.",
    category: "hiring"
  },
  {
    question: "What support is available if things go wrong?",
    answer: "Our support team is available 24/7 for disputes, technical issues, or guidance. We offer mediation services, can freeze payments during investigations, and help find replacement taskers if needed. Your satisfaction is guaranteed.",
    category: "management"
  }
];


const quickActions = [
  {
    title: "Post New Task",
    description: "Create a new task listing",
    icon: "add-circle",
    action: () => {}, // Navigate to post task screen
    color: "#667eea"
  },
  {
    title: "Payment Issues",
    description: "Refunds & billing help",
    icon: "card",
    action: () => {}, // Navigate to billing help
    color: "#f56565"
  },
  {
    title: "Cancel Task",
    description: "Cancel or modify tasks",
    icon: "close-circle",
    action: () => {}, // Navigate to task management
    color: "#ed8936"
  },
  {
    title: "Urgent Support",
    description: "24/7 priority help",
    icon: "warning",
    action: handleContactSupport,
    color: "#e53e3e"
  },
  {
    title: "Tasker Disputes",
    description: "Mediation & resolution",
    icon: "hand-left",
    action: () => {}, // Navigate to dispute resolution
    color: "#9f7aea"
  },
  {
    title: "Budget Help",
    description: "Pricing guidance",
    icon: "cash",
    action: () => Linking.openURL("https://novaedgeapp.com/pricing-guide"),
    color: "#48bb78"
  }
];


  const handleToggle = (index) => {
    LayoutAnimation.configureNext({
      ...LayoutAnimation.Presets.easeInEaseOut,
      duration: 300,
    });
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleContactSupport = () => {
    const email = "clients@novaedgeapp.com";
    Linking.openURL(`mailto:${email}?subject=Client Support Request&body=Hello, I need help with...`);
  };

  const handleCallSupport = () => {
    Alert.alert(
      "Client Support",
      "Call our dedicated client support team at +1 (555) 123-4568",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Call", 
          onPress: () => Linking.openURL('tel:+15551234568'),
          style: "default"
        }
      ]
    );
  };

  const handlePrioritySupport = () => {
    Alert.alert(
      "Priority Client Support",
      "As a valued client, you have access to our priority support line for urgent matters affecting your business.",
      [
        { text: "Later", style: "cancel" },
        { 
          text: "Contact Now", 
          onPress: handleCallSupport,
          style: "default"
        }
      ]
    );
  };

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleQuickAction = (action) => {
    setIsSubmitting(true);
    setTimeout(() => {
      action();
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      <Header title="Client Support" />
      
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="business" size={32} color="#667eea" />
          </View>
          <Text style={styles.heroTitle}>Client Support Center</Text>
          <Text style={styles.heroSubtitle}>
            Get help with posting tasks, hiring, payments, and managing your projects
          </Text>
        </View>

        {/* Priority Support Banner */}
        <TouchableOpacity 
          style={styles.priorityBanner}
          onPress={handlePrioritySupport}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.priorityGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="star" size={20} color="#FFFFFF" />
            <Text style={styles.priorityText}>Priority Client Support Available</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search client support topics..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickActionCard}
                onPress={() => handleQuickAction(action.action)}
                disabled={isSubmitting}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${action.color}15` }]}>
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ Categories */}
        <View style={styles.categoriesSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {faqCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  activeCategory === category.id && styles.categoryChipActive
                ]}
                onPress={() => setActiveCategory(category.id)}
              >
                <Text style={[
                  styles.categoryText,
                  activeCategory === category.id && styles.categoryTextActive
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Client FAQs
            </Text>
            <Text style={styles.resultsCount}>
              {filteredFaqs.length} {filteredFaqs.length === 1 ? 'result' : 'results'}
            </Text>
          </View>

          {filteredFaqs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#CBD5E0" />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptyText}>
                Try adjusting your search terms or browse different categories
              </Text>
            </View>
          ) : (
            filteredFaqs.map((item, index) => (
              <View key={index} style={styles.faqItem}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  onPress={() => handleToggle(index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.questionContent}>
                    <Text style={styles.question}>{item.question}</Text>
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryTagText}>{item.category}</Text>
                    </View>
                  </View>
                  <Ionicons
                    name={expandedIndex === index ? "chevron-up" : "chevron-down"}
                    size={22}
                    color="#667eea"
                  />
                </TouchableOpacity>

                {expandedIndex === index && (
                  <View style={styles.answerWrapper}>
                    <Text style={styles.answer}>{item.answer}</Text>
                    <View style={styles.helpfulSection}>
                      <Text style={styles.helpfulText}>Was this helpful?</Text>
                      <View style={styles.helpfulButtons}>
                        <TouchableOpacity style={styles.helpfulButton}>
                          <Ionicons name="thumbs-up" size={16} color="#48BB78" />
                          <Text style={styles.helpfulButtonText}>Yes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.helpfulButton}>
                          <Ionicons name="thumbs-down" size={16} color="#F56565" />
                          <Text style={styles.helpfulButtonText}>No</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </View>

        {/* Client Resources */}
        <View style={styles.resourcesSection}>
          <Text style={styles.sectionTitle}>Client Resources</Text>
          <View style={styles.resourcesGrid}>
            <TouchableOpacity style={styles.resourceCard}>
              <Ionicons name="book" size={24} color="#667eea" />
              <Text style={styles.resourceTitle}>Best Practices Guide</Text>
              <Text style={styles.resourceDesc}>Learn how to write effective task descriptions</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.resourceCard}>
              <Ionicons name="videocam" size={24} color="#48BB78" />
              <Text style={styles.resourceTitle}>Video Tutorials</Text>
              <Text style={styles.resourceDesc}>Step-by-step platform guides</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.resourceCard}>
              <Ionicons name="document-text" size={24} color="#ED8936" />
              <Text style={styles.resourceTitle}>Pricing Guide</Text>
              <Text style={styles.resourceDesc}>Understand task budgeting</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.resourceCard}>
              <Ionicons name="people" size={24} color="#9F7AEA" />
              <Text style={styles.resourceTitle}>Hiring Tips</Text>
              <Text style={styles.resourceDesc}>Find the right taskers</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Need dedicated client support?</Text>
          <Text style={styles.contactSubtitle}>
            Our client success team is here to help you get the most from our platform
          </Text>
          
          <View style={styles.contactButtons}>
            <TouchableOpacity 
              style={styles.contactOption}
              onPress={handleContactSupport}
            >
              <Ionicons name="mail" size={24} color="#667eea" />
              <Text style={styles.contactOptionText}>Email Support</Text>
              <Text style={styles.contactOptionSubtext}>clients@novaedgeapp.com</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.contactOption}
              onPress={handleCallSupport}
            >
              <Ionicons name="call" size={24} color="#48BB78" />
              <Text style={styles.contactOptionText}>Call Support</Text>
              <Text style={styles.contactOptionSubtext}>+1 (555) 123-4568</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Client Support Hours: Mon-Fri, 7AM-9PM EST
          </Text>
          <Text style={styles.footerHours}>
            Average response time: 1 hour for priority clients
          </Text>
        </View>
      </ScrollView>

      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
    backgroundColor: "#FFFFFF",
  },

  // Hero Section
  heroSection: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0F9FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#E0F2FE",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 8,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 10,
  },

  // Priority Banner
  priorityBanner: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  priorityGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  priorityText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
  },

  // Search Section
  searchSection: {
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
    padding: 0,
  },
  clearButton: {
    padding: 4,
  },

  // Quick Actions Section
  quickActionsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  quickActionCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },

  // Categories Section
  categoriesSection: {
    marginBottom: 24,
  },
  categoriesContainer: {
    paddingHorizontal: 2,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryChipActive: {
    backgroundColor: "#667eea",
    borderColor: "#667eea",
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  categoryTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  // FAQ Section
  faqSection: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  faqItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    overflow: "hidden",
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16,
  },
  questionContent: {
    flex: 1,
    marginRight: 12,
  },
  question: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1C1C1E",
    lineHeight: 22,
    marginBottom: 8,
  },
  categoryTag: {
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#0369A1",
    textTransform: "capitalize",
  },
  answerWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  answer: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
    marginBottom: 16,
  },
  helpfulSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  helpfulText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  helpfulButtons: {
    flexDirection: "row",
    gap: 12,
  },
  helpfulButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  helpfulButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },

  // Resources Section
  resourcesSection: {
    marginBottom: 30,
  },
  resourcesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  resourceCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: "center",
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1C1C1E",
    marginTop: 12,
    marginBottom: 4,
    textAlign: "center",
  },
  resourceDesc: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 16,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },

  // Contact Section
  contactSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 8,
    textAlign: "center",
  },
  contactSubtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  contactButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  contactOption: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  contactOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 8,
  },
  contactOptionSubtext: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },

  // Footer
  footer: {
    alignItems: "center",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  footerText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
    textAlign: "center",
  },
  footerHours: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
  },

  // Loading Overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default EmployerHelpSupportScreen;