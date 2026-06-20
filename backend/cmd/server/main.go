package main

import (
	"context"
	"errors"
	"fmt"
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

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	httpAddress, err := requiredEnv("HTTP_ADDR")
	if err != nil {
		logger.Error("configuration failed", "error", err)
		os.Exit(1)
	}
	corsAllowedOrigins, err := requiredEnv("CORS_ALLOWED_ORIGINS")
	if err != nil {
		logger.Error("configuration failed", "error", err)
		os.Exit(1)
	}

	clock := platform.SystemClock{}
	ids := platform.UUIDGenerator{}
	store := repository.NewMemory()

	eventTypeService := eventtype.NewService(store, ids)
	availabilityService := availability.NewService(store, eventTypeService, clock)
	bookingService := booking.NewService(store, eventTypeService, availabilityService, clock, ids)
	ownerService := owner.NewService(owner.Owner{ID: "owner-1", Name: "Владелец календаря"})
	api := httpapi.New(ownerService, eventTypeService, availabilityService, bookingService)

	server := &http.Server{
		Addr:              httpAddress,
		Handler:           api.Handler(logger, allowedOrigins(corsAllowedOrigins), ids),
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

func requiredEnv(name string) (string, error) {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return "", fmt.Errorf("environment variable %s is required", name)
	}
	return value, nil
}

func allowedOrigins(value string) []string {
	return strings.Split(value, ",")
}
