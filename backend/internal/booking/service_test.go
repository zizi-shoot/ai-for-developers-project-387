package booking_test

import (
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/apperror"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/availability"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/booking"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/eventtype"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/platform"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/repository"
)

func TestCreateRejectsOverlapAcrossEventTypesAndAllowsAdjacent(t *testing.T) {
	service, _, first, second := newBookingService(t)

	created, err := service.Create(validRequest(first.ID, "2026-06-19T09:00:00Z"))
	if err != nil {
		t.Fatalf("first Create() error = %v", err)
	}
	if created.StartsAt.Location() != time.UTC {
		t.Fatalf("StartsAt location = %v, want UTC", created.StartsAt.Location())
	}

	_, err = service.Create(validRequest(second.ID, "2026-06-19T09:15:00Z"))
	assertErrorCode(t, err, apperror.CodeBookingConflict)

	if _, err := service.Create(validRequest(second.ID, "2026-06-19T09:30:00Z")); err != nil {
		t.Fatalf("adjacent Create() error = %v", err)
	}
}

func TestConcurrentCreateAllowsOnlyOneBooking(t *testing.T) {
	service, _, first, _ := newBookingService(t)
	request := validRequest(first.ID, "2026-06-19T10:00:00Z")

	start := make(chan struct{})
	errorsChannel := make(chan error, 2)
	var waitGroup sync.WaitGroup
	for range 2 {
		waitGroup.Add(1)
		go func() {
			defer waitGroup.Done()
			<-start
			_, err := service.Create(request)
			errorsChannel <- err
		}()
	}
	close(start)
	waitGroup.Wait()
	close(errorsChannel)

	successes, conflicts := 0, 0
	for err := range errorsChannel {
		if err == nil {
			successes++
			continue
		}
		applicationError, ok := apperror.As(err)
		if ok && applicationError.Code == apperror.CodeBookingConflict {
			conflicts++
		}
	}
	if successes != 1 || conflicts != 1 {
		t.Fatalf("successes=%d conflicts=%d, want 1 and 1", successes, conflicts)
	}
}

func TestCreateValidation(t *testing.T) {
	service, _, first, _ := newBookingService(t)
	tests := []struct {
		name string
		edit func(*booking.CreateRequest)
		code string
	}{
		{name: "non UTC suffix", edit: func(value *booking.CreateRequest) { value.StartsAt = "2026-06-19T12:00:00+03:00" }, code: apperror.CodeInvalidRequest},
		{name: "invalid email", edit: func(value *booking.CreateRequest) { value.GuestEmail = "not-an-email" }, code: apperror.CodeInvalidRequest},
		{name: "empty name", edit: func(value *booking.CreateRequest) { value.GuestName = "  " }, code: apperror.CodeInvalidRequest},
		{name: "outside schedule", edit: func(value *booking.CreateRequest) { value.StartsAt = "2026-06-19T18:00:00Z" }, code: apperror.CodeInvalidSlot},
		{name: "missing event type", edit: func(value *booking.CreateRequest) { value.EventTypeID = "missing" }, code: apperror.CodeEventTypeNotFound},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := validRequest(first.ID, "2026-06-19T11:00:00Z")
			test.edit(&request)
			_, err := service.Create(request)
			assertErrorCode(t, err, test.code)
		})
	}
}

func TestUpcomingIsFilteredSortedAndJoined(t *testing.T) {
	service, store, first, _ := newBookingService(t)
	for _, value := range []booking.Booking{
		{ID: "later", EventTypeID: first.ID, StartsAt: time.Date(2026, 6, 20, 11, 0, 0, 0, time.UTC), DurationMinutes: 30},
		{ID: "past", EventTypeID: first.ID, StartsAt: time.Date(2026, 6, 19, 8, 0, 0, 0, time.UTC), DurationMinutes: 30},
		{ID: "now", EventTypeID: first.ID, StartsAt: time.Date(2026, 6, 19, 9, 0, 0, 0, time.UTC), DurationMinutes: 30},
	} {
		if created, err := store.CreateBookingIfAvailable(value); err != nil || !created {
			t.Fatalf("seed booking %s: created=%v error=%v", value.ID, created, err)
		}
	}

	values := service.Upcoming()
	if len(values) != 2 || values[0].Booking.ID != "now" || values[1].Booking.ID != "later" {
		t.Fatalf("Upcoming() = %#v", values)
	}
	if values[0].EventType.Title != first.Title {
		t.Fatalf("event type summary = %#v", values[0].EventType)
	}
}

func newBookingService(t *testing.T) (*booking.Service, *repository.Memory, eventtype.EventType, eventtype.EventType) {
	t.Helper()
	clock := platform.FixedClock{Time: time.Date(2026, 6, 19, 9, 0, 0, 0, time.UTC)}
	store := repository.NewMemory()
	eventTypes := eventtype.NewService(store, &platform.SequentialIDGenerator{Values: []string{"event-30", "event-15"}})
	first, err := eventTypes.Create(eventtype.CreateRequest{Title: "Первый", Description: "Описание", DurationMinutes: 30})
	if err != nil {
		t.Fatal(err)
	}
	second, err := eventTypes.Create(eventtype.CreateRequest{Title: "Второй", Description: "Описание", DurationMinutes: 15})
	if err != nil {
		t.Fatal(err)
	}
	slots := availability.NewService(store, eventTypes, clock)
	return booking.NewService(store, eventTypes, slots, clock, platform.UUIDGenerator{}), store, first, second
}

func validRequest(eventTypeID, startsAt string) booking.CreateRequest {
	return booking.CreateRequest{EventTypeID: eventTypeID, StartsAt: startsAt, GuestName: " Анна ", GuestEmail: "anna@example.com"}
}

func assertErrorCode(t *testing.T, err error, code string) {
	t.Helper()
	if err == nil {
		t.Fatalf("error = nil, want %s", code)
	}
	applicationError, ok := apperror.As(err)
	if !ok || applicationError.Code != code {
		t.Fatalf("error = %v, want code %s", errors.Unwrap(err), code)
	}
}
