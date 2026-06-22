package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"strings"
	"time"

	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/apperror"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/availability"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/booking"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/eventtype"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/owner"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/platform"
)

const maxRequestBodyBytes = 64 * 1024

type API struct {
	owner        *owner.Service
	eventTypes   *eventtype.Service
	availability *availability.Service
	bookings     *booking.Service
}

func New(
	ownerService *owner.Service,
	eventTypeService *eventtype.Service,
	availabilityService *availability.Service,
	bookingService *booking.Service,
) *API {
	return &API{
		owner: ownerService, eventTypes: eventTypeService,
		availability: availabilityService, bookings: bookingService,
	}
}

func (api *API) Handler(logger *slog.Logger, allowedOrigins []string, ids platform.IDGenerator) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", api.getHealth)
	mux.HandleFunc("GET /owner", api.getOwner)
	mux.HandleFunc("GET /event-types", api.listEventTypes)
	mux.HandleFunc("GET /event-types/{eventTypeId}/slots", api.listSlots)
	mux.HandleFunc("POST /bookings", api.createBooking)
	mux.HandleFunc("GET /admin/event-types", api.listEventTypes)
	mux.HandleFunc("POST /admin/event-types", api.createEventType)
	mux.HandleFunc("GET /admin/bookings/upcoming", api.listUpcomingBookings)

	return requestID(ids, requestLogger(logger, recoverPanic(logger, cors(allowedOrigins, mux))))
}

func (api *API) getHealth(writer http.ResponseWriter, _ *http.Request) {
	writeJSON(writer, http.StatusOK, healthResponse{Status: "ok"})
}

func (api *API) getOwner(writer http.ResponseWriter, _ *http.Request) {
	writeJSON(writer, http.StatusOK, api.owner.Get())
}

func (api *API) listEventTypes(writer http.ResponseWriter, _ *http.Request) {
	writeJSON(writer, http.StatusOK, api.eventTypes.List())
}

func (api *API) createEventType(writer http.ResponseWriter, request *http.Request) {
	var input eventtype.CreateRequest
	if err := decodeJSON(writer, request, &input); err != nil {
		writeError(writer, apperror.New(apperror.CodeInvalidRequest, err.Error()))
		return
	}

	value, err := api.eventTypes.Create(input)
	if err != nil {
		writeError(writer, err)
		return
	}
	writeJSON(writer, http.StatusCreated, value)
}

func (api *API) listSlots(writer http.ResponseWriter, request *http.Request) {
	values, err := api.availability.List(request.PathValue("eventTypeId"))
	if err != nil {
		writeError(writer, err)
		return
	}
	writeJSON(writer, http.StatusOK, values)
}

func (api *API) createBooking(writer http.ResponseWriter, request *http.Request) {
	var input booking.CreateRequest
	if err := decodeJSON(writer, request, &input); err != nil {
		writeError(writer, apperror.New(apperror.CodeInvalidRequest, err.Error()))
		return
	}

	value, err := api.bookings.Create(input)
	if err != nil {
		writeError(writer, err)
		return
	}
	writeJSON(writer, http.StatusCreated, value)
}

func (api *API) listUpcomingBookings(writer http.ResponseWriter, _ *http.Request) {
	writeJSON(writer, http.StatusOK, api.bookings.Upcoming())
}

type errorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type healthResponse struct {
	Status string `json:"status"`
}

func writeError(writer http.ResponseWriter, err error) {
	applicationError, ok := apperror.As(err)
	if !ok {
		writeJSON(writer, http.StatusInternalServerError, errorResponse{
			Code: apperror.CodeInternal, Message: "Внутренняя ошибка сервера.",
		})
		return
	}

	status := http.StatusBadRequest
	switch applicationError.Code {
	case apperror.CodeEventTypeNotFound:
		status = http.StatusNotFound
	case apperror.CodeBookingConflict:
		status = http.StatusConflict
	}
	writeJSON(writer, status, errorResponse{Code: applicationError.Code, Message: applicationError.Message})
}

func writeJSON(writer http.ResponseWriter, status int, value any) {
	writer.Header().Set("Content-Type", "application/json; charset=utf-8")
	writer.WriteHeader(status)
	if err := json.NewEncoder(writer).Encode(value); err != nil {
		panic(err)
	}
}

func decodeJSON(writer http.ResponseWriter, request *http.Request, target any) error {
	mediaType, _, err := mime.ParseMediaType(request.Header.Get("Content-Type"))
	if err != nil || mediaType != "application/json" {
		return errors.New("Content-Type должен быть application/json.")
	}

	request.Body = http.MaxBytesReader(writer, request.Body, maxRequestBodyBytes)
	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(target); err != nil {
		var maxBytesError *http.MaxBytesError
		if errors.As(err, &maxBytesError) {
			return errors.New("Тело запроса не должно превышать 64 KiB.")
		}
		return errors.New("Тело запроса должно содержать корректный JSON-объект без неизвестных полей.")
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("После JSON-объекта не должно быть дополнительных значений.")
	}
	return nil
}

type responseRecorder struct {
	http.ResponseWriter
	status int
}

func (recorder *responseRecorder) WriteHeader(status int) {
	if recorder.status == 0 {
		recorder.status = status
	}
	recorder.ResponseWriter.WriteHeader(status)
}

func (recorder *responseRecorder) Write(value []byte) (int, error) {
	if recorder.status == 0 {
		recorder.status = http.StatusOK
	}
	return recorder.ResponseWriter.Write(value)
}

func requestLogger(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		startedAt := time.Now()
		recorder := &responseRecorder{ResponseWriter: writer}
		next.ServeHTTP(recorder, request)
		status := recorder.status
		if status == 0 {
			status = http.StatusOK
		}
		logger.Info("http request",
			"request_id", writer.Header().Get("X-Request-ID"),
			"method", request.Method,
			"path", request.URL.Path,
			"status", status,
			"duration_ms", time.Since(startedAt).Milliseconds(),
		)
	})
}

func recoverPanic(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				logger.Error("panic recovered", "request_id", writer.Header().Get("X-Request-ID"), "error", recovered)
				writeJSON(writer, http.StatusInternalServerError, errorResponse{
					Code: apperror.CodeInternal, Message: "Внутренняя ошибка сервера.",
				})
			}
		}()
		next.ServeHTTP(writer, request)
	})
}

func requestID(ids platform.IDGenerator, next http.Handler) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		id, err := ids.New()
		if err != nil {
			id = "unavailable"
		}
		writer.Header().Set("X-Request-ID", id)
		next.ServeHTTP(writer, request)
	})
}

func cors(origins []string, next http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(origins))
	for _, origin := range origins {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			allowed[origin] = struct{}{}
		}
	}

	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		origin := request.Header.Get("Origin")
		_, isAllowed := allowed[origin]
		if origin != "" {
			writer.Header().Add("Vary", "Origin")
		}
		if isAllowed {
			writer.Header().Set("Access-Control-Allow-Origin", origin)
			writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			writer.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, X-Request-ID")
		}

		if request.Method == http.MethodOptions {
			if !isAllowed {
				writeJSON(writer, http.StatusForbidden, errorResponse{Code: apperror.CodeInvalidRequest, Message: "Origin не разрешён."})
				return
			}
			writer.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(writer, request)
	})
}
