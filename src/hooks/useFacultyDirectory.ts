import { useState, useEffect, useMemo } from 'react';
import api from '@/services/api';

export function useFacultyDirectory() {
  const [facultiesData, setFacultiesData] = useState<{ name: string; departments: string[] }[]>([]);
  const [departmentQuery, setDepartmentQuery] = useState('');

  const fetchFaculties = async () => {
    try {
      const res = await api.get('/settings/departments');
      if (res.data.data) {
        setFacultiesData(res.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchFaculties();
  }, []);

  const totalDepartments = useMemo(() => {
    return facultiesData.reduce((acc, f) => acc + (f?.departments?.length ?? 0), 0);
  }, [facultiesData]);

  const filteredFacultiesData = useMemo(() => {
    const q = departmentQuery.trim().toLowerCase();
    if (!q) return facultiesData;
    return facultiesData
      .map((f) => {
        const filteredDepartments = (f?.departments ?? []).filter((d) => {
          const name =
            typeof d === 'object' && d !== null ? (d as any).name || (d as any).id : String(d);
          return String(name).toLowerCase().includes(q);
        });
        return { ...f, departments: filteredDepartments };
      })
      .filter((f) => (f?.departments?.length ?? 0) > 0);
  }, [facultiesData, departmentQuery]);

  return {
    facultiesData,
    setFacultiesData,
    departmentQuery,
    setDepartmentQuery,
    totalDepartments,
    filteredFacultiesData,
    fetchFaculties,
  };
}
