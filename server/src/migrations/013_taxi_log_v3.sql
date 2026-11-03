-- TaxiLog V3: separate driving sources. Additive only.
-- Historical GROSS_INCOME, own_bookings, other_income, bonus, charging and salary stay unchanged.
-- New columns remain NULL for days without a VERSION=3 source split.

ALTER TABLE taxi_work_days ADD COLUMN hand_up TEXT;
ALTER TABLE taxi_work_days ADD COLUMN uber_income TEXT;
ALTER TABLE taxi_work_days ADD COLUMN bolt_income TEXT;
