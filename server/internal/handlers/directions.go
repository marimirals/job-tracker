package handlers

import (
	"errors"
	"net/http"
	"strings"
	"unicode/utf8"

	"jobtracker/internal/storage"
)

const maxDirectionName = 60

type createDirectionRequest struct {
	Name string `json:"name"`
}

func (h *Handler) listDirections(w http.ResponseWriter, r *http.Request) {
	directions, err := h.store.ListDirections(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, directions)
}

func (h *Handler) createDirection(w http.ResponseWriter, r *http.Request) {
	var req createDirectionRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	name := strings.TrimSpace(req.Name)
	if name == "" || utf8.RuneCountInString(name) > maxDirectionName {
		writeError(w, http.StatusBadRequest, "name must be 1-60 characters")
		return
	}

	direction, err := h.store.CreateDirection(r.Context(), name)
	if errors.Is(err, storage.ErrDuplicate) {
		writeError(w, http.StatusConflict, "direction already exists")
		return
	}
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, direction)
}

func (h *Handler) deleteDirection(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.store.DeleteDirection(r.Context(), id); err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			writeError(w, http.StatusNotFound, "direction not found")
			return
		}
		writeInternalError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}