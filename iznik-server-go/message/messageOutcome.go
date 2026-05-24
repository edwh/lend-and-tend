package message

import (
	"encoding/json"
	"time"
)

func (MessageOutcome) TableName() string {
	return "messages_outcomes"
}

func (MessagePromise) TableName() string {
	return "messages_promises"
}

type MessageOutcome struct {
	ID        uint64    `json:"id" gorm:"primary_key"`
	Msgid     uint64    `json:"msgid"`
	Timestamp time.Time `json:"timestamp"`
	Outcome   string    `json:"outcome"`
}

type MessagePromise struct {
	ID          uint64          `json:"id" gorm:"primary_key"`
	Msgid       uint64          `json:"msgid"`
	Userid      uint64          `json:"userid"`
	Promisedat  time.Time       `json:"promisedat"`
	Terms       json.RawMessage `json:"terms" gorm:"type:json"`
	Acceptedat  *time.Time      `json:"acceptedat"`
	Acceptedby  *uint64         `json:"acceptedby"`
}
