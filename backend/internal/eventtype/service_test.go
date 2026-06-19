package eventtype_test

import (
	"strings"
	"testing"

	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/apperror"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/eventtype"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/platform"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/repository"
)

func TestCreateNormalizesAndValidatesEventType(t *testing.T) {
	service := eventtype.NewService(repository.NewMemory(), &platform.SequentialIDGenerator{Values: []string{"event-1"}})
	value, err := service.Create(eventtype.CreateRequest{
		Title: "  Консультация  ", Description: "  Обсуждение задачи  ", DurationMinutes: 30,
	})
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}
	if value.ID != "event-1" || value.Title != "Консультация" || value.Description != "Обсуждение задачи" {
		t.Fatalf("Create() = %#v", value)
	}

	tests := []struct {
		name    string
		request eventtype.CreateRequest
	}{
		{name: "empty title", request: eventtype.CreateRequest{Description: "Описание", DurationMinutes: 30}},
		{name: "long title", request: eventtype.CreateRequest{Title: strings.Repeat("я", 101), Description: "Описание", DurationMinutes: 30}},
		{name: "empty description", request: eventtype.CreateRequest{Title: "Тип", DurationMinutes: 30}},
		{name: "long description", request: eventtype.CreateRequest{Title: "Тип", Description: strings.Repeat("я", 2001), DurationMinutes: 30}},
		{name: "invalid duration", request: eventtype.CreateRequest{Title: "Тип", Description: "Описание", DurationMinutes: 20}},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := service.Create(test.request)
			applicationError, ok := apperror.As(err)
			if !ok || applicationError.Code != apperror.CodeInvalidRequest {
				t.Fatalf("Create() error = %v, want INVALID_REQUEST", err)
			}
		})
	}
}

func TestListReturnsEmptyArrayReadySlice(t *testing.T) {
	service := eventtype.NewService(repository.NewMemory(), &platform.SequentialIDGenerator{})
	values := service.List()
	if values == nil || len(values) != 0 {
		t.Fatalf("List() = %#v, want non-nil empty slice", values)
	}
}
