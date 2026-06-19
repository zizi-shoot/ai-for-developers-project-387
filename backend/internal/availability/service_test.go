package availability_test

import (
	"testing"
	"time"

	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/apperror"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/availability"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/booking"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/eventtype"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/platform"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/repository"
)

func TestListSlotsRespectsScheduleWindowAndPast(t *testing.T) {
	clock := platform.FixedClock{Time: time.Date(2026, 6, 19, 10, 7, 0, 0, time.UTC)}
	store, eventTypes, service := newAvailability(t, clock)
	value := createEventType(t, eventTypes, "event-60", 60)

	slots, err := service.List(value.ID)
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	if got, want := slots[0].StartsAt, time.Date(2026, 6, 19, 10, 15, 0, 0, time.UTC); !got.Equal(want) {
		t.Fatalf("first slot = %v, want %v", got, want)
	}
	if got, want := slots[len(slots)-1].StartsAt, time.Date(2026, 7, 2, 17, 0, 0, 0, time.UTC); !got.Equal(want) {
		t.Fatalf("last slot = %v, want %v", got, want)
	}

	created, err := store.CreateBookingIfAvailable(booking.Booking{
		ID: "booking-1", EventTypeID: value.ID,
		StartsAt: time.Date(2026, 6, 20, 9, 30, 0, 0, time.UTC), DurationMinutes: 60,
	})
	if err != nil || !created {
		t.Fatalf("seed booking: created=%v error=%v", created, err)
	}
	slots, err = service.List(value.ID)
	if err != nil {
		t.Fatalf("List() after booking error = %v", err)
	}
	for _, slot := range slots {
		if !slot.StartsAt.Before(time.Date(2026, 6, 20, 8, 45, 0, 0, time.UTC)) &&
			slot.StartsAt.Before(time.Date(2026, 6, 20, 10, 30, 0, 0, time.UTC)) {
			t.Fatalf("overlapping slot returned: %v", slot.StartsAt)
		}
	}
}

func TestValidateStart(t *testing.T) {
	clock := platform.FixedClock{Time: time.Date(2026, 6, 19, 8, 0, 0, 0, time.UTC)}
	_, eventTypes, service := newAvailability(t, clock)
	value := createEventType(t, eventTypes, "event-45", 45)

	tests := []struct {
		name    string
		value   time.Time
		wantErr bool
	}{
		{name: "start of workday", value: time.Date(2026, 6, 19, 9, 0, 0, 0, time.UTC)},
		{name: "ends at workday boundary", value: time.Date(2026, 6, 19, 17, 15, 0, 0, time.UTC)},
		{name: "before workday", value: time.Date(2026, 6, 19, 8, 45, 0, 0, time.UTC), wantErr: true},
		{name: "ends after workday", value: time.Date(2026, 6, 19, 17, 30, 0, 0, time.UTC), wantErr: true},
		{name: "outside grid", value: time.Date(2026, 6, 19, 9, 10, 0, 0, time.UTC), wantErr: true},
		{name: "outside last day", value: time.Date(2026, 7, 3, 9, 0, 0, 0, time.UTC), wantErr: true},
		{name: "non UTC", value: time.Date(2026, 6, 19, 9, 0, 0, 0, time.FixedZone("UTC+3", 3*60*60)), wantErr: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := service.ValidateStart(value, test.value)
			if (err != nil) != test.wantErr {
				t.Fatalf("ValidateStart() error = %v, wantErr %v", err, test.wantErr)
			}
			if err != nil {
				applicationError, ok := apperror.As(err)
				if !ok || applicationError.Code != apperror.CodeInvalidSlot {
					t.Fatalf("error = %#v, want INVALID_SLOT", err)
				}
			}
		})
	}
}

func newAvailability(t *testing.T, clock platform.Clock) (*repository.Memory, *eventtype.Service, *availability.Service) {
	t.Helper()
	store := repository.NewMemory()
	eventTypes := eventtype.NewService(store, &platform.SequentialIDGenerator{Values: []string{"event-60", "event-45", "event-15"}})
	return store, eventTypes, availability.NewService(store, eventTypes, clock)
}

func createEventType(t *testing.T, service *eventtype.Service, title string, duration int) eventtype.EventType {
	t.Helper()
	value, err := service.Create(eventtype.CreateRequest{Title: title, Description: "Описание", DurationMinutes: duration})
	if err != nil {
		t.Fatalf("Create event type: %v", err)
	}
	return value
}
