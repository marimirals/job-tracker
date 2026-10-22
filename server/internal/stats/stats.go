package stats

import (
	"math"
	"sort"

	"jobtracker/internal/model"
)

const HighMatchThreshold = 80

// Match returns the share of vacancy skills the user has, in percent.
// It returns nil when the user has no skills yet or the vacancy has no skills,
// because a percentage would be meaningless in both cases.
func Match(covered, total int, hasMySkills bool) *int {
	if !hasMySkills || total == 0 {
		return nil
	}
	value := percent(covered, total)
	return &value
}

// Gaps builds skill statistics across all saved vacancies.
func Gaps(totalVacancies int, counts []model.SkillCount, matches []*int) model.SkillGaps {
	skills := make([]model.SkillStat, 0, len(counts))
	for _, count := range counts {
		skills = append(skills, model.SkillStat{
			Name:    count.Name,
			Type:    count.Type,
			Count:   count.Count,
			Percent: percent(count.Count, totalVacancies),
			Has:     count.Has,
		})
	}

	sort.SliceStable(skills, func(i, j int) bool {
		if skills[i].Count != skills[j].Count {
			return skills[i].Count > skills[j].Count
		}
		return skills[i].Name < skills[j].Name
	})

	var sum, known, high int
	for _, match := range matches {
		if match == nil {
			continue
		}
		sum += *match
		known++
		if *match >= HighMatchThreshold {
			high++
		}
	}

	var average *int
	if known > 0 {
		value := int(math.Round(float64(sum) / float64(known)))
		average = &value
	}

	return model.SkillGaps{
		TotalVacancies: totalVacancies,
		AverageMatch:   average,
		HighMatchCount: high,
		Skills:         skills,
	}
}

func percent(part, total int) int {
	if total == 0 {
		return 0
	}
	return int(math.Round(float64(part) * 100 / float64(total)))
}