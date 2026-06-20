package main

import "testing"

func TestRequiredEnv(t *testing.T) {
	t.Run("returns trimmed value", func(t *testing.T) {
		t.Setenv("TEST_REQUIRED_ENV", " value ")

		value, err := requiredEnv("TEST_REQUIRED_ENV")

		if err != nil {
			t.Fatalf("requiredEnv() error = %v", err)
		}
		if value != "value" {
			t.Fatalf("requiredEnv() = %q, want %q", value, "value")
		}
	})

	t.Run("rejects empty value", func(t *testing.T) {
		t.Setenv("TEST_REQUIRED_ENV", "   ")

		if _, err := requiredEnv("TEST_REQUIRED_ENV"); err == nil {
			t.Fatal("requiredEnv() error = nil, want an error")
		}
	})
}
