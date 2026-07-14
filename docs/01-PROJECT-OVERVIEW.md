# Project Overview

## Problem
A repair company wants a chatbot on their website that can:
1. Ask the customer what device/model they have.
2. Ask what's wrong / what part needs repair or replacement.
3. Look up the real cost from the company's MongoDB pricing data.
4. Quote the cost conversationally, and offer next steps (book a slot,
   connect to human, etc. — later phase).

## Users
- End customers (public-facing chat widget)
- Admin/staff (later phase — manage device/part/price data)

## Success criteria
- Bot never hallucinates a price.
- Bot asks at most 2-3 clarifying questions before quoting.
- Response time under ~3s per turn.
- Works with an empty/unmatched query gracefully (says "let me connect you
  to a technician" instead of breaking).