package apperror

import "errors"

const (
	CodeInvalidRequest    = "INVALID_REQUEST"
	CodeInvalidSlot       = "INVALID_SLOT"
	CodeEventTypeNotFound = "EVENT_TYPE_NOT_FOUND"
	CodeBookingConflict   = "BOOKING_CONFLICT"
	CodeInternal          = "INTERNAL_ERROR"
)

type Error struct {
	Code    string
	Message string
	Cause   error
}

func (err *Error) Error() string {
	return err.Message
}

func (err *Error) Unwrap() error {
	return err.Cause
}

func New(code, message string) *Error {
	return &Error{Code: code, Message: message}
}

func Wrap(code, message string, cause error) *Error {
	return &Error{Code: code, Message: message, Cause: cause}
}

func As(err error) (*Error, bool) {
	var target *Error
	ok := errors.As(err, &target)
	return target, ok
}
