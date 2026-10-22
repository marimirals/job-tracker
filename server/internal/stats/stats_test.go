package stats

import (
	"testing"

	"jobtracker/internal/model"
)

func intPtr(v int) *int { return &v }

func TestMatch(t *testing.T) {
	tests := []struct {
		name        string
		covered     int
		total       int
		hasMySkills bool
		want        *int
	}{
		{"no my skills", 0, 5, false, nil},
		{"vacancy without skills", 0, 0, true, nil},
		{"two of three", 2, 3, true, intPtr(67)},
		{"all", 4, 4, true, intPtr(100)},
		{"none", 0, 4, true, intPtr(0)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Match(tt.covered, tt.total, tt.hasMySkills)
			if (got == nil) != (tt.want == nil) || (got != nil && *got != *tt.want) {
				t.Errorf("Match() = %v, want %v", deref(got), deref(tt.want))
			}
		})
	}
}

func TestGaps(t *testing.T) {
	counts := []model.SkillCount{
		{Name: "Docker", Type: model.SkillHard, Count: 2, Has: false},
		{Name: "React", Type: model.SkillHard, Count: 4, Has: true},
		{Name: "Git", Type: model.SkillHard, Count: 2, Has: true},
	}
	matches := []*int{intPtr(90), intPtr(60), nil, intPtr(80)}

	got := Gaps(4, counts, matches)

	if got.TotalVacancies != 4 {
		t.Errorf("TotalVacancies = %d, want 4", got.TotalVacancies)
	}
	if got.AverageMatch == nil || *got.AverageMatch != 77 {
		t.Errorf("AverageMatch = %v, want 77", deref(got.AverageMatch))
	}
	if got.HighMatchCount != 2 {
		t.Errorf("HighMatchCount = %d, want 2", got.HighMatchCount)
	}

	wantOrder := []string{"React", "Docker", "Git"}
	for i, name := range wantOrder {
		if got.Skills[i].Name != name {
			t.Errorf("Skills[%d] = %s, want %s", i, got.Skills[i].Name, name)
		}
	}
	if got.Skills[0].Percent != 100 || got.Skills[1].Percent != 50 {
		t.Errorf("unexpected percents: %+v", got.Skills)
	}
}

func TestGapsWithoutMatches(t *testing.T) {
	got := Gaps(0, nil, nil)
	if got.AverageMatch != nil || got.Skills == nil {
		t.Errorf("unexpected result: %+v", got)
	}
}

func deref(v *int) any {
	if v == nil {
		return nil
	}
	return *v
}