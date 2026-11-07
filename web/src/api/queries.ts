import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createDirection, deleteDirection, getDirections } from './directions';
import { generateResume, getResume, saveResume } from './resumes';
import { getAllSkills, getMySkills, updateMySkills } from './skills';
import { getSkillGaps } from './stats';
import type { ResumeUpdate, VacancyPatch } from './types';
import { deleteVacancy, getVacancies, getVacancy, updateVacancy } from './vacancies';

const keys = {
  vacancies: ['vacancies'] as const,
  vacancy: (id: number) => ['vacancies', id] as const,
  mySkills: ['skills', 'me'] as const,
  allSkills: ['skills', 'all'] as const,
  stats: ['stats'] as const,
  gaps: (directionId: number | null) => ['stats', 'gaps', directionId] as const,
  directions: ['directions'] as const,
  resumes: ['resumes'] as const,
  resume: (directionId: number) => ['resumes', directionId] as const,
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

export function useSkillGaps(directionId: number | null = null) {
  return useQuery({ queryKey: keys.gaps(directionId), queryFn: () => getSkillGaps(directionId) });
}

export function useDirections() {
  return useQuery({ queryKey: keys.directions, queryFn: getDirections });
}

export function useResume(directionId: number) {
  return useQuery({ queryKey: keys.resume(directionId), queryFn: () => getResume(directionId) });
}

export function useUpdateVacancy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: VacancyPatch }) => updateVacancy(id, patch),
    onSuccess: (vacancy, { patch }) => {
      queryClient.setQueryData(keys.vacancy(vacancy.id), vacancy);
      const invalidations = [queryClient.invalidateQueries({ queryKey: keys.vacancies, exact: true })];
      // Moving a vacancy to another direction changes counts, stats and resumes.
      if (patch.directionId !== undefined) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: keys.directions }),
          queryClient.invalidateQueries({ queryKey: keys.stats }),
          queryClient.invalidateQueries({ queryKey: keys.resumes }),
        );
      }
      return Promise.all(invalidations);
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
        queryClient.invalidateQueries({ queryKey: keys.directions }),
        queryClient.invalidateQueries({ queryKey: keys.resumes }),
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
        queryClient.invalidateQueries({ queryKey: keys.resumes }),
      ]);
    },
  });
}

export function useCreateDirection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDirection,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.directions }),
  });
}

export function useDeleteDirection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDirection,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: keys.directions }),
        queryClient.invalidateQueries({ queryKey: keys.vacancies }),
        queryClient.invalidateQueries({ queryKey: keys.stats }),
      ]),
  });
}

export function useSaveResume(directionId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (update: ResumeUpdate) => saveResume(directionId, update),
    onSuccess: (resume) => queryClient.setQueryData(keys.resume(directionId), resume),
  });
}

export function useGenerateResume(directionId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (background: string) => generateResume(directionId, background),
    onSuccess: (resume) => queryClient.setQueryData(keys.resume(directionId), resume),
  });
}