package skills

import (
	"reflect"
	"testing"

	"jobtracker/internal/model"
)

func TestNormalize(t *testing.T) {
	tests := map[string]string{
		"ReactJS":          "React",
		"  react.js ":      "React",
		"TS":               "TypeScript",
		"Работа в команде": "Командная работа",
		"Storybook":        "Storybook",
		"Web   Components": "Web Components",
		"Docker,":          "Docker",
	}

	for input, want := range tests {
		if got := Normalize(input); got != want {
			t.Errorf("Normalize(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestNormalizeListRemovesDuplicates(t *testing.T) {
	got := NormalizeList([]string{"React", "reactjs", "", "  ", "Vue", "VUE"})
	want := []string{"React", "Vue"}

	if !reflect.DeepEqual(got, want) {
		t.Errorf("NormalizeList() = %v, want %v", got, want)
	}
}

func TestBuildFirstOccurrenceWins(t *testing.T) {
	got := Build([]string{"React", "Git"}, []string{"git", "Ответственность"})
	want := []model.SkillInput{
		{Name: "React", Type: model.SkillHard},
		{Name: "Git", Type: model.SkillHard},
		{Name: "Ответственность", Type: model.SkillSoft},
	}

	if !reflect.DeepEqual(got, want) {
		t.Errorf("Build() = %v, want %v", got, want)
	}
}

func TestClassify(t *testing.T) {
	got := Classify([]string{"React", "Работа в команде", "Git"})
	want := []model.SkillInput{
		{Name: "React", Type: model.SkillHard},
		{Name: "Git", Type: model.SkillHard},
		{Name: "Командная работа", Type: model.SkillSoft},
	}

	if !reflect.DeepEqual(got, want) {
		t.Errorf("Classify() = %v, want %v", got, want)
	}
}