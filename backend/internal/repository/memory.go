package repository

import (
	"sort"
	"sync"
	"time"

	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/booking"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/eventtype"
)

type Memory struct {
	mu         sync.RWMutex
	eventTypes map[string]eventtype.EventType
	bookings   []booking.Booking
}

func NewMemory() *Memory {
	return &Memory{
		eventTypes: make(map[string]eventtype.EventType),
		bookings:   make([]booking.Booking, 0),
	}
}

func (memory *Memory) ListEventTypes() []eventtype.EventType {
	memory.mu.RLock()
	defer memory.mu.RUnlock()

	result := make([]eventtype.EventType, 0, len(memory.eventTypes))
	for _, value := range memory.eventTypes {
		result = append(result, value)
	}
	sort.Slice(result, func(left, right int) bool {
		if result[left].Title == result[right].Title {
			return result[left].ID < result[right].ID
		}
		return result[left].Title < result[right].Title
	})
	return result
}

func (memory *Memory) GetEventType(id string) (eventtype.EventType, bool) {
	memory.mu.RLock()
	defer memory.mu.RUnlock()

	value, ok := memory.eventTypes[id]
	return value, ok
}

func (memory *Memory) AddEventType(value eventtype.EventType) error {
	memory.mu.Lock()
	defer memory.mu.Unlock()

	memory.eventTypes[value.ID] = value
	return nil
}

func (memory *Memory) ListBookings() []booking.Booking {
	memory.mu.RLock()
	defer memory.mu.RUnlock()

	result := append([]booking.Booking(nil), memory.bookings...)
	sort.Slice(result, func(left, right int) bool {
		if result[left].StartsAt.Equal(result[right].StartsAt) {
			return result[left].ID < result[right].ID
		}
		return result[left].StartsAt.Before(result[right].StartsAt)
	})
	return result
}

func (memory *Memory) CreateBookingIfAvailable(value booking.Booking) (bool, error) {
	memory.mu.Lock()
	defer memory.mu.Unlock()

	newEnd := value.StartsAt.Add(time.Duration(value.DurationMinutes) * time.Minute)
	for _, existing := range memory.bookings {
		existingEnd := existing.StartsAt.Add(time.Duration(existing.DurationMinutes) * time.Minute)
		if value.StartsAt.Before(existingEnd) && existing.StartsAt.Before(newEnd) {
			return false, nil
		}
	}

	memory.bookings = append(memory.bookings, value)
	return true, nil
}
