import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface Props {
  task: {
    id: string;
    title: string;
    status: string;
    priority: number;
    due_date: string | null;
  };
  onToggle: () => void;
  onDelete: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  todo: '#9ca3af',
  in_progress: '#f39c12',
  done: '#27ae60',
  cancelled: '#e74c3c',
};

export default function TaskItem({ task, onToggle, onDelete }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onToggle} style={[styles.dot, { borderColor: STATUS_COLORS[task.status] || '#9ca3af', backgroundColor: task.status === 'done' ? STATUS_COLORS.done : 'transparent' }]} />
      <View style={styles.content}>
        <Text style={[styles.title, task.status === 'done' && styles.done]}>{task.title}</Text>
        <View style={styles.meta}>
          {task.due_date && <Text style={styles.date}>{task.due_date}</Text>}
          {task.priority > 0 && <View style={styles.badge}><Text style={styles.badgeText}>P{task.priority}</Text></View>}
        </View>
      </View>
      <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.deleteBtn}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderRadius: 10, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, marginRight: 12 },
  content: { flex: 1 },
  title: { fontSize: 15, color: '#1a1a2e' },
  done: { textDecorationLine: 'line-through', color: '#9ca3af' },
  meta: { flexDirection: 'row', marginTop: 4, gap: 8 },
  date: { fontSize: 12, color: '#9ca3af' },
  badge: { backgroundColor: '#6c5ce7', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  deleteBtn: { fontSize: 16, color: '#e74c3c', opacity: 0.5 },
});
