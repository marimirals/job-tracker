package handlers

import (
	"net/http"

	"jobtracker/internal/ingest"
	"jobtracker/internal/storage"
)

type Handler struct {
	store  *storage.Storage
	ingest *ingest.Service
}

func New(store *storage.Storage, ingestService *ingest.Service) *Handler {
	return &Handler{store: store, ingest: ingestService}
}

func (h *Handler) Routes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", h.health)

	mux.HandleFunc("POST /api/vacancies", h.createVacancy)
	mux.HandleFunc("GET /api/vacancies", h.listVacancies)
	mux.HandleFunc("GET /api/vacancies/{id}", h.getVacancy)
	mux.HandleFunc("PATCH /api/vacancies/{id}", h.updateVacancy)
	mux.HandleFunc("DELETE /api/vacancies/{id}", h.deleteVacancy)

	mux.HandleFunc("GET /api/skills", h.listAllSkills)
	mux.HandleFunc("GET /api/skills/me", h.listMySkills)
	mux.HandleFunc("PUT /api/skills/me", h.replaceMySkills)

	mux.HandleFunc("GET /api/stats/gaps", h.skillGaps)

	return mux
}

func (h *Handler) health(w http.ResponseWriter, r *http.Request) {
	if err := h.store.Ping(r.Context()); err != nil {
		writeError(w, http.StatusServiceUnavailable, "database unavailable")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}