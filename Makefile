#!make

.SILENT: 
include .env

DB_URI := "postgres://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"

create-migration:
	migrate create -ext sql -dir "${CURDIR}/migrations" -seq "${name}"

migrate:
	migrate -database "${DB_URI}" -path "${CURDIR}/migrations" up

down-migration:
	migrate -database "${DB_URI}" -path "${CURDIR}/migrations" down

rollback:
	migrate -database "${DB_URI}" -path "${CURDIR}/migrations" down 1

