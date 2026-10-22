package handlers

import (
	"errors"
	"net/http"
	"net/url"
	"strings"

	"jobtracker/internal/ingest"
	"jobtracker/internal/model"
	"jobtracker/internal/storage"
)

type createVacancyRequest struct {
	URL   string `json:"url"`
	Title string `json:"title"`
	Text  string `json:"text"`
}

func (h *Handler) createVacancy(w http.ResponseWriter, r *http.Request) {
	var req createVacancyRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	parsed, err := url.Parse(strings.TrimSpace(req.URL))
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
		writeError(w, http.StatusBadRequest, "url must be an http(s) link")
		return
	}

	saved, duplicate, err := h.ingest.Save(r.Context(), ingest.Input{
		URL:   parsed.String(),
		Title: req.Title,
		Text:  req.Text,
	})
	if err != nil {
		writeInternalError(w, err)
		return
	}

	if duplicate {
		writeJSON(w, http.StatusConflict, saved)
		return
	}
	writeJSON(w, http.StatusCreated, saved)
}

func (h *Handler) listVacancies(w http.ResponseWriter, r *http.Request) {
	vacancies, err := h.store.ListVacancies(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, vacancies)
}

func (h *Handler) getVacancy(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	h.respondWithVacancy(w, r, id)
}

func (h *Handler) updateVacancy(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	var patch model.VacancyPatch
	if err := decodeJSON(w, r, &patch); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if patch.Status != nil && !model.IsValidStatus(*patch.Status) {
		writeError(w, http.StatusBadRequest, "unknown status")
		return
	}

	if err := h.store.UpdateVacancy(r.Context(), id, patch); err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			writeError(w, http.StatusNotFound, "vacancy not found")
			return
		}
		writeInternalError(w, err)
		return
	}

	h.respondWithVacancy(w, r, id)
}

func (h *Handler) deleteVacancy(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.store.DeleteVacancy(r.Context(), id); err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			writeError(w, http.StatusNotFound, "vacancy not found")
			return
		}
		writeInternalError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) respondWithVacancy(w http.ResponseWriter, r *http.Request, id int64) {
	details, err := h.store.GetVacancy(r.Context(), id)
	if errors.Is(err, storage.ErrNotFound) {
		writeError(w, http.StatusNotFound, "vacancy not found")
		return
	}
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, details)
}