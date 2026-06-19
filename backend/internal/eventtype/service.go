package eventtype

import (
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/apperror"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/platform"
)

const (
	maxTitleLength       = 100
	maxDescriptionLength = 2000
)

type EventType struct {
	ID              string `json:"id"`
	Title           string `json:"title"`
	Description     string `json:"description"`
	DurationMinutes int    `json:"durationMinutes"`
}

type CreateRequest struct {
	Title           string `json:"title"`
	Description     string `json:"description"`
	DurationMinutes int    `json:"durationMinutes"`
}

type Repository interface {
	ListEventTypes() []EventType
	GetEventType(id string) (EventType, bool)
	AddEventType(value EventType) error
}

type Service struct {
	repository Repository
	ids        platform.IDGenerator
}

func NewService(repository Repository, ids platform.IDGenerator) *Service {
	return &Service{repository: repository, ids: ids}
}

func (service *Service) List() []EventType {
	return service.repository.ListEventTypes()
}

func (service *Service) Get(id string) (EventType, error) {
	value, ok := service.repository.GetEventType(id)
	if !ok {
		return EventType{}, apperror.New(apperror.CodeEventTypeNotFound, "Тип события не найден.")
	}
	return value, nil
}

func (service *Service) Create(request CreateRequest) (EventType, error) {
	request.Title = strings.TrimSpace(request.Title)
	request.Description = strings.TrimSpace(request.Description)

	if err := validate(request); err != nil {
		return EventType{}, err
	}

	id, err := service.ids.New()
	if err != nil {
		return EventType{}, fmt.Errorf("generate event type id: %w", err)
	}

	value := EventType{
		ID:              id,
		Title:           request.Title,
		Description:     request.Description,
		DurationMinutes: request.DurationMinutes,
	}
	if err := service.repository.AddEventType(value); err != nil {
		return EventType{}, fmt.Errorf("add event type: %w", err)
	}

	return value, nil
}

func validate(request CreateRequest) error {
	switch {
	case request.Title == "":
		return apperror.New(apperror.CodeInvalidRequest, "Название типа события обязательно.")
	case utf8.RuneCountInString(request.Title) > maxTitleLength:
		return apperror.New(apperror.CodeInvalidRequest, "Название типа события не должно превышать 100 символов.")
	case request.Description == "":
		return apperror.New(apperror.CodeInvalidRequest, "Описание типа события обязательно.")
	case utf8.RuneCountInString(request.Description) > maxDescriptionLength:
		return apperror.New(apperror.CodeInvalidRequest, "Описание типа события не должно превышать 2000 символов.")
	case !ValidDuration(request.DurationMinutes):
		return apperror.New(apperror.CodeInvalidRequest, "Допустимая длительность: 15, 30, 45 или 60 минут.")
	default:
		return nil
	}
}

func ValidDuration(value int) bool {
	return value == 15 || value == 30 || value == 45 || value == 60
}
