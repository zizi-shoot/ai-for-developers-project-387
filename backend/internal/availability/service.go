package availability

import (
	"time"

	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/apperror"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/booking"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/eventtype"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/platform"
)

const (
	bookingWindowDays = 14
	workdayStartHour  = 9
	workdayEndHour    = 18
	slotStepMinutes   = 15
)

type Slot struct {
	StartsAt time.Time `json:"startsAt"`
}

type BookingRepository interface {
	ListBookings() []booking.Booking
}

type EventTypes interface {
	Get(id string) (eventtype.EventType, error)
}

type Service struct {
	bookings   BookingRepository
	eventTypes EventTypes
	clock      platform.Clock
}

func NewService(bookings BookingRepository, eventTypes EventTypes, clock platform.Clock) *Service {
	return &Service{bookings: bookings, eventTypes: eventTypes, clock: clock}
}

func (service *Service) List(eventTypeID string) ([]Slot, error) {
	selectedEventType, err := service.eventTypes.Get(eventTypeID)
	if err != nil {
		return nil, err
	}

	now := service.clock.Now()
	today := startOfUTCDay(now)
	bookings := service.bookings.ListBookings()
	result := make([]Slot, 0)

	for day := 0; day < bookingWindowDays; day++ {
		date := today.AddDate(0, 0, day)
		workdayStart := date.Add(workdayStartHour * time.Hour)
		workdayEnd := date.Add(workdayEndHour * time.Hour)
		for startsAt := workdayStart; !startsAt.Add(duration(selectedEventType)).After(workdayEnd); startsAt = startsAt.Add(slotStepMinutes * time.Minute) {
			if startsAt.Before(now) || overlapsAny(startsAt, startsAt.Add(duration(selectedEventType)), bookings) {
				continue
			}
			result = append(result, Slot{StartsAt: startsAt})
		}
	}

	return result, nil
}

func (service *Service) ValidateStart(selectedEventType eventtype.EventType, startsAt time.Time) error {
	now := service.clock.Now()
	today := startOfUTCDay(now)
	lastDayExclusive := today.AddDate(0, 0, bookingWindowDays)
	endsAt := startsAt.Add(duration(selectedEventType))
	workdayEnd := startOfUTCDay(startsAt).Add(workdayEndHour * time.Hour)

	valid := !startsAt.Before(now) &&
		!startsAt.Before(today) && startsAt.Before(lastDayExclusive) &&
		startsAt.Location() == time.UTC && startsAt.Second() == 0 && startsAt.Nanosecond() == 0 &&
		startsAt.Minute()%slotStepMinutes == 0 && startsAt.Hour() >= workdayStartHour &&
		!endsAt.After(workdayEnd)
	if !valid {
		return apperror.New(apperror.CodeInvalidSlot, "Выбранное время не является доступным слотом.")
	}

	return nil
}

func startOfUTCDay(value time.Time) time.Time {
	value = value.UTC()
	return time.Date(value.Year(), value.Month(), value.Day(), 0, 0, 0, 0, time.UTC)
}

func duration(value eventtype.EventType) time.Duration {
	return time.Duration(value.DurationMinutes) * time.Minute
}

func overlapsAny(startsAt, endsAt time.Time, bookings []booking.Booking) bool {
	for _, value := range bookings {
		existingEnd := value.StartsAt.Add(time.Duration(value.DurationMinutes) * time.Minute)
		if startsAt.Before(existingEnd) && value.StartsAt.Before(endsAt) {
			return true
		}
	}
	return false
}
