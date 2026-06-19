package booking

import (
	"fmt"
	"net/mail"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/apperror"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/eventtype"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/platform"
)

const (
	maxGuestNameLength = 100
	maxEmailLength     = 254
)

type Booking struct {
	ID              string    `json:"id"`
	EventTypeID     string    `json:"eventTypeId"`
	StartsAt        time.Time `json:"startsAt"`
	GuestName       string    `json:"guestName"`
	GuestEmail      string    `json:"guestEmail"`
	DurationMinutes int       `json:"-"`
}

type CreateRequest struct {
	EventTypeID string `json:"eventTypeId"`
	StartsAt    string `json:"startsAt"`
	GuestName   string `json:"guestName"`
	GuestEmail  string `json:"guestEmail"`
}

type EventTypeSummary struct {
	ID              string `json:"id"`
	Title           string `json:"title"`
	DurationMinutes int    `json:"durationMinutes"`
}

type UpcomingBooking struct {
	Booking   Booking          `json:"booking"`
	EventType EventTypeSummary `json:"eventType"`
}

type Repository interface {
	CreateBookingIfAvailable(value Booking) (bool, error)
	ListBookings() []Booking
}

type EventTypes interface {
	Get(id string) (eventtype.EventType, error)
}

type SlotValidator interface {
	ValidateStart(value eventtype.EventType, startsAt time.Time) error
}

type Service struct {
	repository Repository
	eventTypes EventTypes
	slots      SlotValidator
	clock      platform.Clock
	ids        platform.IDGenerator
}

func NewService(
	repository Repository,
	eventTypes EventTypes,
	slots SlotValidator,
	clock platform.Clock,
	ids platform.IDGenerator,
) *Service {
	return &Service{repository: repository, eventTypes: eventTypes, slots: slots, clock: clock, ids: ids}
}

func (service *Service) Create(request CreateRequest) (Booking, error) {
	request.EventTypeID = strings.TrimSpace(request.EventTypeID)
	request.GuestName = strings.TrimSpace(request.GuestName)
	request.GuestEmail = strings.TrimSpace(request.GuestEmail)

	startsAt, err := validateRequest(request)
	if err != nil {
		return Booking{}, err
	}

	selectedEventType, err := service.eventTypes.Get(request.EventTypeID)
	if err != nil {
		return Booking{}, err
	}
	if err := service.slots.ValidateStart(selectedEventType, startsAt); err != nil {
		return Booking{}, err
	}

	id, err := service.ids.New()
	if err != nil {
		return Booking{}, fmt.Errorf("generate booking id: %w", err)
	}

	value := Booking{
		ID:              id,
		EventTypeID:     selectedEventType.ID,
		StartsAt:        startsAt,
		GuestName:       request.GuestName,
		GuestEmail:      request.GuestEmail,
		DurationMinutes: selectedEventType.DurationMinutes,
	}
	created, err := service.repository.CreateBookingIfAvailable(value)
	if err != nil {
		return Booking{}, fmt.Errorf("create booking: %w", err)
	}
	if !created {
		return Booking{}, apperror.New(apperror.CodeBookingConflict, "Выбранный интервал уже занят.")
	}

	return value, nil
}

func (service *Service) Upcoming() []UpcomingBooking {
	now := service.clock.Now()
	values := service.repository.ListBookings()
	result := make([]UpcomingBooking, 0, len(values))

	for _, value := range values {
		if value.StartsAt.Before(now) {
			continue
		}
		selectedEventType, err := service.eventTypes.Get(value.EventTypeID)
		if err != nil {
			continue
		}
		result = append(result, UpcomingBooking{
			Booking: value,
			EventType: EventTypeSummary{
				ID:              selectedEventType.ID,
				Title:           selectedEventType.Title,
				DurationMinutes: selectedEventType.DurationMinutes,
			},
		})
	}

	// Repository возвращает бронирования в хронологическом порядке.
	return result
}

func validateRequest(request CreateRequest) (time.Time, error) {
	switch {
	case request.EventTypeID == "":
		return time.Time{}, apperror.New(apperror.CodeInvalidRequest, "Идентификатор типа события обязателен.")
	case request.GuestName == "":
		return time.Time{}, apperror.New(apperror.CodeInvalidRequest, "Имя гостя обязательно.")
	case utf8.RuneCountInString(request.GuestName) > maxGuestNameLength:
		return time.Time{}, apperror.New(apperror.CodeInvalidRequest, "Имя гостя не должно превышать 100 символов.")
	case request.GuestEmail == "":
		return time.Time{}, apperror.New(apperror.CodeInvalidRequest, "Email гостя обязателен.")
	case len(request.GuestEmail) > maxEmailLength || !validEmail(request.GuestEmail):
		return time.Time{}, apperror.New(apperror.CodeInvalidRequest, "Email гостя имеет неверный формат.")
	}

	if !strings.HasSuffix(request.StartsAt, "Z") {
		return time.Time{}, apperror.New(apperror.CodeInvalidRequest, "Начало бронирования должно быть временем RFC 3339 в UTC с суффиксом Z.")
	}
	startsAt, err := time.Parse(time.RFC3339, request.StartsAt)
	if err != nil {
		return time.Time{}, apperror.New(apperror.CodeInvalidRequest, "Начало бронирования должно быть временем RFC 3339 в UTC с суффиксом Z.")
	}

	return startsAt.UTC(), nil
}

func validEmail(value string) bool {
	if strings.Count(value, "@") != 1 || strings.ContainsAny(value, "\r\n") {
		return false
	}
	address, err := mail.ParseAddress(value)
	return err == nil && address.Address == value
}
