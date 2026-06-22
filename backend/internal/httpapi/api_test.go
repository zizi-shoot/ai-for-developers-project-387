package httpapi_test

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/availability"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/booking"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/eventtype"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/httpapi"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/owner"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/platform"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/repository"
)

func TestReadEndpointsReturnContractShapes(t *testing.T) {
	handler := newHandler()

	ownerResponse := performRequest(handler, http.MethodGet, "/owner", "", nil)
	if ownerResponse.Code != http.StatusOK || ownerResponse.Header().Get("Content-Type") != "application/json; charset=utf-8" {
		t.Fatalf("GET /owner status=%d content-type=%q", ownerResponse.Code, ownerResponse.Header().Get("Content-Type"))
	}
	var ownerValue owner.Owner
	decodeResponse(t, ownerResponse, &ownerValue)
	if ownerValue.ID != "owner-1" || ownerValue.Name != "Владелец календаря" {
		t.Fatalf("owner = %#v", ownerValue)
	}

	for _, path := range []string{"/event-types", "/admin/event-types", "/admin/bookings/upcoming"} {
		response := performRequest(handler, http.MethodGet, path, "", nil)
		if response.Code != http.StatusOK || strings.TrimSpace(response.Body.String()) != "[]" {
			t.Fatalf("GET %s status=%d body=%q", path, response.Code, response.Body.String())
		}
	}
}

func TestHealthEndpoint(t *testing.T) {
	response := performRequest(newHandler(), http.MethodGet, "/healthz", "", nil)

	if response.Code != http.StatusOK || response.Header().Get("Content-Type") != "application/json; charset=utf-8" {
		t.Fatalf("GET /healthz status=%d content-type=%q", response.Code, response.Header().Get("Content-Type"))
	}
	var value struct {
		Status string `json:"status"`
	}
	decodeResponse(t, response, &value)
	if value.Status != "ok" {
		t.Fatalf("health response = %#v", value)
	}
}

func TestCreateEventTypeAndListSlots(t *testing.T) {
	handler := newHandler()
	body := `{"title":"  Консультация  ","description":"  Обсуждение задачи  ","durationMinutes":30}`
	response := performRequest(handler, http.MethodPost, "/admin/event-types", body, jsonHeaders())
	if response.Code != http.StatusCreated {
		t.Fatalf("POST event type status=%d body=%s", response.Code, response.Body.String())
	}
	var value eventtype.EventType
	decodeResponse(t, response, &value)
	if value.Title != "Консультация" || value.Description != "Обсуждение задачи" || value.ID == "" {
		t.Fatalf("event type = %#v", value)
	}

	response = performRequest(handler, http.MethodGet, "/event-types/"+value.ID+"/slots", "", nil)
	if response.Code != http.StatusOK {
		t.Fatalf("GET slots status=%d body=%s", response.Code, response.Body.String())
	}
	var slots []availability.Slot
	decodeResponse(t, response, &slots)
	if len(slots) == 0 || slots[0].StartsAt.Format(time.RFC3339) != "2026-06-19T09:00:00Z" {
		t.Fatalf("slots = %#v", slots)
	}
}

func TestCreateBookingErrorsAndConflict(t *testing.T) {
	handler := newHandler()
	createResponse := performRequest(handler, http.MethodPost, "/admin/event-types", `{"title":"Встреча","description":"Описание","durationMinutes":30}`, jsonHeaders())
	var eventType eventtype.EventType
	decodeResponse(t, createResponse, &eventType)

	missingResponse := performRequest(handler, http.MethodPost, "/bookings", bookingJSON("missing", "2026-06-19T09:00:00Z"), jsonHeaders())
	assertAPIError(t, missingResponse, http.StatusNotFound, "EVENT_TYPE_NOT_FOUND")

	first := performRequest(handler, http.MethodPost, "/bookings", bookingJSON(eventType.ID, "2026-06-19T09:00:00Z"), jsonHeaders())
	if first.Code != http.StatusCreated {
		t.Fatalf("first booking status=%d body=%s", first.Code, first.Body.String())
	}
	var created booking.Booking
	decodeResponse(t, first, &created)
	if created.DurationMinutes != 0 || created.GuestName != "Анна" {
		t.Fatalf("booking response = %#v", created)
	}

	conflict := performRequest(handler, http.MethodPost, "/bookings", bookingJSON(eventType.ID, "2026-06-19T09:15:00Z"), jsonHeaders())
	assertAPIError(t, conflict, http.StatusConflict, "BOOKING_CONFLICT")
}

