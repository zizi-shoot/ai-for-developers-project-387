package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/availability"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/booking"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/eventtype"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/httpapi"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/owner"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/platform"
	"github.com/zizi-shoot/ai-for-developers-project-387/backend/internal/repository"
)

const (
	defaultHTTPAddress = "127.0.0.1:4010"
	defaultOrigins     = "http://127.0.0.1:5173,http://localhost:5173"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	clock := platform.SystemClock{}
	ids := platform.UUIDGenerator{}
	store := repository.NewMemory()

	eventTypeService := eventtype.NewService(store, ids)
	availabilityService := availability.NewService(store, eventTypeService, clock)
	bookingService := booking.NewService(store, eventTypeService, availabilityService, clock, ids)
	ownerService := owner.NewService(owner.Owner{ID: "owner-1", Name: "Владелец календаря"})
	api := httpapi.New(ownerService, eventTypeService, availabilityService, bookingService)

	server := &http.Server{
		Addr:              envOrDefault("HTTP_ADDR", defaultHTTPAddress),
		Handler:           api.Handler(logger, allowedOrigins(), ids),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	shutdownContext, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		<-shutdownContext.Done()
		context, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(context); err != nil {
			logger.Error("http server shutdown failed", "error", err)
		}
	}()

	logger.Info("http server started", "address", server.Addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("http server failed", "error", err)
		os.Exit(1)
	}
	logger.Info("http server stopped")
}

func envOrDefault(name, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(name)); value != "" {
		return value
	}
	return fallback
}

func allowedOrigins() []string {
	return strings.Split(envOrDefault("CORS_ALLOWED_ORIGINS", defaultOrigins), ",")
}
