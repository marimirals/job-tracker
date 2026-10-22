package skills

import (
	"strings"

	"jobtracker/internal/model"
)

// aliases maps lower-cased spellings to one canonical name.
var aliases = map[string]string{
	"react":            "React",
	"reactjs":          "React",
	"react.js":         "React",
	"react js":         "React",
	"typescript":       "TypeScript",
	"ts":               "TypeScript",
	"javascript":       "JavaScript",
	"js":               "JavaScript",
	"java script":      "JavaScript",
	"es6":              "JavaScript",
	"vue":              "Vue",
	"vuejs":            "Vue",
	"vue.js":           "Vue",
	"vue 3":            "Vue",
	"vue3":             "Vue",
	"angular":          "Angular",
	"next":             "Next.js",
	"nextjs":           "Next.js",
	"next.js":          "Next.js",
	"node":             "Node.js",
	"nodejs":           "Node.js",
	"node.js":          "Node.js",
	"html":             "HTML",
	"html5":            "HTML",
	"css":              "CSS",
	"css3":             "CSS",
	"scss":             "SCSS",
	"sass":             "SCSS",
	"redux":            "Redux",
	"redux toolkit":    "Redux Toolkit",
	"rtk":              "Redux Toolkit",
	"git":              "Git",
	"rest":             "REST API",
	"rest api":         "REST API",
	"restful api":      "REST API",
	"graphql":          "GraphQL",
	"webpack":          "Webpack",
	"vite":             "Vite",
	"jest":             "Jest",
	"docker":           "Docker",
	"kubernetes":       "Kubernetes",
	"k8s":              "Kubernetes",
	"postgres":         "PostgreSQL",
	"postgresql":       "PostgreSQL",
	"go":               "Go",
	"golang":           "Go",
	"figma":            "Figma",
	"english":          "Английский язык",
	"английский":       "Английский язык",
	"английский язык":  "Английский язык",
	"teamwork":         "Командная работа",
	"работа в команде": "Командная работа",
	"командная работа": "Командная работа",
}

var softSkills = map[string]bool{
	"командная работа":       true,
	"коммуникабельность":     true,
	"ответственность":        true,
	"самостоятельность":      true,
	"обучаемость":            true,
	"внимание к деталям":     true,
	"стрессоустойчивость":    true,
	"тайм-менеджмент":        true,
	"аналитическое мышление": true,
	"грамотная речь":         true,
	"деловая коммуникация":   true,
	"деловое общение":        true,
	"лидерство":              true,
	"креативность":           true,
	"инициативность":         true,
	"пунктуальность":         true,
}

// Normalize trims a skill name, collapses spaces and maps known aliases
// to a canonical spelling ("ReactJS" → "React").
func Normalize(name string) string {
	cleaned := strings.Join(strings.Fields(name), " ")
	cleaned = strings.Trim(cleaned, ".,;:")
	if canonical, ok := aliases[strings.ToLower(cleaned)]; ok {
		return canonical
	}
	return cleaned
}

// IsSoft reports whether a normalized skill name is a known soft skill.
func IsSoft(name string) bool {
	return softSkills[strings.ToLower(name)]
}

// NormalizeList normalizes names and removes empty values and duplicates.
func NormalizeList(names []string) []string {
	seen := make(map[string]bool)
	result := make([]string, 0, len(names))
	for _, name := range names {
		normalized := Normalize(name)
		key := strings.ToLower(normalized)
		if normalized == "" || seen[key] {
			continue
		}
		seen[key] = true
		result = append(result, normalized)
	}
	return result
}

// Build combines hard and soft skill lists into normalized inputs without duplicates.
// If a skill appears in both lists, the first occurrence wins.
func Build(hard, soft []string) []model.SkillInput {
	seen := make(map[string]bool)
	result := make([]model.SkillInput, 0, len(hard)+len(soft))

	add := func(names []string, skillType string) {
		for _, name := range NormalizeList(names) {
			key := strings.ToLower(name)
			if seen[key] {
				continue
			}
			seen[key] = true
			result = append(result, model.SkillInput{Name: name, Type: skillType})
		}
	}

	add(hard, model.SkillHard)
	add(soft, model.SkillSoft)
	return result
}

// Classify splits a flat list of names into hard and soft skills using the known soft-skill list.
func Classify(names []string) []model.SkillInput {
	var hard, soft []string
	for _, name := range NormalizeList(names) {
		if IsSoft(name) {
			soft = append(soft, name)
		} else {
			hard = append(hard, name)
		}
	}
	return Build(hard, soft)
}