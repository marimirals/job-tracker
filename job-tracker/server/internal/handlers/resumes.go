package handlers

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"unicode/utf8"

	"jobtracker/internal/llm"
	"jobtracker/internal/model"
	"jobtracker/internal/skills"
	"jobtracker/internal/storage"
)

const (
	maxPositionRunes   = 120
	maxResumeSkills    = 40
	maxBackgroundRunes = 2000
)

type generateResumeRequest struct {
	Background string `json:"background"`
}

func (h *Handler) getResume(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	resume, err := h.resumes.Get(r.Context(), id)
	h.respondWithResume(w, resume, err)
}

func (h *Handler) saveResume(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	var update model.ResumeUpdate
	if err := decodeJSON(w, r, &update); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	update.Position = strings.TrimSpace(update.Position)
	update.Skills = skills.NormalizeList(update.Skills)
	if utf8.RuneCountInString(update.Position) > maxPositionRunes || len(update.Skills) > maxResumeSkills {
		writeError(w, http.StatusBadRequest, "position or skills list is too long")
		return
	}

	resume, err := h.resumes.Save(r.Context(), id, update)
	h.respondWithResume(w, resume, err)
}

func (h *Handler) generateResume(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	var req generateResumeRequest
	if err := decodeJSON(w, r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if utf8.RuneCountInString(req.Background) > maxBackgroundRunes {
		writeError(w, http.StatusBadRequest, "background is too long")
		return
	}

	resume, err := h.resumes.Generate(r.Context(), id, strings.TrimSpace(req.Background))
	if err != nil && !errors.Is(err, storage.ErrNotFound) {
		slog.Warn("resume generation failed", "direction", id, "error", err)
		message := "Нейросеть не ответила. Проверь ключи в server/.env и попробуй ещё раз."
		if errors.Is(err, llm.ErrNotConfigured) {
			message = "Не настроена нейросеть: добавь ключ OpenRouter или GigaChat в server/.env."
		}
		writeError(w, http.StatusBadGateway, message)
		return
	}
	h.respondWithResume(w, resume, err)
}

func (h *Handler) respondWithResume(w http.ResponseWriter, resume model.Resume, err error) {
	if errors.Is(err, storage.ErrNotFound) {
		writeError(w, http.StatusNotFound, "direction not found")
		return
	}
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, resume)
}
