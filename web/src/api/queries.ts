import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAllSkills, getMySkills, updateMySkills } from './skills';
import { getSkillGaps } from './stats';
import type { VacancyPatch } from './types';
import { deleteVacancy, getVacancies, getVacancy, updateVacancy } from './vacancies';

const keys = {
  vacancies: ['vacancies'] as const,
  vacancy: (id: number) => ['vacancies', id] as const,
  mySkills: ['skills', 'me'] as const,
  allSkills: ['skills', 'all'] as const,
  stats: ['stats'] as const,
  gaps: ['stats', 'gaps'] as const,
};

export function useVacancies() {
  return useQuery({ queryKey: keys.vacancies, queryFn: getVacancies });
}

export function useVacancy(id: number) {
  return useQuery({ queryKey: keys.vacancy(id), queryFn: () => getVacancy(id) });
}

export function useMySkills() {
  return useQuery({ queryKey: keys.mySkills, queryFn: getMySkills });
}

export function useAllSkills() {
  return useQuery({ queryKey: keys.allSkills, queryFn: getAllSkills });
}

export function useSkillGaps() {
  return useQuery({ queryKey: keys.gaps, queryFn: getSkillGaps });
}

export function useUpdateVacancy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: VacancyPatch }) => updateVacancy(id, patch),
    onSuccess: (vacancy) => {
      queryClient.setQueryData(keys.vacancy(vacancy.id), vacancy);
      return queryClient.invalidateQueries({ queryKey: keys.vacancies, exact: true });
    },
  });
}

export function useDeleteVacancy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteVacancy,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.vacancies, exact: true }),
        queryClient.invalidateQueries({ queryKey: keys.stats }),
      ]),
  });
}

export function useUpdateMySkills() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMySkills,
    onSuccess: (skills) => {
      queryClient.setQueryData(keys.mySkills, skills);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.vacancies }),
        queryClient.invalidateQueries({ queryKey: keys.stats }),
      ]);
    },
  });
}