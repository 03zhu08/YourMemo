import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/useAppStore';
import TaskItem from '../components/TaskItem';

export default function TaskBoardScreen() {
  const { t } = useTranslation();
  const { tasks, activeProjectId, createTask, updateTask, deleteTask } = useAppStore();
  const [title, setTitle] = useState('');

  const handleAdd = async () => {
    if (!title.trim() || !activeProjectId) return;
    await createTask(activeProjectId, title.trim());
    setTitle('');
  };

  const cycleStatus = (current: string) => {
    const order = ['todo', 'in_progress', 'done'];
    return order[(order.indexOf(current) + 1) % order.length];
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={handleAdd}
          placeholder={t('task.title')}
          placeholderTextColor="#9ca3af"
          style={styles.input}
        />
        <TouchableOpacity onPress={handleAdd} style={styles.addBtn}>
          <Text style={styles.addBtnText}>{t('task.add')}</Text>
        </TouchableOpacity>
      </View>

      {tasks.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('task.noTasks')}</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              onToggle={() => updateTask(item.id, { status: cycleStatus(item.status) as any })}
              onDelete={() => deleteTask(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 16 },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#1a1a2e', borderWidth: 1, borderColor: '#e5e7eb' },
  addBtn: { backgroundColor: '#6c5ce7', borderRadius: 8, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 15 },
});
