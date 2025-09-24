import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Linking,
  Alert,
  ActivityIndicator,
  Dimensions,
  Share,
  Animated,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { styles } from '../../screens/tasker/TaskDetails';
import { Ionicons } from '@expo/vector-icons';


export const ScamAlertModal = ({ visible, onClose }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.scamAlertOverlay}>
        <View style={styles.scamAlertContent}>
          <Text style={styles.scamAlertTitle}>⚠️ Protect Yourself From Scams</Text>
          
          <View style={styles.scamAlertList}>
            <View style={styles.scamAlertItem}>
              <Ionicons name="warning-outline" size={16} color="#EF4444" />
              <Text style={styles.scamAlertText}>Never pay money upfront to secure a task</Text>
            </View>
            <View style={styles.scamAlertItem}>
              <Ionicons name="warning-outline" size={16} color="#EF4444" />
              <Text style={styles.scamAlertText}>Avoid sharing personal financial information</Text>
            </View>
            <View style={styles.scamAlertItem}>
              <Ionicons name="warning-outline" size={16} color="#EF4444" />
              <Text style={styles.scamAlertText}>Be cautious of employers with no reviews or history</Text>
            </View>
            <View style={styles.scamAlertItem}>
              <Ionicons name="warning-outline" size={16} color="#EF4444" />
              <Text style={styles.scamAlertText}>Meet in public places for in-person tasks</Text>
            </View>
            <View style={styles.scamAlertItem}>
              <Ionicons name="warning-outline" size={16} color="#EF4444" />
              <Text style={styles.scamAlertText}>Report suspicious activity immediately</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.scamAlertButton}
            onPress={onClose}
          >
            <Text style={styles.scamAlertButtonText}>I Understand</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
