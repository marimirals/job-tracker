package model

import (
	"encoding/json"
	"time"
)

const (
	SourceHH    = "hh"
	SourceOther = "other"

	SkillHard = "hard"
	SkillSoft = "soft"
)

var validStatuses = map[string]bool{
	"saved":     true,
	"applied":   true,
	"responded": true,
	"interview": true,
	"offer":     true,
	"rejected":  true,
}

var validWorkFormats = map[string]bool{
	"remote": true,
	"hybrid": true,
	"office": true,
}

func IsValidStatus(status string) bool {
	return validStatuses[status]
}

func IsValidWorkFormat(format string) bool {
	return validWorkFormats[format]
}

type Vacancy struct {
	ID          int64     `json:"id"`
	URL         string    `json:"url"`
	Source      string    `json:"source"`
	Title       string    `json:"title"`
	Company     *string   `json:"company"`
	SalaryFrom  *int      `json:"salaryFrom"`
	SalaryTo    *int      `json:"salaryTo"`
	Currency    *string   `json:"currency"`
	WorkFormat  *string   `json:"workFormat"`
	Grade       *string   `json:"grade"`
	Status      string    `json:"status"`
	DirectionID *int64    `json:"directionId"`
	Match       *int      `json:"match"`
	CreatedAt   time.Time `json:"createdAt"`
}

type VacancySkill struct {
	Name string `json:"name"`
	Type string `json:"type"`
	Has  bool   `json:"has"`
}

type VacancyDetails struct {
	Vacancy
	Notes   string         `json:"notes"`
	RawText string         `json:"rawText"`
	Skills  []VacancySkill `json:"skills"`
}

type VacancyPatch struct {
	Status      *string    `json:"status"`
	Notes       *string    `json:"notes"`
	DirectionID OptionalID `json:"directionId"`
}

// OptionalID tells apart a missing JSON field from an explicit null:
// {"directionId": null} clears the direction, while no field leaves it as is.
type OptionalID struct {
	Set   bool
	Value *int64
}

func (o *OptionalID) UnmarshalJSON(data []byte) error {
	o.Set = true
	if string(data) == "null" {
		o.Value = nil
		return nil
	}
	var value int64
	if err := json.Unmarshal(data, &value); err != nil {
		return err
	}
	o.Value = &value
	return nil
}

type SavedVacancy struct {
	ID      int64   `json:"id"`
	Title   string  `json:"title"`
	Company *string `json:"company"`
	Match   *int    `json:"match"`
}

type SkillInput struct {
	Name string
	Type string
}

type NewVacancy struct {
	URL        string
	Source     string
	Title      string
	Company    *string
	SalaryFrom *int
	SalaryTo   *int
	Currency   *string
	WorkFormat *string
	Grade      *string
	RawText    string
	Skills     []SkillInput
	// DirectionName is the direction suggested by the LLM; it is matched
	// against existing directions by name when the vacancy is saved.
	DirectionName *string
}

type SkillCount struct {
	Name  string
	Type  string
	Count int
	Has   bool
}

type SkillStat struct {
	Name    string `json:"name"`
	Type    string `json:"type"`
	Count   int    `json:"count"`
	Percent int    `json:"percent"`
	Has     bool   `json:"has"`
}

type SkillGaps struct {
	TotalVacancies int         `json:"totalVacancies"`
	AverageMatch   *int        `json:"averageMatch"`
	HighMatchCount int         `json:"highMatchCount"`
	Skills         []SkillStat `json:"skills"`
}

type Direction struct {
	ID           int64  `json:"id"`
	Name         string `json:"name"`
	VacancyCount int    `json:"vacancyCount"`
}

// Resume is the part of a resume that differs between directions.
// Contacts, experience and education live in the frontend profile.
type Resume struct {
	DirectionID  int64      `json:"directionId"`
	Position     string     `json:"position"`
	About        string     `json:"about"`
	Skills       []string   `json:"skills"`
	Missing      []string   `json:"missing"`
	VacancyCount int        `json:"vacancyCount"`
	GeneratedAt  *time.Time `json:"generatedAt"`
}

type ResumeUpdate struct {
	Position string   `json:"position"`
	About    string   `json:"about"`
	Skills   []string `json:"skills"`
}
