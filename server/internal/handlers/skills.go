package handlers

import (
	"net/http"

	"jobtracker/internal/skills"
	"jobtracker/internal/stats"
)

const maxMySkills = 200

type replaceSkillsRequest struct {
	Skills []string `json:"skills"`
}

func (h *Handler) listAllSkills(w http.ResponseWriter, r *http.Request) {
	names, err := h.store.ListAllSkills(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, names)
}

func (h *Handler) listMySkills(w http.ResponseWriter, r *http.Request) {
	names, err := h.store.ListMySkills(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, names)
}

func (h *Handler) replaceMySkills(w http.ResponseWriter, r *http.Request) {
	var req replaceSkillsRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	names := skills.NormalizeList(req.Skills)
	if len(names) > maxMySkills {
		writeError(w, http.StatusBadRequest, "too many skills")
		return
	}

	saved, err := h.store.ReplaceMySkills(r.Context(), names)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, saved)
}

func (h *Handler) skillGaps(w http.ResponseWriter, r *http.Request) {
	vacancies, err := h.store.ListVacancies(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}

	counts, err := h.store.SkillCounts(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}

	matches := make([]*int, 0, len(vacancies))
	for _, vacancy := range vacancies {
		matches = append(matches, vacancy.Match)
	}

	writeJSON(w, http.StatusOK, stats.Gaps(len(vacancies), counts, matches))
}