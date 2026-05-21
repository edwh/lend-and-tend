package database

import (
	"time"
)

// LATUser is the Lend & Tend user account.
// Kept separate from Freegle's User model so upstream merges don't conflict.
type LATUser struct {
	ID            uint64    `json:"id" gorm:"primaryKey;autoIncrement"`
	Email         string    `json:"email" gorm:"uniqueIndex;not null"`
	PasswordHash  string    `json:"-" gorm:"not null"`
	DisplayName   string    `json:"displayName"`
	PhotoURL      *string   `json:"photoUrl"`
	About         *string   `json:"about"`
	Postcode      *string   `json:"postcode"`
	Lat           *float64  `json:"lat"`
	Lng           *float64  `json:"lng"`
	LatBlurred    *float64  `json:"latBlurred" gorm:"-"` // computed, not stored
	LngBlurred    *float64  `json:"lngBlurred" gorm:"-"`
	TravelRadius  int       `json:"travelRadius" gorm:"default:5"` // km
	Role          string    `json:"role" gorm:"default:'both'"`    // lender | tender | both
	PaymentStatus string    `json:"paymentStatus" gorm:"default:'unpaid'"` // unpaid | paid | concession
	IsAdmin       bool      `json:"isAdmin" gorm:"default:false"`
	Active        bool      `json:"active" gorm:"default:true"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
	LastActiveAt  time.Time `json:"lastActiveAt"`
}

func (LATUser) TableName() string { return "lat_users" }

// LATSession holds server-side sessions (avoids JWT secret management).
type LATSession struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	UserID    uint64    `json:"userId" gorm:"index;not null"`
	CreatedAt time.Time `json:"createdAt"`
	ExpiresAt time.Time `json:"expiresAt" gorm:"index"`
}

func (LATSession) TableName() string { return "lat_sessions" }

// LATLenderProfile holds garden-specific info for users with the lender role.
type LATLenderProfile struct {
	UserID        uint64  `json:"userId" gorm:"primaryKey"`
	GardenSize    *string `json:"gardenSize"`    // small | medium | large
	SunExposure   *string `json:"sunExposure"`   // full_sun | partial_shade | full_shade
	WaterAccess   bool    `json:"waterAccess" gorm:"default:false"`
	AccessRoute   *string `json:"accessRoute"`   // through_house | side_gate | own_gate | other
	ArrangementType *string `json:"arrangementType"` // exchange_tasks | goodwill | flexible
	TasksWanted   *string `json:"tasksWanted"`   // free text
	Restrictions  *string `json:"restrictions"`  // free text
	ToolsAvailable *string `json:"toolsAvailable"` // free text
	Description   *string `json:"description"`   // free text about the garden
}

func (LATLenderProfile) TableName() string { return "lat_lender_profiles" }

// LATTenderProfile holds gardening preferences for users with the tender role.
type LATTenderProfile struct {
	UserID             uint64  `json:"userId" gorm:"primaryKey"`
	GrowingInterests   *string `json:"growingInterests"`   // JSON array: veg, flowers, herbs, etc.
	CommercialIntent   bool    `json:"commercialIntent" gorm:"default:false"`
	ToolsAvailable     *string `json:"toolsAvailable"`
	AvailableDays      *string `json:"availableDays"`      // JSON array of days
	OffenderDeclaration bool   `json:"offenderDeclaration" gorm:"default:false"`
	Description        *string `json:"description"`
}

func (LATTenderProfile) TableName() string { return "lat_tender_profiles" }

// LATMessage is a private message between two users.
type LATMessage struct {
	ID          uint64    `json:"id" gorm:"primaryKey;autoIncrement"`
	SenderID    uint64    `json:"senderId" gorm:"index;not null"`
	RecipientID uint64    `json:"recipientId" gorm:"index;not null"`
	Content     string    `json:"content" gorm:"not null"`
	Flagged     bool      `json:"flagged" gorm:"default:false;index"`
	Reviewed    bool      `json:"reviewed" gorm:"default:false"`
	Deleted     bool      `json:"deleted" gorm:"default:false"`
	CreatedAt   time.Time `json:"createdAt"`
}

func (LATMessage) TableName() string { return "lat_messages" }

// LATAgreement is a garden sharing agreement between a lender and tender.
type LATAgreement struct {
	ID                uint64     `json:"id" gorm:"primaryKey;autoIncrement"`
	LenderID          uint64     `json:"lenderId" gorm:"index;not null"`
	TenderID          uint64     `json:"tenderId" gorm:"index;not null"`
	Status            string     `json:"status" gorm:"default:'draft'"` // draft | lender_agreed | tender_agreed | complete | terminated
	GardenAddress     *string    `json:"gardenAddress"`
	GardeningHours    *string    `json:"gardeningHours"`
	GrowingPurpose    *string    `json:"growingPurpose"`
	MaxPeople         *int       `json:"maxPeople"`
	ExchangeTerms     *string    `json:"exchangeTerms"`
	EndDate           *time.Time `json:"endDate"`
	NoticePeriodMonths int       `json:"noticePeriodMonths" gorm:"default:1"`
	AllowAnimals      bool       `json:"allowAnimals" gorm:"default:false"`
	AllowCommercial   bool       `json:"allowCommercial" gorm:"default:false"`
	AdditionalTerms   *string    `json:"additionalTerms"`
	LenderAgreedAt    *time.Time `json:"lenderAgreedAt"`
	TenderAgreedAt    *time.Time `json:"tenderAgreedAt"`
	CreatedAt         time.Time  `json:"createdAt"`
	UpdatedAt         time.Time  `json:"updatedAt"`
}

func (LATAgreement) TableName() string { return "lat_agreements" }

// LATCheckin is a scheduled wellness check for an active agreement.
type LATCheckin struct {
	ID             uint64     `json:"id" gorm:"primaryKey;autoIncrement"`
	AgreementID    uint64     `json:"agreementId" gorm:"index;not null"`
	ScheduledAt    time.Time  `json:"scheduledAt" gorm:"index"`
	SentAt         *time.Time `json:"sentAt"`
	LenderStatus   *string    `json:"lenderStatus"`  // growing | ok | not_working
	TenderStatus   *string    `json:"tenderStatus"`
	NeedsMediation bool       `json:"needsMediation" gorm:"default:false"`
}

func (LATCheckin) TableName() string { return "lat_checkins" }

// LATNotification is an in-app notification for a user.
type LATNotification struct {
	ID        uint64    `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID    uint64    `json:"userId" gorm:"index;not null"`
	Type      string    `json:"type"` // new_match | new_message | checkin | activity_alert
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	Link      *string   `json:"link"`
	Read      bool      `json:"read" gorm:"default:false;index"`
	CreatedAt time.Time `json:"createdAt"`
}

