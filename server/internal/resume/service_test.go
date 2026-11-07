package resume

import (
	"reflect"
	"testing"

	"jobtracker/internal/model"
)

var counts = []model.SkillCount{
	{Name: "React", Type: model.SkillHard, Count: 5, Has: false},
	{Name: "JavaScript", Type: model.SkillHard, Count: 4, Has: true},
	{Name: "Командная работа", Type: model.SkillSoft, Count: 3, Has: false},
	{Name: "SQL", Type: model.SkillHard, Count: 2, Has: true},
	{Name: "Docker", Type: model.SkillHard, Count: 1, Has: false},
}

func TestPickSkillsOrdersByDemand(t *testing.T) {
	got := PickSkills(counts, []string{"SQL", "Python", "javascript"})
	want := []string{"javascript", "SQL"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("PickSkills() = %v, want %v", got, want)
	}
}

func TestPickSkillsFallsBackToAllSkills(t *testing.T) {
	got := PickSkills(nil, []string{"Python", "SQL"})
	want := []string{"Python", "SQL"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("PickSkills() = %v, want %v", got, want)
	}
}

func TestMissingSkillsSkipsOwnedSoftAndResumeSkills(t *testing.T) {
	got := MissingSkills(counts, []string{"react"})
	want := []string{"Docker"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("MissingSkills() = %v, want %v", got, want)
	}
}