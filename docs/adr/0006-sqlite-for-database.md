# ADR-0006: SQLite for Database

## Status

Accepted

## Context

ต้องการ Database ที่ง่ายที่สุด ไม่ต้องตั้งค่า ไม่ต้องแยก Server

## Decision

ใช้ SQLite (better-sqlite3) เป็น Database

## Consequences

- ไม่ต้องตั้งค่า Database Server
- ไฟล์เดียว ง่ายต่อการสำรอง
- เหมาะสำหรับ MVP
- รองรับ Concurrent ได้พอ
