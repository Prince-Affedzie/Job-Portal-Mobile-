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

const HelpSupportScreen = () => {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const faqCategories = [
    { id: "all", label: "All Topics" },
    { id: "account", label: "Account" },
    { id: "tasks", label: "Tasks" },
    { id: "payments", label: "Payments" },
    { id: "technical", label: "Technical" },
  ];

  const faqs = [
    {
      question: "How do I reset my password?",
      answer: "If you forgot your password, tap 'Forgot Password' on the login screen. You'll receive an OTP code to reset it securely.",
      category: "account"
    },
    {
      question: "How do I apply for a task?",
      answer: "Go to the 'Available Tasks' tab, browse through available opportunities, select a task matching your skills, and click 'Show Interest' or 'Bid Button'. You'll receive a notification when the client reviews your application.",
      category: "tasks"
    },
    {
      question: "How do I get paid for completed work?",
      answer: "Once the client approves your work, our support team will process your payment. Our team would reach out to ask you your preferred payment procedure. Payments are typically sent within 24 hours via your chosen method (Mobile Money, bank transfer, etc.). You'll receive a notification when payment is initiated.",
       category: "payments"
   },
    {
      question: "How do I contact a client or tasker?",
      answer: "Use the in-app chat feature for all project-related communication. Keep discussions inside the app for safety and dispute resolution purposes. You can find the chat option in the Chat tab.",
      category: "tasks"
    },
    {
      question: "How do I report an issue or dispute?",
      answer: "Navigate to the task details screen and tap 'Report Issue'. Provide detailed information about the problem. Our support team typically responds within 24 hours and will help mediate the situation.",
      category: "account"
    },
    {
      question: "What are the service fees?",
      answer: "We charge a 15% service fee on completed tasks. This fee helps us maintain platform security, provide customer support, and continuously improve your experience. Fees are automatically deducted before payment release.",
      category: "payments"
    },
    {
      question: "How do I update my profile information?",
      answer: "Go to your Profile tab, tap the edit icon, and update your information. Make sure to save changes. A complete profile increases your chances of getting hired by 40%.",
      category: "account"
    },
    {
      question: "The app is crashing or not loading properly",
      answer: "Try these steps: 1) Force close and restart the app 2) Check for app updates in your app store 3) Clear app cache in settings 4) Ensure you have stable internet connection. If issues persist, contact support.",
      category: "technical"
    },
    {
      question: "How long does task approval take?",
      answer: "Most clients review applications within 24-48 hours. You'll receive a notification when there's an update. For urgent matters, you can send a polite follow-up message through the chat feature.",
      category: "tasks"
    },
    {
      question: "Can I work on multiple tasks simultaneously?",
      answer: "Yes, you can work on multiple tasks as long as you can meet all deadlines and maintain quality. We recommend being realistic about your capacity to avoid missed deadlines.",
      category: "tasks"
    }
  ];

  const quickActions = [
    {
      title: "Contact Support",
      description: "Get help from our team",
      icon: "chatbubble-ellipses",
      action: ()=>Linking.openURL(`https://wa.me/233597802841`),
      color: "#667eea"
    },
    /*{
      title: "App Tutorials",
      description: "Watch how-to guides",
      icon: "play-circle",
      action: () => Linking.openURL("https://novaedgeapp.com/tutorials"),
      color: "#48bb78"
    }*/
    {
      title: "Community Forum",
      description: "Connect with other taskers",
      icon: "people",
      action: () => Linking.openURL("https://whatsapp.com/channel/0029VbBDWSZ89incbIVh6j2u"),
      color: "#ed8936"
    },
    /*{
      title: "Status Page",
      description: "Check system status",
      icon: "pulse",
      action: () => Linking.openURL("https://status.novaedgeapp.com"),
      color: "#9f7aea"
    }*/
  ];

  const handleToggle = (index) => {
    LayoutAnimation.configureNext({
      ...LayoutAnimation.Presets.easeInEaseOut,
      duration: 300,
    });
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleContactSupport = () => {
    const email = "support@novaedgeapp.com";
    Linking.openURL(`mailto:${email}?subject=Support Request&body=Hello, I need help with...`);
  };

  const handleCallSupport = () => {
    Alert.alert(
      "Contact Support",
      "Call our support team at +233597802841",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Call", 
          onPress: () => Linking.openURL('tel:+233597802841'),
          style: "default"
        }
      ]
    );
  };

  const handleWhatsAppSupport = () => {
    const message = "Hello, I need help with...";
    Linking.openURL(`https://wa.me/233597802841?text=${encodeURIComponent(message)}`);
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
      <Header title="Help & Support" showBackButton={true} />
      
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="help-buoy" size={32} color="#667eea" />
          </View>
          <Text style={styles.heroTitle}>How can we help you?</Text>
          <Text style={styles.heroSubtitle}>
            Find instant answers, contact support, or explore resources
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for help..."
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
          <Text style={styles.sectionTitle}>Quick Help</Text>
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
              Frequently Asked Questions
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

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactSubtitle}>
            Our support team is here to assist you
          </Text>
          
          <View style={styles.contactButtons}>
            <TouchableOpacity 
              style={styles.contactOption}
              onPress={handleContactSupport}
            >
              <Ionicons name="mail" size={24} color="#667eea" />
              <Text style={styles.contactOptionText}>Email Support</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.contactOption}
              onPress={handleCallSupport}
            >
              <Ionicons name="call" size={24} color="#48BB78" />
              <Text style={styles.contactOptionText}>Call Support</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.contactOption}
              onPress={handleWhatsAppSupport}
            >
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
              <Text style={styles.contactOptionText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Average response time: 2 hours
          </Text>
          <Text style={styles.footerHours}>
            Support Hours: Mon-Fri, 8AM-8PM EST
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
    backgroundColor: "#2D325D",
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
    fontWeight: "500",
    color: "#374151",
    marginTop: 8,
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

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
});
export default HelpSupportScreen;