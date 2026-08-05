#!/bin/bash
curl -X POST http://localhost:3000/api/requirements \
  -H "Content-Type: application/json" \
  -H "X-EOS-Product-Id: lawyershub" \
  -H "Cookie: eos-workspace-session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ3b3Jrc3BhY2VJZCI6InByb2Zlc3Npb25hbC13b3Jrc3BhY2UuZGVmYXVsdCIsInRlbmFudElkIjoidGVuYW50LmRlZmF1bHQiLCJhY3RvcklkIjoib3BlcmF0b3Iud2ViIiwiaXNzdWVkQXQiOiIyMDI2LTA4LTA1VDAzOjM5OjQ4LjIzNloifQ.placeholder" \
  -d '{
    "title": "Test requirement for LawyersHub product",
    "description": "Ini adalah test untuk membuktikan LawyersHub bisa berjalan melalui shared apps/web endpoint",
    "priority": "high"
  }'
