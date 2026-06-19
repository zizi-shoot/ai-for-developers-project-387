package platform

import (
	"crypto/rand"
	"fmt"
)

type IDGenerator interface {
	New() (string, error)
}

type UUIDGenerator struct{}

func (UUIDGenerator) New() (string, error) {
	var value [16]byte
	if _, err := rand.Read(value[:]); err != nil {
		return "", fmt.Errorf("generate random identifier: %w", err)
	}

	value[6] = (value[6] & 0x0f) | 0x40
	value[8] = (value[8] & 0x3f) | 0x80

	return fmt.Sprintf(
		"%08x-%04x-%04x-%04x-%012x",
		value[0:4], value[4:6], value[6:8], value[8:10], value[10:16],
	), nil
}

type SequentialIDGenerator struct {
	Values []string
	next   int
}

func (generator *SequentialIDGenerator) New() (string, error) {
	if generator.next >= len(generator.Values) {
		return "", fmt.Errorf("no identifiers left")
	}

	value := generator.Values[generator.next]
	generator.next++
	return value, nil
}