func (LATNotification) TableName() string { return "lat_notifications" }

// LATBlockedUser records a block relationship between two users.
type LATBlockedUser struct {
	BlockerID uint64    `json:"blockerId" gorm:"primaryKey"`
	BlockedID uint64    `json:"blockedId" gorm:"primaryKey"`
	CreatedAt time.Time `json:"createdAt"`
}

func (LATBlockedUser) TableName() string { return "lat_blocked_users" }

// LATWordFilter holds blocked-word patterns for message scanning.
type LATWordFilter struct {
	ID      uint64 `json:"id" gorm:"primaryKey;autoIncrement"`
	Pattern string `json:"pattern" gorm:"uniqueIndex;not null"` // regex or plain word
	Action  string `json:"action" gorm:"default:'flag'"`        // flag | block
}

func (LATWordFilter) TableName() string { return "lat_word_filters" }

// LATAdminImpersonation audit trail for admin impersonating a user.
type LATAdminImpersonation struct {
	ID          uint64    `json:"id" gorm:"primaryKey;autoIncrement"`
	AdminID     uint64    `json:"adminId" gorm:"index;not null"`
	TargetID    uint64    `json:"targetId" gorm:"index;not null"`
	Reason      *string   `json:"reason"`
	CreatedAt   time.Time `json:"createdAt"`
}

func (LATAdminImpersonation) TableName() string { return "lat_admin_impersonations" }

// AutoMigrateLendAndTend runs GORM AutoMigrate for all L&T tables.
// Safe to call on every startup — only creates/updates, never drops.
func AutoMigrateLendAndTend() {
	err := DBConn.AutoMigrate(
		&LATUser{},
		&LATSession{},
		&LATLenderProfile{},
		&LATTenderProfile{},
		&LATMessage{},
		&LATAgreement{},
		&LATCheckin{},
		&LATNotification{},
		&LATBlockedUser{},
		&LATWordFilter{},
		&LATAdminImpersonation{},
	)
	if err != nil {
		panic("AutoMigrateLendAndTend failed: " + err.Error())
	}
}