func TestStrictJSONValidation(t *testing.T) {
	handler := newHandler()
	tests := []struct {
		name        string
		body        string
		contentType string
	}{
		{name: "unknown field", body: `{"title":"Тип","description":"Описание","durationMinutes":30,"extra":true}`, contentType: "application/json"},
		{name: "trailing value", body: `{"title":"Тип","description":"Описание","durationMinutes":30} {}`, contentType: "application/json"},
		{name: "malformed", body: `{`, contentType: "application/json"},
		{name: "wrong content type", body: `{}`, contentType: "text/plain"},
		{name: "too large", body: `{"title":"` + strings.Repeat("x", 70*1024) + `","description":"Описание","durationMinutes":30}`, contentType: "application/json"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			headers := http.Header{"Content-Type": []string{test.contentType}}
			response := performRequest(handler, http.MethodPost, "/admin/event-types", test.body, headers)
			assertAPIError(t, response, http.StatusBadRequest, "INVALID_REQUEST")
		})
	}
}

func TestCORSPreflight(t *testing.T) {
	handler := newHandler()

	allowed := performRequest(handler, http.MethodOptions, "/bookings", "", http.Header{"Origin": []string{"http://localhost:5173"}})
	if allowed.Code != http.StatusNoContent || allowed.Header().Get("Access-Control-Allow-Origin") != "http://localhost:5173" {
		t.Fatalf("allowed preflight status=%d headers=%v", allowed.Code, allowed.Header())
	}

	denied := performRequest(handler, http.MethodOptions, "/bookings", "", http.Header{"Origin": []string{"https://example.com"}})
	assertAPIError(t, denied, http.StatusForbidden, "INVALID_REQUEST")
}

func newHandler() http.Handler {
	clock := platform.FixedClock{Time: time.Date(2026, 6, 19, 8, 0, 0, 0, time.UTC)}
	store := repository.NewMemory()
	ids := platform.UUIDGenerator{}
	eventTypes := eventtype.NewService(store, ids)
	availabilityService := availability.NewService(store, eventTypes, clock)
	bookingService := booking.NewService(store, eventTypes, availabilityService, clock, ids)
	ownerService := owner.NewService(owner.Owner{ID: "owner-1", Name: "Владелец календаря"})
	logger := slog.New(slog.NewJSONHandler(io.Discard, nil))
	return httpapi.New(ownerService, eventTypes, availabilityService, bookingService).Handler(
		logger, []string{"http://localhost:5173", "http://127.0.0.1:5173"}, ids,
	)
}

func performRequest(handler http.Handler, method, path, body string, headers http.Header) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	for name, values := range headers {
		for _, value := range values {
			request.Header.Add(name, value)
		}
	}
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	return response
}

func jsonHeaders() http.Header {
	return http.Header{"Content-Type": []string{"application/json"}}
}

func bookingJSON(eventTypeID, startsAt string) string {
	value, _ := json.Marshal(booking.CreateRequest{
		EventTypeID: eventTypeID, StartsAt: startsAt,
		GuestName: " Анна ", GuestEmail: "anna@example.com",
	})
	return string(value)
}

func decodeResponse(t *testing.T, response *httptest.ResponseRecorder, target any) {
	t.Helper()
	if err := json.Unmarshal(response.Body.Bytes(), target); err != nil {
		t.Fatalf("decode response %q: %v", response.Body.String(), err)
	}
}

func assertAPIError(t *testing.T, response *httptest.ResponseRecorder, status int, code string) {
	t.Helper()
	if response.Code != status {
		t.Fatalf("status=%d body=%s, want %d", response.Code, response.Body.String(), status)
	}
	var value struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	}
	decodeResponse(t, response, &value)
	if value.Code != code || value.Message == "" {
		t.Fatalf("error response = %#v", value)
	}
}
