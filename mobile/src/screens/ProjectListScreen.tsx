import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/useAppStore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'Projects'>;

export default function ProjectListScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { projects, fetchProjects, createProject, setActiveProject } = useAppStore();
  const [name, setName] = useState('');

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createProject(name.trim());
    setName('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          value={name}
          onChangeText={setName}
          onSubmitEditing={handleCreate}
          placeholder={t('project.name')}
          placeholderTextColor="#9ca3af"
          style={styles.input}
        />
        <TouchableOpacity onPress={handleCreate} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {projects.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('project.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                setActiveProject(item.id);
                navigation.navigate('Tasks', { projectName: item.name });
              }}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.dot, { backgroundColor: item.color }]} />
                <Text style={styles.cardTitle}>{item.name}</Text>
              </View>
              <Text style={styles.cardDate}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
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
  addBtn: { backgroundColor: '#6c5ce7', borderRadius: 8, width: 44, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 22, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a2e' },
  cardDate: { fontSize: 12, color: '#9ca3af' },
});
