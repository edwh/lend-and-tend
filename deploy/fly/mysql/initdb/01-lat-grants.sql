-- Runs once, on a fresh data volume, after Percona's entrypoint has created
-- the `lat` database and the `lat`@`%` user (from MYSQL_DATABASE / MYSQL_USER).
--
-- The Laravel batch container's entrypoint runs
--   CREATE DATABASE IF NOT EXISTS <DB_DATABASE>_test
-- on startup (it provisions a test database alongside the main one). Percona
-- only grants the MYSQL_USER access to MYSQL_DATABASE, so without this the
-- batch release_command dies with "Access denied for user 'lat'@'%' to
-- database 'lat_test'". Pre-create it and grant `lat` access.
CREATE DATABASE IF NOT EXISTS lat_test;
GRANT ALL PRIVILEGES ON lat_test.* TO 'lat'@'%';
FLUSH PRIVILEGES;
