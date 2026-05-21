package database

import (
	"fmt"
	"os"
	"time"

	"github.com/glebarez/sqlite"
	sentrylogpackage "github.com/freegle/iznik-server-go/sentrylog"
	sqlmysgo "github.com/rocketlaunchr/mysql-go"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	DBConn *gorm.DB
	// Pool is nil when DATABASE_TYPE=sqlite; only newsfeed/job use it (not
	// needed for Lend & Tend MVP).  We keep the variable for upstream merge
	// compatibility.
	Pool *sqlmysgo.DB
)

func InitDatabase() {
	if os.Getenv("DATABASE_TYPE") == "sqlite" {
		initSQLite()
	} else {
		initMySQL()
	}
}

func initSQLite() {
	path := os.Getenv("SQLITE_PATH")
	if path == "" {
		path = "/data/lendandtend.db"
	}
	fmt.Println("Opening SQLite database at", path)

	newLogger := sentrylogpackage.New(
		sentrylogpackage.Config(logger.Config{
			SlowThreshold:             time.Second * 5,
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true,
		}),
	)

	var err error
	DBConn, err = gorm.Open(sqlite.Open(path), &gorm.Config{
		Logger: newLogger,
	})
	if err != nil {
		panic("failed to open SQLite database: " + err.Error())
	}

	// SQLite doesn't benefit from many connections; single writer prevents
	// SQLITE_BUSY errors.
	sqlDB, err := DBConn.DB()
	if err != nil {
		panic("failed to get underlying sql.DB: " + err.Error())
	}
	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)

	Pool = nil // Not used for SQLite.

	AutoMigrateLendAndTend()
}

func initMySQL() {
	var err error
	var err2 error

	fmt.Println("Connecting to database", os.Getenv("MYSQL_HOST"), os.Getenv("MYSQL_PORT"), os.Getenv("MYSQL_DBNAME"), os.Getenv("MYSQL_USER"), os.Getenv("MYSQL_PROTOCOL"))

	mysqlCredentials := fmt.Sprintf(
		"%s:%s@%s(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local&interpolateParams=true",
		os.Getenv("MYSQL_USER"),
		os.Getenv("MYSQL_PASSWORD"),
		os.Getenv("MYSQL_PROTOCOL"),
		os.Getenv("MYSQL_HOST"),
		os.Getenv("MYSQL_PORT"),
		os.Getenv("MYSQL_DBNAME"),
	)

	newLogger := sentrylogpackage.New(
		sentrylogpackage.Config(logger.Config{
			SlowThreshold:             time.Second * 30,
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true,
		}),
	)

	DBConn, err = gorm.Open(mysql.Open(mysqlCredentials), &gorm.Config{
		Logger: newLogger,
	})

	// rocketlaunchr/mysql-go allows genuine cancellation of MySQL queries.
	Pool, err2 = sqlmysgo.Open(mysqlCredentials)

	if err != nil || err2 != nil {
		panic("failed to connect database")
	}

	dbConfig, err3 := DBConn.DB()
	if err3 != nil {
		panic("failed to get database config: " + err3.Error())
	}
	dbConfig.SetMaxOpenConns(200)
	dbConfig.SetMaxIdleConns(200)
	dbConfig.SetConnMaxLifetime(time.Hour)
}
