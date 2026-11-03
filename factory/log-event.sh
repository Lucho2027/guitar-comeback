#!/usr/bin/env bash
# Appends one event to factory/activity.jsonl, which the dashboard's Activity page and agent status read.
# Usage: factory/log-event.sh <job-id> <start|done|stage|human> <agent or -> <text…>
set -euo pipefail
[[ $# -ge 4 ]] || { echo "usage: $0 <job-id> <start|done|stage|human> <agent|-> <text>" >&2; exit 2; }
job=$1 kind=$2 agent=$3
shift 3
case $kind in start | done | stage | human) ;; *) echo "unknown kind: $kind" >&2; exit 2 ;; esac
jq -nc --arg at "$(date -u +%FT%TZ)" --arg job "$job" --arg kind "$kind" --arg agent "$agent" --arg text "$*" \
  '{at: $at, job: $job, kind: $kind} + (if $agent == "-" then {} else {agent: $agent} end) + {text: $text}' \
  >>"$(dirname "$0")/activity.jsonl"
