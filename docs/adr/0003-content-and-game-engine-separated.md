# ADR-0003: Content and Game Engine are separated

## Status

Accepted

## Context

ระบบต้องสามารถสร้างเกมวิชาอื่นได้โดยไม่ต้องเขียนระบบใหม่

## Decision

แยก Content (คำถาม, Mission, Boss) จาก Game Engine (ตรรกะเกม)

## Consequences

- สร้างเกมใหม่ได้โดยเปลี่ยนแค่ Content
- Game Engine ใช้ซ้ำได้
- ง่ายต่อการขยายระบบ
